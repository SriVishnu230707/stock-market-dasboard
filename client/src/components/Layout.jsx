import React from "react";
import { LayoutDashboard, Star, Bell, Briefcase, Circle } from "lucide-react";
import { styles } from "../styles.js";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "watchlist", label: "Watchlist", icon: Star },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "portfolio", label: "Portfolio", icon: Briefcase },
];

export default function Layout({ tab, setTab, alertBadge, connected, user, onLogout, children }) {
  return (
    <div style={styles.app}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <div style={styles.brandMark} />
          <span style={styles.brandText}>Ticker Room</span>
        </div>

        <nav style={styles.nav}>
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              style={{ ...styles.navItem, ...(tab === n.id ? styles.navItemActive : {}) }}
            >
              <n.icon size={16} strokeWidth={1.75} />
              <span>{n.label}</span>
              {n.id === "alerts" && !!alertBadge && (
                <span style={styles.navBadge}>{alertBadge}</span>
              )}
            </button>
          ))}
        </nav>

        <div style={styles.sidebarFoot}>
          <div style={styles.userRow}>{user?.name}</div>
          <div style={styles.liveRow}>
            <Circle size={7} fill={connected ? "#2DD4A7" : "#E4667B"} stroke="none" />
            <span>{connected ? "Live feed connected" : "Reconnecting…"}</span>
          </div>
          <button style={styles.logoutBtn} onClick={onLogout}>
            Log out
          </button>
        </div>
      </aside>

      <main style={styles.main}>{children}</main>
    </div>
  );
}
