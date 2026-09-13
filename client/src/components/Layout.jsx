import React, { useState, useRef, useEffect } from "react";
import {
  LayoutDashboard,
  Star,
  Bell,
  Briefcase,
  Circle,
  Search,
  TrendingUp,
  TrendingDown,
  Volume2,
  VolumeX,
  Newspaper,
} from "lucide-react";
import { styles, COLORS } from "../styles.js";
import TickerTape from "./TickerTape.jsx";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "watchlist", label: "Watchlist", icon: Star },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "portfolio", label: "Portfolio", icon: Briefcase },
  { id: "news", label: "Intelligence", icon: Newspaper },
];

export default function Layout({
  tab,
  setTab,
  alertBadge,
  connected,
  marketStatus,
  user,
  stocks = [],
  onOpenStock,
  onLogout,
  soundEnabled = true,
  onToggleSound,
  children,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef(null);

  // Close search dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchResults = searchQuery.trim()
    ? stocks.filter(
        (s) =>
          s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.sector.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  function handleSelectStock(symbol) {
    if (onOpenStock) onOpenStock(symbol);
    setSearchQuery("");
    setIsSearchOpen(false);
  }

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
            <span>
              {connected
                ? marketStatus?.usingFallback
                  ? `Demo feed (${marketStatus.provider || "simulated"})`
                  : `${(marketStatus.provider || "live").toUpperCase()} live feed`
                : "Reconnecting…"}
            </span>
          </div>
          <button style={styles.logoutBtn} onClick={onLogout}>
            Log out
          </button>
        </div>
      </aside>

      <main style={styles.main}>
        {/* Live Top Ticker Tape */}
        <TickerTape stocks={stocks} onOpenStock={onOpenStock} />

        {/* Top bar with Global Search, Audio Chime Toggle, and Market Feed Tag */}
        <div style={styles.topBar}>
          <div ref={searchRef} style={styles.searchContainer}>
            <div style={styles.searchBar}>
              <Search size={16} color={COLORS.textMuted} />
              <input
                style={styles.searchInput}
                placeholder="Search 37 stocks by ticker or company (e.g. AAPL, Tesla, NVDA)..."
                value={searchQuery}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
              />
            </div>

            {isSearchOpen && searchQuery.trim() && (
              <div style={styles.searchDropdown}>
                {searchResults.length > 0 ? (
                  searchResults.slice(0, 8).map((s) => {
                    const up = s.change >= 0;
                    return (
                      <button
                        key={s.symbol}
                        style={styles.searchItem}
                        onClick={() => handleSelectStock(s.symbol)}
                      >
                        <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                          <span style={{ fontWeight: 700, fontSize: 13.5 }}>{s.symbol}</span>
                          <span style={{ color: COLORS.textMuted, fontSize: 12 }}>{s.name}</span>
                          <span
                            style={{
                              fontSize: 10.5,
                              background: "rgba(148,163,184,0.1)",
                              padding: "1px 6px",
                              borderRadius: 4,
                              color: COLORS.textMuted,
                            }}
                          >
                            {s.sector}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontVariantNumeric: "tabular-nums", fontSize: 13 }}>
                            ₹{s.price.toFixed(2)}
                          </span>
                          <span
                            style={{
                              color: up ? COLORS.gain : COLORS.loss,
                              fontSize: 12,
                              fontWeight: 600,
                              display: "flex",
                              alignItems: "center",
                              gap: 2,
                            }}
                          >
                            {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {up ? "+" : ""}
                            {s.change.toFixed(2)}%
                          </span>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div style={{ padding: "10px 12px", color: COLORS.textMuted, fontSize: 13 }}>
                    No stocks matching "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Audio chime toggle */}
            <button
              onClick={onToggleSound}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: soundEnabled ? "rgba(122,162,255,0.12)" : "rgba(148,163,184,0.06)",
                border: `1px solid ${soundEnabled ? COLORS.accent : COLORS.border}`,
                color: soundEnabled ? COLORS.accent : COLORS.textMuted,
                borderRadius: 10,
                padding: "7px 11px",
                fontSize: 12,
                cursor: "pointer",
                transition: "all 0.18s ease",
              }}
              title={soundEnabled ? "Alert Chime Enabled" : "Alert Chime Muted"}
            >
              {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              <span>{soundEnabled ? "Alert Sound ON" : "Sound OFF"}</span>
            </button>

            {/* Live feed status tag */}
            <div style={styles.statusTag}>
              <Circle size={6} fill={connected ? COLORS.gain : COLORS.loss} stroke="none" />
              <span style={{ color: COLORS.textMuted }}>
                Feed:{" "}
                <strong style={{ color: COLORS.text }}>
                  {marketStatus?.usingFallback ? "Simulated" : (marketStatus?.provider || "Live").toUpperCase()}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {children}
      </main>
    </div>
  );
}
