const STORAGE_KEY = "foundlost-match-notifications";
const DISMISSED_KEY = "foundlost-dismissed-match-notifications";
const MATCH_EVENT = "foundlost-match-notifications-changed";

const canUseStorage = () => typeof window !== "undefined" && Boolean(window.localStorage);

const readStoredNotifications = () => {
  if (!canUseStorage()) return [];
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
};

const readDismissedIds = () => {
  if (!canUseStorage()) return [];
  try {
    const stored = JSON.parse(window.localStorage.getItem(DISMISSED_KEY) || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
};

const notificationId = ({ source, match, type }) => `${type}-${source?.item_id}-${match?.item_id}`;

export const getMatchNotifications = () => readStoredNotifications().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

export const addMatchNotification = ({ source, match, type }) => {
  const id = notificationId({ source, match, type });
  if (!source?.item_id || !match?.item_id || !canUseStorage() || readDismissedIds().includes(id)) return null;

  const existing = readStoredNotifications();
  const entry = { id, source, match, type, createdAt: new Date().toISOString() };
  const next = [entry, ...existing.filter((notification) => notification.id !== id)];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(MATCH_EVENT));
  return entry;
};

export const syncSavedMatchNotifications = async () => {
  if (!canUseStorage()) return [];
  const response = await fetch("http://localhost:3000/matching/all");
  if (!response.ok) throw new Error("Unable to scan saved items");

  const payload = await response.json();
  const existing = readStoredNotifications();
  const knownIds = new Set(existing.map((notification) => notification.id));
  const dismissedIds = new Set(readDismissedIds());
  const incoming = (payload.matches || [])
    .filter((match) => match?.source?.item_id && match?.match?.item_id)
    .map((match) => ({ ...match, id: notificationId(match), createdAt: new Date().toISOString() }))
    .filter((match) => !knownIds.has(match.id) && !dismissedIds.has(match.id));

  if (incoming.length === 0) return existing;
  const next = [...incoming, ...existing];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(MATCH_EVENT));
  return next;
};

export const removeMatchNotification = (id) => {
  const next = readStoredNotifications().filter((notification) => notification.id !== id);
  if (canUseStorage()) {
    const dismissed = Array.from(new Set([id, ...readDismissedIds()])).slice(0, 250);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed));
    window.dispatchEvent(new Event(MATCH_EVENT));
  }
  return next;
};

export { MATCH_EVENT };
