import React, { useState, useEffect, useMemo } from "react";
import { styles, COLORS } from "../styles.js";
import { Header, Panel, IndexTicker, ErrorBanner, Empty } from "../components/ui.jsx";

export default function Portfolio({ portfolio, stocks, onBuy, onSell }) {
  const [form, setForm] = useState({ symbol: "", qty: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!form.symbol && stocks.length > 0) {
      setForm((f) => ({ ...f, symbol: stocks[0].symbol }));
    }
  }, [stocks, form.symbol]);

  // portfolio.holdings' price/current/pl come from whichever REST call last
  // ran (initial load, or the last buy/sell) — they do NOT move with the
  // live tick stream on their own. Recompute here from the `stocks` prop,
  // which *does* update every ~1.5s over the socket, so P&L actually moves
  // between trades instead of only updating right after one.
  const liveHoldings = useMemo(() => {
    if (!portfolio) return [];
    const bySymbol = Object.fromEntries(stocks.map((s) => [String(s.symbol).toUpperCase(), s]));
    return portfolio.holdings.map((h) => {
      const symbolKey = String(h.symbol || "").toUpperCase();
      const live = bySymbol[symbolKey];
      const price = live ? live.price : (h.price ?? h.avgPrice);
      const invested = h.qty * h.avgPrice;
      const current = h.qty * price;
      const pl = current - invested;
      return { ...h, price, invested, current, pl, plPct: invested ? (pl / invested) * 100 : 0 };
    });
  }, [portfolio, stocks]);

  const liveTotals = useMemo(() => {
    const invested = liveHoldings.reduce((a, h) => a + h.invested, 0);
    const current = liveHoldings.reduce((a, h) => a + h.current, 0);
    return {
      invested,
      current,
      pl: current - invested,
      plPct: invested ? ((current - invested) / invested) * 100 : 0,
    };
  }, [liveHoldings]);

  if (!portfolio) return <Header title="Loading…" />;

  async function trade(side) {
    setError("");
    const qty = Number(form.qty);
    if (!form.symbol) return setError("Stocks haven't loaded yet — try again in a second.");
    if (!Number.isFinite(qty) || qty <= 0) return setError("Enter a positive quantity.");
    try {
      if (side === "buy") await onBuy({ symbol: form.symbol, qty });
      else await onSell({ symbol: form.symbol, qty });
      setForm((f) => ({ ...f, qty: "" }));
    } catch (err) {
      setError(err.message);
    }
  }

  const { cash } = portfolio;
  const holdings = liveHoldings;
  const totals = liveTotals;

  return (
    <div>
      <Header title="Portfolio" sub="Paper-trading balances, marked to the live tape" />

      <div style={styles.indexStrip}>
        <IndexTicker label="Cash" value={cash} isCurrency />
        <IndexTicker label="Invested" value={totals.invested} isCurrency />
        <IndexTicker
          label="Current value"
          value={totals.current}
          isCurrency
          change={totals.plPct}
        />
      </div>

      <Panel title="Trade">
        <ErrorBanner message={error} />
        <div style={styles.form}>
          <select
            style={styles.select}
            value={form.symbol}
            onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))}
          >
            {stocks.map((s) => (
              <option key={s.symbol} value={s.symbol}>
                {s.symbol} — ₹{s.price.toFixed(2)}
              </option>
            ))}
          </select>
          <input
            style={styles.input}
            placeholder="Quantity"
            value={form.qty}
            onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))}
          />
          <button style={styles.primaryBtn} onClick={() => trade("buy")}>
            Buy
          </button>
          <button style={styles.dangerBtn} onClick={() => trade("sell")}>
            Sell
          </button>
        </div>
      </Panel>

      <Panel title="Holdings" style={{ marginTop: 16 }}>
        {holdings.map((h) => (
          <div key={h.symbol} style={styles.holdingRow}>
            <div>
              <div style={styles.holdingSymbol}>{h.symbol}</div>
              <div style={styles.holdingMeta}>
                {h.qty} sh @ ₹{h.avgPrice.toFixed(2)} avg
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div>₹{h.current.toFixed(2)}</div>
              <div style={{ color: h.pl >= 0 ? COLORS.gain : COLORS.loss, fontSize: 12 }}>
                {h.pl >= 0 ? "+" : ""}₹{h.pl.toFixed(2)} ({h.plPct.toFixed(2)}%)
              </div>
            </div>
          </div>
        ))}
        {holdings.length === 0 && <Empty text="No holdings yet — buy something above." />}
      </Panel>
    </div>
  );
}
