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
import { TrendingUp, TrendingDown, Star } from "lucide-react";
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
        padding: "8px 10px",
        color: COLORS.text,
        boxShadow: "0 12px 28px rgba(0,0,0,0.2)",
      }}
    >
      <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
        ₹{Number(value).toFixed(2)}
      </div>
    </div>
  );
}

const RANGE_OPTIONS = [
  { key: "1d", label: "1 day" },
  { key: "1w", label: "1 week" },
  { key: "3m", label: "3 months" },
  { key: "6m", label: "6 months" },
];

function sma(history, period = 10) {
  if (!history || history.length < period) return null;
  const slice = history.slice(-period);
  return slice.reduce((a, b) => a + b.p, 0) / slice.length;
}

export default function StockDetail({ stock, inWatch, onToggleWatch }) {
  const [range, setRange] = useState("1d");
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    if (!stock) return;

    let active = true;
    api
      .getStockChart(stock.symbol, range)
      .then((data) => {
        if (active) setChartData(data || []);
      })
      .catch(() => {
        if (active) setChartData(stock.history || []);
      });

    return () => {
      active = false;
    };
  }, [stock, range]);

  const movingAvg = useMemo(() => (stock ? sma(stock.history, 10) : null), [stock]);
  const series = (chartData.length ? chartData : stock?.history || []).map((point) => ({
    label: point.label || point.t || "",
    price: Number(point.price ?? point.p ?? 0),
  }));

  if (!stock) return <Header title="Loading…" />;

  const up = stock.change >= 0;

  return (
    <div>
      <Header title={stock.symbol} sub={stock.name} />

      <div style={styles.stockTop}>
        <div>
          <div style={styles.stockPrice}>₹{stock.price.toFixed(2)}</div>
          <div style={{ ...styles.stockChange, color: up ? COLORS.gain : COLORS.loss }}>
            {up ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
            {up ? "+" : ""}
            {stock.change.toFixed(2)}% today
          </div>
        </div>
        <button onClick={() => onToggleWatch(stock.symbol)} style={styles.watchBtn}>
          <Star
            size={14}
            fill={inWatch ? COLORS.amber : "none"}
            stroke={inWatch ? COLORS.amber : COLORS.textMuted}
          />
          {inWatch ? "On watchlist" : "Add to watchlist"}
        </button>
      </div>

      <Panel title="Performance" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          {RANGE_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setRange(key)}
              style={{
                background: range === key ? "rgba(122,162,255,0.12)" : "transparent",
                border: `1px solid ${range === key ? COLORS.border : "rgba(148,163,184,0.18)"}`,
                color: range === key ? COLORS.text : COLORS.textMuted,
                borderRadius: 999,
                padding: "6px 12px",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={series}>
            <defs>
              <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={up ? COLORS.gain : COLORS.loss} stopOpacity={0.35} />
                <stop offset="100%" stopColor={up ? COLORS.gain : COLORS.loss} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={COLORS.border} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: COLORS.textMuted, fontSize: 11 }}
              minTickGap={24}
            />
            <YAxis
              domain={["auto", "auto"]}
              tick={{ fill: COLORS.textMuted, fontSize: 11 }}
              width={54}
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
              fill="url(#fill)"
              isAnimationActive
              animationDuration={700}
              animationEasing="ease-in-out"
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
      </Panel>

      <div style={styles.twoCol}>
        <Panel title="Session stats">
          <Stat label="Previous close" value={`₹${stock.prevClose.toFixed(2)}`} />
          <Stat label="Sector" value={stock.sector} />
          <Stat label="Ticks in window" value={stock.history.length} />
        </Panel>
        <Panel title="Indicator — SMA(10)">
          <Stat
            label="Simple moving average"
            value={movingAvg ? `₹${movingAvg.toFixed(2)}` : "Collecting data…"}
          />
          <Stat
            label="Price vs SMA"
            value={
              movingAvg
                ? stock.price > movingAvg
                  ? "Above (bullish bias)"
                  : "Below (bearish bias)"
                : "—"
            }
          />
        </Panel>
      </div>
    </div>
  );
}
