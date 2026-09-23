import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../component/Navbar";
import { getMatchNotifications, MATCH_EVENT, removeMatchNotification, syncSavedMatchNotifications } from "../data/matchNotifications";

const imageUrl = (value) => {
  if (!value) return null;
  return value.startsWith("http") ? value : `http://localhost:3000${value}`;
};

const sourceLocation = (item, type) => type === "lost" ? item.lost_location : item.found_location;
const candidateLocation = (item, type) => type === "lost" ? item.found_location : item.lost_location;

const ItemCard = ({ title, item, location, tone, score, visualScore = null }) => (
  <article className={`rounded-xl border border-slate-700 border-t-4 bg-slate-800 p-4 text-slate-100 shadow-sm ${tone}`}>
    <div className="flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
      <span>{title}</span>
      <span>{score ? `${Math.round(score)}% match` : "Your report"}</span>
    </div>
    {visualScore !== null && <p className="mt-2 rounded-md bg-emerald-500/15 px-2 py-1 text-xs font-bold text-emerald-300">AI visual similarity: {visualScore}%</p>}
    <div className="mt-3 grid h-24 place-items-center overflow-hidden rounded-lg bg-slate-900">
      {imageUrl(item.image_url)
        ? <img src={imageUrl(item.image_url)} alt={item.item_name} className="h-full w-full object-cover" />
        : <svg viewBox="0 0 24 24" className="h-11 w-11 text-slate-500" aria-hidden="true"><rect x="7" y="2" width="10" height="20" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M10 18h4" stroke="currentColor" strokeWidth="1.8" /></svg>}
    </div>
    <h2 className="mt-4 text-lg font-bold text-white">{item.item_name || "Unnamed item"}</h2>
    <p className="mt-1 text-xs text-slate-300">{item.category || "Uncategorized"}{item.item_color ? ` ? ${item.item_color}` : ""}</p>
    <p className="mt-3 text-xs leading-5 text-slate-300">{item.description || "No description provided."}</p>
    <p className="mt-3 border-t border-slate-700 pt-3 text-xs font-medium text-slate-200">{location || "Location not provided"}</p>
  </article>
);

function MatchNotificationPage() {
  const [notifications, setNotifications] = useState(() => getMatchNotifications());
  const [response, setResponse] = useState("");

  useEffect(() => {
    const refresh = () => setNotifications(getMatchNotifications());
    const sync = async () => {
      try {
        await syncSavedMatchNotifications();
      } finally {
        refresh();
      }
    };
    window.addEventListener(MATCH_EVENT, refresh);
    sync();
    return () => window.removeEventListener(MATCH_EVENT, refresh);
  }, []);

  const notification = notifications[0];

  const handleResponse = (message) => {
    removeMatchNotification(notification.id);
    setNotifications(getMatchNotifications());
    setResponse(message);
  };

  if (!notification) {
    return (
      <div className="app-page-with-navbar bg-slate-50">
        <Navbar />
        <main className="mx-auto max-w-4xl px-6 py-10">
          <header className="flex items-center justify-between border-b border-slate-200 pb-5"><h1 className="text-2xl font-bold text-slate-900">Item Matching</h1><Link to="/foundPage" className="text-sm font-medium text-teal-700 hover:underline">Back to reports</Link></header>
          <section className="mt-16 rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-teal-100 text-2xl text-teal-700">?</div><h2 className="mt-4 text-xl font-bold text-slate-900">You are all caught up</h2><p className="mt-2 text-sm text-slate-500">Potential matches will appear here after the system finds a 90% or higher similarity.</p><Link to="/foundPage" className="mt-6 inline-flex rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800">View reports</Link></section>
        </main>
      </div>
    );
  }

  const { source, match, type, createdAt } = notification;
  const score = Math.round(match.score || 0);
  const rawVisualScore = match.visual_score == null ? null : Number(match.visual_score);
  const visualScore = rawVisualScore !== null && Number.isFinite(rawVisualScore) ? Math.round(rawVisualScore) : null;

  return (
    <div className="app-page-with-navbar min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 py-8 sm:py-10">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5"><h1 className="text-2xl font-bold text-slate-900">Item Matching</h1><Link to="/foundPage" className="text-sm font-medium text-slate-500 hover:text-teal-700">? Back to My Reports</Link></header>
        <section className="mt-8 grid gap-5 rounded-2xl bg-teal-800 p-6 text-white shadow-lg sm:grid-cols-[1fr_auto] sm:p-8">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">? Match found</p><h2 className="mt-2 text-2xl font-bold leading-tight">We found a potential match for your lost item</h2><p className="mt-3 max-w-xl text-sm leading-6 text-teal-100">Our algorithm detected a strong similarity between your report and a recently found item. Review the comparison before confirming.</p><p className="mt-4 text-xs text-teal-200">Received {new Date(createdAt).toLocaleString()}</p></div>
          <div className="grid h-24 w-24 place-items-center rounded-full border-[6px] border-emerald-400 bg-teal-900 text-center shadow-inner"><strong className="text-2xl leading-none">{score}%</strong><span className="text-[10px] text-teal-100">Match score</span></div>
        </section>
        <section className="mt-8"><h2 className="text-lg font-bold text-slate-900">Compare the items</h2><p className="mt-1 text-sm text-slate-500">Verify these are the same item before claiming it.</p><div className="mt-5 grid gap-4 md:grid-cols-2"><ItemCard title="Your report" item={source} location={sourceLocation(source, type)} tone="border-t-rose-400" /><ItemCard title="Found item" item={match} location={candidateLocation(match, type)} score={score} visualScore={visualScore} tone="border-t-emerald-400" /></div></section>
        <section className="mx-auto mt-8 max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm"><h2 className="text-lg font-bold text-slate-900">Are these the same item?</h2><p className="mt-2 text-sm leading-6 text-slate-500">If you confirm, the system will contact you with the next steps for arranging pickup.</p><div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row"><button type="button" onClick={() => handleResponse("Match confirmed. The notification has been cleared.")} className="rounded-lg bg-teal-700 px-5 py-3 text-sm font-bold text-white hover:bg-teal-800">? This is mine!</button><button type="button" onClick={() => handleResponse("We will keep searching for another match.")} className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">? No, keep searching</button></div></section>
        {response && <p className="mt-5 text-center text-sm font-medium text-teal-700" role="status">{response}</p>}
      </main>
    </div>
  );
}

export default MatchNotificationPage;
