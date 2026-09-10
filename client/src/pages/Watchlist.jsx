import React from "react";
import { X, Plus } from "lucide-react";
import { styles } from "../styles.js";
import { Header, Panel, Table } from "../components/ui.jsx";

export default function Watchlist({ watchlist, stocks, onOpen, onAdd, onRemove }) {
  const bySymbol = Object.fromEntries(stocks.map((s) => [s.symbol, s]));
  const rows = watchlist.map((sym) => bySymbol[sym]).filter(Boolean);
  const addable = stocks.filter((s) => !watchlist.includes(s.symbol));

  return (
    <div>
      <Header title="Watchlist" sub="Stored server-side, so it follows you across devices" />
      <Panel>
        <Table
          rows={rows}
          onOpen={onOpen}
          action={(s) => (
            <button style={styles.iconBtn} onClick={() => onRemove(s.symbol)}>
              <X size={14} />
            </button>
          )}
        />
      </Panel>

      <Panel title="Add to watchlist" style={{ marginTop: 16 }}>
        <div style={styles.chipRow}>
          {addable.map((s) => (
            <button key={s.symbol} style={styles.chip} onClick={() => onAdd(s.symbol)}>
              <Plus size={12} /> {s.symbol}
            </button>
          ))}
          {addable.length === 0 && (
            <span style={{ color: "#8B93A1", fontSize: 13 }}>
              Everything is already on your watchlist.
            </span>
          )}
        </div>
      </Panel>
    </div>
  );
}
