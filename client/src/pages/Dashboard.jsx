import React, { useMemo, useState } from "react";
import { styles, heatColor, COLORS } from "../styles.js";
import { Header, Panel, IndexTicker, MoverRow } from "../components/ui.jsx";

export default function Dashboard({ stocks, onOpen }) {
  const [selectedSector, setSelectedSector] = useState("All");

  const ranked = useMemo(() => [...stocks].sort((a, b) => b.change - a.change), [stocks]);
  const gainers = ranked.slice(0, 4);
  const losers = ranked.slice(-4).reverse();

  // Dynamically extract all sectors present in the loaded stocks
  const sectors = useMemo(() => {
    const unique = new Set(stocks.map((s) => s.sector).filter(Boolean));
    return Array.from(unique);
  }, [stocks]);

  const marketAvg = useMemo(() => {
    if (!stocks.length) return { value: 5000, change: 0 };
    const avg = stocks.reduce((a, s) => a + s.change, 0) / stocks.length;
    return { value: 5000 + avg * 25, change: avg };
  }, [stocks]);

  const techAvg = useMemo(() => {
    const techStocks = stocks.filter((s) => s.sector === "Technology");
    if (!techStocks.length) return { value: 18000, change: 0 };
    const avg = techStocks.reduce((a, s) => a + s.change, 0) / techStocks.length;
    return { value: 18000 + avg * 45, change: avg };
  }, [stocks]);

  const sectorAverages = useMemo(() => {
    return sectors.map((sector) => {
      const group = stocks.filter((s) => s.sector === sector);
      const avg = group.length ? group.reduce((a, s) => a + s.change, 0) / group.length : 0;
      return { sector, avg, stocks: group };
    });
  }, [sectors, stocks]);

  const activeSectorSummary =
    selectedSector === "All"
      ? {
          sector: "All sectors",
          avg: marketAvg.change,
          stocks,
        }
      : sectorAverages.find((item) => item.sector === selectedSector) || {
          sector: selectedSector,
          avg: 0,
          stocks: [],
        };

  const visibleStocks = selectedSector === "All" ? ranked : activeSectorSummary.stocks;

  return (
    <div>
      <Header
        title="Market Overview"
        sub="Real-time stock price streaming and market movements • Updated every 1.5s"
      />

      <div style={styles.indexStrip}>
        <IndexTicker label="Market Composite" value={marketAvg.value} change={marketAvg.change} />
        <IndexTicker label="Tech Momentum Index" value={techAvg.value} change={techAvg.change} />
        <IndexTicker
          label="Tracked Equities"
          value={stocks.length}
          change={undefined}
        />
      </div>

      <div style={styles.twoCol}>
        <Panel title="Top Gainers">
          {gainers.map((s) => (
            <MoverRow key={s.symbol} s={s} onOpen={onOpen} />
          ))}
          {gainers.length === 0 && <div style={{ color: COLORS.textMuted, fontSize: 13 }}>Loading market data…</div>}
        </Panel>
        <Panel title="Top Losers">
          {losers.map((s) => (
            <MoverRow key={s.symbol} s={s} onOpen={onOpen} />
          ))}
          {losers.length === 0 && <div style={{ color: COLORS.textMuted, fontSize: 13 }}>Loading market data…</div>}
        </Panel>
      </div>

      <Panel title="Sector Heatmap" style={{ marginTop: 20 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <button
            onClick={() => setSelectedSector("All")}
            style={{
              background: selectedSector === "All" ? "rgba(122,162,255,0.18)" : "transparent",
              border: `1px solid ${selectedSector === "All" ? COLORS.accent : "rgba(148,163,184,0.18)"}`,
              borderRadius: 999,
              color: selectedSector === "All" ? COLORS.text : COLORS.textMuted,
              padding: "6px 14px",
              fontSize: 12.5,
              fontWeight: selectedSector === "All" ? 600 : 400,
              cursor: "pointer",
            }}
          >
            All sectors ({stocks.length})
          </button>
        </div>

        <div style={styles.heatGrid}>
          {sectorAverages.map(({ sector, avg, stocks: group }) => (
            <button
              key={sector}
              onClick={() => setSelectedSector(sector)}
              style={{
                ...styles.heatCell,
                background: heatColor(avg),
                border: selectedSector === sector ? `2px solid rgba(255,255,255,0.85)` : "none",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={styles.heatLabel}>{sector}</div>
              <div style={styles.heatValue}>
                {avg >= 0 ? "+" : ""}
                {avg.toFixed(2)}%
              </div>
              <div style={{ fontSize: 10.5, opacity: 0.8, marginTop: 2 }}>
                {group.length} stocks
              </div>
            </button>
          ))}
        </div>
      </Panel>

      <div style={{ marginTop: 20 }}>
        <Panel
          title={
            selectedSector === "All"
              ? "All Tracked Equities"
              : `${selectedSector} Sector Performance (${visibleStocks.length} stocks)`
          }
        >
          <div style={{ fontSize: 12.5, color: COLORS.textMuted, marginBottom: 14 }}>
            Momentum:{" "}
            <span style={{ color: activeSectorSummary.avg >= 0 ? COLORS.gain : COLORS.loss, fontWeight: 600 }}>
              {activeSectorSummary.avg >= 0 ? "+" : ""}
              {activeSectorSummary.avg.toFixed(2)}%
            </span>
          </div>

          {visibleStocks.length ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
              {visibleStocks.map((s) => (
                <MoverRow key={s.symbol} s={s} onOpen={onOpen} />
              ))}
            </div>
          ) : (
            <div style={{ color: COLORS.textMuted, fontSize: 13 }}>No stocks found in this group.</div>
          )}
        </Panel>
      </div>
    </div>
  );
}
