import React, { useState, useEffect } from "react";
import { Newspaper, TrendingUp, TrendingDown, Minus, Clock, ExternalLink } from "lucide-react";
import { styles, COLORS } from "../styles.js";
import { Panel } from "./ui.jsx";
import { api } from "../api.js";

const CATEGORIES = ["ALL", "TECH", "MACRO", "AUTO", "ENERGY", "CONSUMER"];

export default function MarketNews({ onOpenStock }) {
  const [news, setNews] = useState([]);
  const [selectedCat, setSelectedCat] = useState("ALL");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .getNews(selectedCat === "ALL" ? "" : selectedCat)
      .then((data) => {
        if (active) setNews(data || []);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedCat]);

  const bullishCount = news.filter((n) => n.sentiment === "bullish").length;
  const bearishCount = news.filter((n) => n.sentiment === "bearish").length;
  const sentimentScore = news.length
    ? Math.round((bullishCount / news.length) * 100)
    : 50;

  return (
    <Panel
      title={
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Newspaper size={16} color={COLORS.accent} />
            <span>Market Intelligence & Sentiment Feed</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11.5, color: COLORS.textMuted }}>Market Mood:</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 6,
                background:
                  sentimentScore >= 60
                    ? "rgba(53,215,165,0.15)"
                    : sentimentScore <= 40
                      ? "rgba(255,107,125,0.15)"
                      : "rgba(122,162,255,0.15)",
                color:
                  sentimentScore >= 60
                    ? COLORS.gain
                    : sentimentScore <= 40
                      ? COLORS.loss
                      : COLORS.accent,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {sentimentScore >= 60 ? (
                <TrendingUp size={12} />
              ) : sentimentScore <= 40 ? (
                <TrendingDown size={12} />
              ) : (
                <Minus size={12} />
              )}
              {sentimentScore >= 60
                ? `Bullish (${sentimentScore}%)`
                : sentimentScore <= 40
                  ? `Bearish (${100 - sentimentScore}%)`
                  : `Neutral`}
            </span>
          </div>
        </div>
      }
      style={{ marginTop: 20 }}
    >
      {/* Category filter pills */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCat(cat)}
            style={{
              background: selectedCat === cat ? "rgba(122,162,255,0.18)" : "transparent",
              border: `1px solid ${selectedCat === cat ? COLORS.accent : "rgba(148,163,184,0.16)"}`,
              color: selectedCat === cat ? COLORS.text : COLORS.textMuted,
              borderRadius: 8,
              padding: "4px 10px",
              fontSize: 11.5,
              fontWeight: selectedCat === cat ? 600 : 400,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: "20px 0", color: COLORS.textMuted, fontSize: 13, textAlign: "center" }}>
          Aggregating latest market wires…
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
          {news.map((item) => (
            <div
              key={item.id}
              style={{
                background: "rgba(15, 23, 42, 0.65)",
                border: `1px solid ${COLORS.border}`,
                borderRadius: 14,
                padding: "14px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: 10,
                transition: "transform 0.18s ease, border-color 0.18s ease",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: COLORS.accent2, fontWeight: 600 }}>{item.source}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 10.5, color: COLORS.textMuted, display: "flex", alignItems: "center", gap: 3 }}>
                      <Clock size={11} /> {item.timeAgo}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: 4,
                        textTransform: "uppercase",
                        background:
                          item.sentiment === "bullish"
                            ? "rgba(53,215,165,0.15)"
                            : item.sentiment === "bearish"
                              ? "rgba(255,107,125,0.15)"
                              : "rgba(148,163,184,0.12)",
                        color:
                          item.sentiment === "bullish"
                            ? COLORS.gain
                            : item.sentiment === "bearish"
                              ? COLORS.loss
                              : COLORS.textMuted,
                      }}
                    >
                      {item.sentiment}
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.text, lineHeight: 1.4, marginBottom: 6 }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.4 }}>
                  {item.summary}
                </div>
              </div>

              {/* Related symbol chips */}
              {item.relatedSymbols?.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, paddingTop: 8, borderTop: `1px solid ${COLORS.border}` }}>
                  <span style={{ fontSize: 11, color: COLORS.textMuted }}>Mentioned:</span>
                  {item.relatedSymbols.map((sym) => (
                    <button
                      key={sym}
                      onClick={() => onOpenStock && onOpenStock(sym)}
                      style={{
                        background: "rgba(122,162,255,0.1)",
                        border: `1px solid ${COLORS.border}`,
                        color: COLORS.accent,
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 7px",
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                      title={`Open ${sym} chart`}
                    >
                      ${sym}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
