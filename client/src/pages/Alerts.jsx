import React, { useState, useEffect } from "react";
import { styles, COLORS } from "../styles.js";
import { Header, Panel, Empty, ErrorBanner } from "../components/ui.jsx";

export default function Alerts({ alerts, stocks, onCreate, onDelete }) {
  const [form, setForm] = useState({ symbol: "", direction: "above", target: "" });
  const [error, setError] = useState("");

  // `stocks` is empty until the first socket tick arrives, so the initial
  // useState above can't pick a default symbol. Fill it in once real data
  // shows up, but don't clobber a choice the user already made.
  useEffect(() => {
    if (!form.symbol && stocks.length > 0) {
      setForm((f) => ({ ...f, symbol: stocks[0].symbol }));
    }
  }, [stocks, form.symbol]);

  async function submit() {
    setError("");
    const targetNum = Number(form.target);
    if (!form.symbol) return setError("Stocks haven't loaded yet — try again in a second.");
    if (form.target === "" || !Number.isFinite(targetNum) || targetNum <= 0) {
      return setError("Enter a positive target price.");
    }
    try {
      await onCreate({ symbol: form.symbol, direction: form.direction, target: targetNum });
      setForm((f) => ({ ...f, target: "" }));
    } catch (err) {
      setError(err.message);
    }
  }

  const active = alerts.filter((a) => a.status === "active");
  const triggered = alerts.filter((a) => a.status === "triggered");

  return (
    <div>
      <Header title="Price alerts" sub="Evaluated server-side against every incoming tick" />

      <Panel title="Create alert">
        <ErrorBanner message={error} />
        <div style={styles.form}>
          <select
            style={styles.select}
            value={form.symbol}
            onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))}
          >
            {stocks.map((s) => (
              <option key={s.symbol} value={s.symbol}>
                {s.symbol}
              </option>
            ))}
          </select>
          <select
            style={styles.select}
            value={form.direction}
            onChange={(e) => setForm((f) => ({ ...f, direction: e.target.value }))}
          >
            <option value="above">crosses above</option>
            <option value="below">crosses below</option>
          </select>
          <input
            style={styles.input}
            placeholder="Target price"
            value={form.target}
            onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))}
          />
          <button style={styles.primaryBtn} onClick={submit}>
            Create
          </button>
        </div>
      </Panel>

      <div style={styles.twoCol}>
        <Panel title="Active">
          {active.map((a) => (
            <div key={a._id} style={styles.alertRow}>
              <span>
                {a.symbol} {a.direction} ₹{a.target}
              </span>
              <button
                style={{ ...styles.iconBtn, color: COLORS.textMuted }}
                onClick={() => onDelete(a._id)}
              >
                ✕
              </button>
            </div>
          ))}
          {active.length === 0 && <Empty text="No active alerts." />}
        </Panel>
        <Panel title="Triggered">
          {triggered.map((a) => (
            <div key={a._id} style={styles.alertRow}>
              <span>
                {a.symbol} hit ₹{a.triggeredPrice?.toFixed(2)}
              </span>
              <span style={{ color: COLORS.amber, fontSize: 12 }}>
                {a.triggeredAt ? new Date(a.triggeredAt).toLocaleTimeString() : ""}
              </span>
            </div>
          ))}
          {triggered.length === 0 && <Empty text="Nothing has triggered yet." />}
        </Panel>
      </div>
    </div>
  );
}
