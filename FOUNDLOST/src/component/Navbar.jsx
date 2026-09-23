import { useEffect } from "react";
import { NavLink } from "react-router-dom";
import { syncSavedMatchNotifications } from "../data/matchNotifications";
import "./Navbar.css";

const navigationItems = [
  { label: "Report lost item", to: "/lostItem", icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /><rect x="5" y="5" width="14" height="14" rx="1" /></svg> },
  { label: "Report found item", to: "/foundItem", icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /><rect x="5" y="5" width="14" height="14" rx="1" /></svg> },
  { label: "Found items", to: "/foundPage", icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-7 9 7v8a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg> },
  { label: "Lost items", to: "/lostPage", icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h8v16H6zM14 8h4v12h-4zM9 8h2M9 12h2M4 20h16" /></svg> },
  { label: "Match notifications", to: "/notifications", icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 10a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg> },
  { label: "Settings", to: "/foundPage", active: false, icon: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.1 2.1-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.55V20.3h-3v-.1A1.7 1.7 0 0 0 10.7 18.65a1.7 1.7 0 0 0-1.88.34l-.06.06-2.1-2.1.06-.06A1.7 1.7 0 0 0 7.06 15a1.7 1.7 0 0 0-1.55-1.03h-.1v-3h.1A1.7 1.7 0 0 0 7.06 9.94a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.1-2.1.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1.03-1.55v-.1h3v.1a1.7 1.7 0 0 0 1.03 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.1 2.1-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.55 1.03h.1v3h-.1A1.7 1.7 0 0 0 19.4 15Z" /></svg> },
];

function Navbar() {
  useEffect(() => {
    syncSavedMatchNotifications().catch(() => {});
  }, []);

  return (
    <aside className="app-navbar" aria-label="Main navigation">
      <NavLink className="app-navbar__brand" to="/foundPage" aria-label="KU Found and Lost">KU</NavLink>
      <nav className="app-navbar__menu">
        {navigationItems.map((item) => (
          <NavLink key={item.label} className={({ isActive }) => `app-navbar__link${isActive && item.active !== false ? " is-active" : ""}`} to={item.to} title={item.label} aria-label={item.label}>
            {item.icon}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Navbar;
