import React, { useEffect, useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { TrendingUp, TrendingDown, Star, Activity } from "lucide-react";
import { styles, COLORS } from "../styles.js";
import { Header, Panel, Stat } from "../components/ui.jsx";
import { api } from "../api.js";

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const value = payload[0]?.value ?? 0;

  return (
    <div
      style={{
        background: "rgba(9, 14, 24, 0.96)",
        border: `1px solid ${COLORS.border}`,
        borderRadius: 10,
        padding: "8px 12px",
        color: COLORS.text,
        boxShadow: "0 12px 28px rgba(0,0,0,0.3)",
      }}
    >
      <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", fontSize: 14 }}>
        ₹{Number(value).toFixed(2)}
      </div>
    </div>
  );
}

const RANGE_OPTIONS = [
  { key: "1d", label: "1 day (Live)" },
  { key: "1w", label: "1 week" },
  { key: "3m", label: "3 months" },
  { key: "6m", label: "6 months" },
];

function sma(history, period = 10) {
  if (!history || history.length < period) return null;
  const slice = history.slice(-period);
  return slice.reduce((a, b) => a + (b.p ?? b.price ?? 0), 0) / slice.length;
}

export default function StockDetail({ stock, inWatch, onToggleWatch }) {
  const [range, setRange] = useState("1d");
  const [chartData, setChartData] = useState([]);
  const [loadingChart, setLoadingChart] = useState(false);

  useEffect(() => {
    if (!stock || range === "1d") return;

    let active = true;
    setLoadingChart(true);
    api
      .getStockChart(stock.symbol, range)
      .then((data) => {
        if (active) setChartData(data || []);
      })
      .catch(() => {
        if (active) setChartData([]);
      })
      .finally(() => {
        if (active) setLoadingChart(false);
      });

    return () => {
      active = false;
    };
  }, [stock?.symbol, range]);

  const movingAvg = useMemo(() => (stock ? sma(stock.history, 10) : null), [stock?.history]);

  // If 1D: dynamically track the incoming live tick history from socket
  // If 1W, 3M, 6M: use candle chart data from backend
  const series = useMemo(() => {
    if (range === "1d") {
      const history = stock?.history || [];
      return history.map((point) => {
        const d = typeof point.t === "number" && point.t > 1000000 ? new Date(point.t) : new Date();
        return {
          label: d.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          }),
          price: Number((point.price ?? point.p ?? 0).toFixed(2)),
        };
      });
    }
    return (chartData.length ? chartData : stock?.history || []).map((point) => ({
      label: point.label || (point.t ? new Date(point.t).toLocaleDateString() : ""),
      price: Number(point.price ?? point.p ?? 0),
    }));
  }, [range, stock?.history, chartData]);

  if (!stock) return <Header title="Loading stock details…" />;

  const up = stock.change >= 0;
  const prices = series.map((s) => s.price).filter(Boolean);
  const periodHigh = prices.length ? Math.max(...prices) : stock.price;
  const periodLow = prices.length ? Math.min(...prices) : stock.price;

  return (
    <div>
      <Header title={stock.symbol} sub={`${stock.name} • ${stock.sector}`} />

      <div style={styles.stockTop}>
        <div>
          <div style={styles.stockPrice}>₹{stock.price.toFixed(2)}</div>
          <div style={{ ...styles.stockChange, color: up ? COLORS.gain : COLORS.loss }}>
            {up ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            {up ? "+" : ""}
            {stock.change.toFixed(2)}% today
          </div>
        </div>
        <button onClick={() => onToggleWatch(stock.symbol)} style={styles.watchBtn}>
          <Star
            size={15}
            fill={inWatch ? COLORS.amber : "none"}
            stroke={inWatch ? COLORS.amber : COLORS.textMuted}
          />
          {inWatch ? "On watchlist" : "Add to watchlist"}
        </button>
      </div>

      <Panel title="Price Performance & Candles" style={{ marginTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {RANGE_OPTIONS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setRange(key)}
                style={{
                  background: range === key ? "rgba(122,162,255,0.18)" : "transparent",
                  border: `1px solid ${range === key ? COLORS.accent : "rgba(148,163,184,0.18)"}`,
                  color: range === key ? COLORS.text : COLORS.textMuted,
                  borderRadius: 999,
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: range === key ? 600 : 400,
                  cursor: "pointer",
                  transition: "all 0.18s ease",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {range === "1d" && (
            <div style={{ fontSize: 11.5, color: COLORS.gain, display: "flex", alignItems: "center", gap: 5 }}>
              <Activity size={13} /> Live Streaming Ticks
            </div>
          )}
        </div>

        {loadingChart && range !== "1d" ? (
          <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.textMuted }}>
            Loading historical candles...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={series}>
              <defs>
                <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={up ? COLORS.gain : COLORS.loss} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={up ? COLORS.gain : COLORS.loss} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={COLORS.border} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: COLORS.textMuted, fontSize: 11 }}
                minTickGap={28}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fill: COLORS.textMuted, fontSize: 11 }}
                width={56}
                tickFormatter={(val) => `₹${val.toFixed(0)}`}
              />
              <Tooltip
                cursor={{
                  stroke: up ? COLORS.gain : COLORS.loss,
                  strokeWidth: 1.2,
                  strokeDasharray: "4 4",
                }}
                content={<ChartTooltip />}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke={up ? COLORS.gain : COLORS.loss}
                strokeWidth={2.2}
                fill="url(#fillGrad)"
                isAnimationActive={range !== "1d"}
                animationDuration={600}
                dot={false}
                activeDot={{
                  r: 5,
                  fill: up ? COLORS.gain : COLORS.loss,
                  stroke: "#ffffff",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Panel>

      <div style={styles.twoCol}>
        <Panel title="Session Stats" style={{ marginTop: 20 }}>
          <Stat label="Previous Close" value={`₹${stock.prevClose.toFixed(2)}`} />
          <Stat label="Period High" value={`₹${periodHigh.toFixed(2)}`} />
          <Stat label="Period Low" value={`₹${periodLow.toFixed(2)}`} />
          <Stat label="Sector Category" value={stock.sector} />
        </Panel>

        <Panel title="Technical Indicator — SMA(10)" style={{ marginTop: 20 }}>
          <Stat
            label="Simple Moving Average (10)"
            value={movingAvg ? `₹${movingAvg.toFixed(2)}` : "Calculating from live ticks…"}
          />
          <Stat
            label="Price vs SMA"
            value={
              movingAvg
                ? stock.price >= movingAvg
                  ? "Above SMA (Bullish Trend)"
                  : "Below SMA (Bearish Trend)"
                : "—"
            }
          />
          <Stat
            label="Live Tick Samples"
            value={stock.history?.length || 0}
          />
        </Panel>
      </div>
    </div>
  );
}
