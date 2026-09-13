import React, { useState } from "react";
import { X, Plus, Star, Download } from "lucide-react";
import { styles, COLORS } from "../styles.js";
import { Header, Panel, Table } from "../components/ui.jsx";
import { exportWatchlistCsv } from "../utils/exportCsv.js";

export default function Watchlist({ watchlist, stocks, onOpen, onAdd, onRemove }) {
  const [selectedToAdd, setSelectedToAdd] = useState("");
  const bySymbol = Object.fromEntries(stocks.map((s) => [s.symbol, s]));
  const rows = watchlist.map((sym) => bySymbol[sym]).filter(Boolean);
  const addable = stocks.filter((s) => !watchlist.includes(s.symbol));

  function handleAdd() {
    if (!selectedToAdd) return;
    onAdd(selectedToAdd);
    setSelectedToAdd("");
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <Header title="Watchlist" sub="Stored server-side, synchronized live across all devices" />
        {rows.length > 0 && (
          <button
            onClick={() => exportWatchlistCsv(rows)}
            style={{
              ...styles.watchBtn,
              background: "rgba(122,162,255,0.12)",
              borderColor: COLORS.accent,
              marginTop: 6,
            }}
            title="Download watchlist as CSV spreadsheet"
          >
            <Download size={14} color={COLORS.accent} />
            <span>Export CSV</span>
          </button>
        )}
      </div>
      
      <Panel>
        <Table
          rows={rows}
          onOpen={onOpen}
          action={(s) => (
            <button
              style={{ ...styles.iconBtn, color: COLORS.textMuted }}
              onClick={() => onRemove(s.symbol)}
              title="Remove from watchlist"
            >
              <X size={15} />
            </button>
          )}
        />
      </Panel>

      <Panel title="Add stocks to watchlist" style={{ marginTop: 20 }}>
        {addable.length > 0 ? (
          <div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
              <select
                style={{ ...styles.select, flex: 1, minWidth: 220 }}
                value={selectedToAdd}
                onChange={(e) => setSelectedToAdd(e.target.value)}
              >
                <option value="">-- Choose a stock to add --</option>
                {addable.map((s) => (
                  <option key={s.symbol} value={s.symbol}>
                    {s.symbol} — {s.name} (₹{s.price.toFixed(2)})
                  </option>
                ))}
              </select>
              <button
                style={{ ...styles.primaryBtn, display: "flex", alignItems: "center", gap: 6 }}
                onClick={handleAdd}
                disabled={!selectedToAdd}
              >
                <Plus size={14} /> Add to Watchlist
              </button>
            </div>

            {/* Quick suggested chips (up to 8) */}
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>
                Quick suggestions:
              </div>
              <div style={styles.chipRow}>
                {addable.slice(0, 8).map((s) => (
                  <button
                    key={s.symbol}
                    style={styles.chip}
                    onClick={() => onAdd(s.symbol)}
                    title={`Add ${s.name}`}
                  >
                    <Plus size={12} /> {s.symbol} <span style={{ color: COLORS.textMuted }}>₹{s.price.toFixed(0)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ color: COLORS.textMuted, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            <Star size={14} fill={COLORS.amber} color={COLORS.amber} />
            All available market stocks are currently on your watchlist!
          </div>
        )}
      </Panel>
    </div>
  );
}
