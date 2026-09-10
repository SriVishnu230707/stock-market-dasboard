import React, { useMemo, useState } from "react";
import { styles, heatColor, COLORS } from "../styles.js";
import { Header, Panel, IndexTicker, MoverRow } from "../components/ui.jsx";

const SECTORS = ["Banking", "IT", "Energy", "Auto", "Pharma"];

export default function Dashboard({ stocks, onOpen }) {
  const [selectedSector, setSelectedSector] = useState("All");

  const ranked = useMemo(() => [...stocks].sort((a, b) => b.change - a.change), [stocks]);
  const gainers = ranked.slice(0, 3);
  const losers = ranked.slice(-3).reverse();

  const nifty = useMemo(() => {
    if (!stocks.length) return { value: 25000, change: 0 };
    const avg = stocks.reduce((a, s) => a + s.change, 0) / stocks.length;
    return { value: 25000 + avg * 40, change: avg };
  }, [stocks]);

  const sectorAverages = useMemo(() => {
    return SECTORS.map((sector) => {
      const group = stocks.filter((s) => s.sector === sector);
      const avg = group.length ? group.reduce((a, s) => a + s.change, 0) / group.length : 0;
      return { sector, avg, stocks: group };
    });
  }, [stocks]);

  const activeSectorSummary =
    selectedSector === "All"
      ? {
          sector: "All groups",
          avg: stocks.length ? stocks.reduce((a, s) => a + s.change, 0) / stocks.length : 0,
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
        title="Market overview"
        sub="Live tape from the server's simulated feed — updates every 1.5s"
      />

      <div style={styles.indexStrip}>
        <IndexTicker label="NIFTY 50" value={nifty.value} change={nifty.change} />
        <IndexTicker label="SENSEX" value={nifty.value * 3.31} change={nifty.change * 0.94} />
      </div>

      <div style={styles.twoCol}>
        <Panel title="Top gainers">
          {gainers.map((s) => (
            <MoverRow key={s.symbol} s={s} onOpen={onOpen} />
          ))}
        </Panel>
        <Panel title="Top losers">
          {losers.map((s) => (
            <MoverRow key={s.symbol} s={s} onOpen={onOpen} />
          ))}
        </Panel>
      </div>

      <Panel title="Sector groups" style={{ marginTop: 20 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <button
            onClick={() => setSelectedSector("All")}
            style={{
              background: selectedSector === "All" ? "rgba(122,162,255,0.12)" : "transparent",
              border: `1px solid ${selectedSector === "All" ? COLORS.border : "rgba(148,163,184,0.18)"}`,
              borderRadius: 999,
              color: selectedSector === "All" ? COLORS.text : COLORS.textMuted,
              padding: "7px 12px",
              cursor: "pointer",
            }}
          >
            All groups
          </button>
        </div>
        <div style={styles.heatGrid}>
          {sectorAverages.map(({ sector, avg }) => (
            <button
              key={sector}
              onClick={() => setSelectedSector(sector)}
              style={{
                ...styles.heatCell,
                background: heatColor(avg),
                border: selectedSector === sector ? `2px solid rgba(255,255,255,0.62)` : "none",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={styles.heatLabel}>{sector}</div>
              <div style={styles.heatValue}>
                {avg >= 0 ? "+" : ""}
                {avg.toFixed(2)}%
              </div>
            </button>
          ))}
        </div>
      </Panel>

      <div style={{ marginTop: 20 }}>
        <Panel
          title={
            selectedSector === "All" ? "All groups performance" : `${selectedSector} performance`
          }
        >
          <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 12 }}>
            {activeSectorSummary.avg >= 0 ? "+" : ""}
            {activeSectorSummary.avg.toFixed(2)}% sector momentum
          </div>

          {visibleStocks.length ? (
            visibleStocks.slice(0, 8).map((s) => <MoverRow key={s.symbol} s={s} onOpen={onOpen} />)
          ) : (
            <div style={{ color: COLORS.textMuted, fontSize: 13 }}>No stocks in this group.</div>
          )}
        </Panel>
      </div>
    </div>
  );
}
