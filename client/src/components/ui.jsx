import React from "react";
import { styles, COLORS } from "../styles.js";

export function Header({ title, sub }) {
  return (
    <div style={styles.header}>
      <h1 style={styles.h1}>{title}</h1>
      {sub && <p style={styles.hsub}>{sub}</p>}
    </div>
  );
}

export function Panel({ title, children, style }) {
  return (
    <div style={{ ...styles.panel, ...style }}>
      {title && <div style={styles.panelTitle}>{title}</div>}
      {children}
    </div>
  );
}

export function IndexTicker({ label, value, change, isCurrency }) {
  const up = (change ?? 0) >= 0;
  return (
    <div style={styles.indexCard}>
      <div style={styles.indexLabel}>{label}</div>
      <div style={styles.indexValue}>
        {isCurrency ? "₹" : ""}
        {value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </div>
      {change !== undefined && (
        <div style={{ color: up ? COLORS.gain : COLORS.loss, fontSize: 12.5 }}>
          {up ? "+" : ""}
          {change.toFixed(2)}%
        </div>
      )}
    </div>
  );
}

function Sparkline({ values, color }) {
  if (!Array.isArray(values) || values.length < 2) {
    return (
      <svg width="56" height="22" viewBox="0 0 56 22" preserveAspectRatio="none">
        <polyline
          points="0,15 18,12 36,10 56,7"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 56;
      const y = 20 - ((value - min) / range) * 14;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width="56" height="22" viewBox="0 0 56 22" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MoverRow({ s, onOpen }) {
  const up = s.change >= 0;
  const color = up ? COLORS.gain : COLORS.loss;
  const trend = Array.isArray(s.history)
    ? s.history.map((point) => point.p ?? point.price ?? 0)
    : [];

  return (
    <button style={styles.moverRow} onClick={() => onOpen(s.symbol)}>
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span>{s.symbol}</span>
        <Sparkline values={trend} color={color} />
      </span>
      <span style={{ color, fontWeight: 600 }}>
        {up ? "+" : ""}
        {s.change.toFixed(2)}%
      </span>
    </button>
  );
}

export function Table({ rows, onOpen, action }) {
  return (
    <div>
      {rows.map((s) => {
        const up = s.change >= 0;
        return (
          <div key={s.symbol} style={styles.tableRow}>
            <button style={styles.tableRowMain} onClick={() => onOpen(s.symbol)}>
              <span style={styles.tableSymbol}>{s.symbol}</span>
              <span style={styles.tableName}>{s.name}</span>
            </button>
            <span style={styles.tablePrice}>₹{s.price.toFixed(2)}</span>
            <span style={{ ...styles.tableChange, color: up ? COLORS.gain : COLORS.loss }}>
              {up ? "+" : ""}
              {s.change.toFixed(2)}%
            </span>
            {action && action(s)}
          </div>
        );
      })}
      {rows.length === 0 && <Empty text="Nothing here yet." />}
    </div>
  );
}

export function Stat({ label, value }) {
  return (
    <div style={styles.statRow}>
      <span style={styles.statLabel}>{label}</span>
      <span style={styles.statValue}>{value}</span>
    </div>
  );
}

export function Empty({ text }) {
  return <div style={{ color: COLORS.textMuted, fontSize: 13, padding: "8px 0" }}>{text}</div>;
}

export function ErrorBanner({ message }) {
  if (!message) return null;
  return <div style={styles.errorBanner}>{message}</div>;
}
