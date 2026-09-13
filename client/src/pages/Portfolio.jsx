import React, { useState, useEffect, useMemo } from "react";
import { styles, COLORS } from "../styles.js";
import { Header, Panel, IndexTicker, ErrorBanner, Empty } from "../components/ui.jsx";
import { ArrowUpRight, ArrowDownRight, History, Download } from "lucide-react";
import { exportPortfolioCsv } from "../utils/exportCsv.js";

export default function Portfolio({ portfolio, stocks, onBuy, onSell }) {
  const [form, setForm] = useState({ symbol: "", qty: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!form.symbol && stocks.length > 0) {
      setForm((f) => ({ ...f, symbol: stocks[0].symbol }));
    }
  }, [stocks, form.symbol]);

  const liveHoldings = useMemo(() => {
    if (!portfolio) return [];
    const bySymbol = Object.fromEntries(stocks.map((s) => [String(s.symbol).toUpperCase(), s]));
    return (portfolio.holdings || []).map((h) => {
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

  const selectedStock = stocks.find((s) => s.symbol === form.symbol);
  const parsedQty = Math.floor(Number(form.qty));
  const estimatedTotal =
    selectedStock && parsedQty > 0 ? (parsedQty * selectedStock.price).toFixed(2) : null;

  async function trade(side) {
    setError("");
    setSuccess("");
    if (!form.symbol) return setError("Stocks haven't loaded yet — try again in a second.");
    if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
      return setError("Enter a valid positive whole quantity.");
    }

    setLoading(true);
    try {
      if (side === "buy") {
        await onBuy({ symbol: form.symbol, qty: parsedQty });
        setSuccess(`Successfully bought ${parsedQty} shares of ${form.symbol}!`);
      } else {
        await onSell({ symbol: form.symbol, qty: parsedQty });
        setSuccess(`Successfully sold ${parsedQty} shares of ${form.symbol}!`);
      }
      setForm((f) => ({ ...f, qty: "" }));
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const { cash, transactions = [] } = portfolio;
  const holdings = liveHoldings;
  const totals = liveTotals;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <Header title="Portfolio" sub="Paper-trading balances, marked-to-market against the live tape" />
        <button
          onClick={() => exportPortfolioCsv(portfolio, holdings)}
          style={{
            ...styles.watchBtn,
            background: "rgba(122,162,255,0.12)",
            borderColor: COLORS.accent,
            marginTop: 6,
          }}
          title="Download portfolio spreadsheet as CSV"
        >
          <Download size={14} color={COLORS.accent} />
          <span>Export CSV</span>
        </button>
      </div>

      <div style={styles.indexStrip}>
        <IndexTicker label="Available Cash" value={cash} isCurrency />
        <IndexTicker label="Invested Capital" value={totals.invested} isCurrency />
        <IndexTicker
          label="Portfolio Value"
          value={totals.current}
          isCurrency
          change={totals.plPct}
        />
        <IndexTicker
          label="Total P&L"
          value={totals.pl}
          isCurrency
          change={totals.plPct}
        />
      </div>

      <Panel title="Instant Paper Trade">
        <ErrorBanner message={error} />
        {success && (
          <div
            style={{
              background: "rgba(53, 215, 165, 0.12)",
              border: `1px solid ${COLORS.gain}`,
              color: COLORS.gain,
              borderRadius: 12,
              padding: "10px 14px",
              fontSize: 13,
              marginBottom: 14,
            }}
          >
            {success}
          </div>
        )}

        <div style={styles.form}>
          <select
            style={{ ...styles.select, flex: 2, minWidth: 200 }}
            value={form.symbol}
            onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))}
          >
            {stocks.map((s) => (
              <option key={s.symbol} value={s.symbol}>
                {s.symbol} — {s.name} (₹{s.price.toFixed(2)})
              </option>
            ))}
          </select>

          <input
            style={{ ...styles.input, flex: 1, minWidth: 100 }}
            placeholder="Qty"
            type="number"
            min="1"
            step="1"
            value={form.qty}
            onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))}
          />

          <div style={{ display: "flex", gap: 6 }}>
            {[1, 5, 10, 50].map((q) => (
              <button
                key={q}
                type="button"
                style={{
                  background: "rgba(148,163,184,0.08)",
                  border: `1px solid ${COLORS.border}`,
                  color: COLORS.textMuted,
                  borderRadius: 8,
                  padding: "6px 10px",
                  fontSize: 12,
                  cursor: "pointer",
                }}
                onClick={() => setForm((f) => ({ ...f, qty: String(q) }))}
              >
                +{q}
              </button>
            ))}
          </div>

          <button
            style={{ ...styles.primaryBtn, minWidth: 80 }}
            disabled={loading}
            onClick={() => trade("buy")}
          >
            Buy
          </button>
          <button
            style={{ ...styles.dangerBtn, minWidth: 80 }}
            disabled={loading}
            onClick={() => trade("sell")}
          >
            Sell
          </button>
        </div>

        {estimatedTotal && (
          <div style={{ marginTop: 10, fontSize: 12.5, color: COLORS.textMuted }}>
            Estimated trade value:{" "}
            <strong style={{ color: COLORS.text }}>₹{Number(estimatedTotal).toLocaleString()}</strong>
          </div>
        )}
      </Panel>

      <div style={styles.twoCol}>
        <Panel title="Active Holdings" style={{ marginTop: 20 }}>
          {holdings.map((h) => (
            <div key={h.symbol} style={styles.holdingRow}>
              <div>
                <div style={styles.holdingSymbol}>{h.symbol}</div>
                <div style={styles.holdingMeta}>
                  {h.qty} sh @ ₹{h.avgPrice.toFixed(2)} avg
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 700 }}>₹{h.current.toFixed(2)}</div>
                <div
                  style={{
                    color: h.pl >= 0 ? COLORS.gain : COLORS.loss,
                    fontSize: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 2,
                  }}
                >
                  {h.pl >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                  {h.pl >= 0 ? "+" : ""}₹{h.pl.toFixed(2)} ({h.plPct.toFixed(2)}%)
                </div>
              </div>
            </div>
          ))}
          {holdings.length === 0 && <Empty text="No holdings yet — execute a buy trade above." />}
        </Panel>

        <Panel
          title={
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <History size={14} /> Trade History
            </span>
          }
          style={{ marginTop: 20 }}
        >
          {transactions.length > 0 ? (
            <div style={{ maxHeight: 360, overflowY: "auto" }}>
              {transactions.map((tx, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "9px 0",
                    borderBottom: `1px solid ${COLORS.border}`,
                    fontSize: 13,
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={tx.side === "buy" ? styles.badgeBuy : styles.badgeSell}>
                        {tx.side}
                      </span>
                      <strong style={{ fontSize: 13.5 }}>{tx.symbol}</strong>
                    </div>
                    <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 3 }}>
                      {tx.at ? new Date(tx.at).toLocaleString() : ""}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div>
                      {tx.qty} @ ₹{tx.price.toFixed(2)}
                    </div>
                    <div style={{ fontSize: 11.5, color: COLORS.textMuted, marginTop: 2 }}>
                      ₹{tx.total.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty text="No executed trades yet. Buy or sell shares to see history." />
          )}
        </Panel>
      </div>
    </div>
  );
}
