import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { COLORS } from "../styles.js";

export default function TickerTape({ stocks = [], onOpenStock }) {
  if (!stocks || !stocks.length) return null;

  // Display top 12 active moving stocks in the ticker tape
  const tapeStocks = stocks.slice(0, 14);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        overflowX: "auto",
        scrollbarWidth: "none",
        padding: "6px 0",
        marginBottom: 16,
        borderBottom: `1px solid ${COLORS.border}`,
        whiteSpace: "nowrap",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 10.5,
          fontWeight: 800,
          letterSpacing: 0.5,
          color: COLORS.accent2,
          textTransform: "uppercase",
          paddingRight: 10,
          borderRight: `1px solid ${COLORS.border}`,
          flexShrink: 0,
        }}
      >
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.gain }} />
        LIVE TAPE
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "center", flexShrink: 0 }}>
        {tapeStocks.map((s) => {
          const up = s.change >= 0;
          return (
            <button
              key={s.symbol}
              onClick={() => onOpenStock && onOpenStock(s.symbol)}
              style={{
                background: "transparent",
                border: "none",
                color: COLORS.text,
                cursor: "pointer",
                padding: "2px 6px",
                borderRadius: 6,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                transition: "background 0.15s ease",
              }}
              title={`View ${s.name}`}
            >
              <span style={{ fontWeight: 700 }}>{s.symbol}</span>
              <span style={{ fontVariantNumeric: "tabular-nums", color: COLORS.text }}>
                ₹{s.price.toFixed(2)}
              </span>
              <span
                style={{
                  color: up ? COLORS.gain : COLORS.loss,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 2,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {up ? "+" : ""}
                {s.change.toFixed(2)}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
