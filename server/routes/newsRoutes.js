const express = require("express");
const { requireAuth } = require("../lib/auth");

const router = express.Router();

const MARKET_NEWS = [
  {
    id: "n1",
    title: "AI Chip Demand Surges as Big Tech Accelerates Hyperscale Infrastructure",
    source: "Bloomberg Markets",
    timeAgo: "8m ago",
    category: "TECH",
    sentiment: "bullish",
    score: 0.88,
    summary: "Record orders for next-generation accelerators indicate sustained double-digit datacenter capex through 2027.",
    relatedSymbols: ["NVDA", "MSFT", "GOOGL"],
  },
  {
    id: "n2",
    title: "Fed Minutes Signal Flexible Rate Path Amid Resilient Employment Data",
    source: "Reuters Financial",
    timeAgo: "22m ago",
    category: "MACRO",
    sentiment: "neutral",
    score: 0.12,
    summary: "Central bank officials emphasize data dependence as core inflation moderates toward target ranges.",
    relatedSymbols: ["JPM", "BAC"],
  },
  {
    id: "n3",
    title: "Electric Vehicle Deliveries Beat Wall Street Consensus in Global Markets",
    source: "Wall Street Journal",
    timeAgo: "41m ago",
    category: "AUTO",
    sentiment: "bullish",
    score: 0.74,
    summary: "Quarterly production volume rebounds with strong adoption across European and Asian consumer segments.",
    relatedSymbols: ["TSLA"],
  },
  {
    id: "n4",
    title: "Global Cloud Spending Expected to Cross $800B Benchmark by Year-End",
    source: "Financial Times",
    timeAgo: "1h ago",
    category: "ENTERPRISE",
    sentiment: "bullish",
    score: 0.81,
    summary: "Enterprise workload migrations to multi-cloud platforms continue to drive recurring revenue expansion.",
    relatedSymbols: ["AMZN", "MSFT", "ORCL"],
  },
  {
    id: "n5",
    title: "Crude Oil Inventory Rebounds as Refinery Run Rates Normalize",
    source: "Energy Intelligence",
    timeAgo: "2h ago",
    category: "ENERGY",
    sentiment: "bearish",
    score: -0.42,
    summary: "Commercial stockpile builds limit prompt crack spreads, keeping benchmark futures in a tight trading channel.",
    relatedSymbols: ["XOM", "CVX"],
  },
  {
    id: "n6",
    title: "Consumer Discretionary Spending Remains Sturdy Across Retail Superstores",
    source: "CNBC Pro",
    timeAgo: "3h ago",
    category: "CONSUMER",
    sentiment: "neutral",
    score: 0.15,
    summary: "E-commerce order volume and basket size offset cautious sentiment around discretionary apparel.",
    relatedSymbols: ["COST", "WMT", "NKE"],
  },
];

router.get("/", requireAuth, (req, res) => {
  const category = (req.query.category || "").toUpperCase();
  if (category && category !== "ALL") {
    return res.json(MARKET_NEWS.filter((n) => n.category === category));
  }
  res.json(MARKET_NEWS);
});

module.exports = router;
