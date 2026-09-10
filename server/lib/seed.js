const Stock = require("../models/Stock");

const SECTORS = ["Banking", "IT", "Energy", "Auto", "Pharma"];

const SEED_STOCKS = [
  { symbol: "RELIANCE", name: "Reliance Industries", sector: "Energy", price: 2845.2 },
  { symbol: "TCS", name: "Tata Consultancy", sector: "IT", price: 3421.0 },
  { symbol: "INFY", name: "Infosys", sector: "IT", price: 1520.4 },
  { symbol: "HDFCBANK", name: "HDFC Bank", sector: "Banking", price: 1740.6 },
  { symbol: "ICICIBANK", name: "ICICI Bank", sector: "Banking", price: 1310.1 },
  { symbol: "M&M", name: "Mahindra & Mahindra", sector: "Auto", price: 2980.0 },
  { symbol: "TATAMOTORS", name: "Tata Motors", sector: "Auto", price: 964.3 },
  { symbol: "SUNPHARMA", name: "Sun Pharma", sector: "Pharma", price: 1789.5 },
  { symbol: "SBIN", name: "State Bank of India", sector: "Banking", price: 882.4 },
  { symbol: "AXISBANK", name: "Axis Bank", sector: "Banking", price: 1120.7 },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", sector: "Banking", price: 1818.9 },
  { symbol: "BAJFINANCE", name: "Bajaj Finance", sector: "Finance", price: 7346.1 },
  { symbol: "HDFCLIFE", name: "HDFC Life", sector: "Insurance", price: 638.5 },
  { symbol: "LTIM", name: "LTIMindtree", sector: "IT", price: 5604.4 },
  { symbol: "WIPRO", name: "Wipro", sector: "IT", price: 456.8 },
  { symbol: "TECHM", name: "Tech Mahindra", sector: "IT", price: 1481.2 },
  { symbol: "TITAN", name: "Titan Company", sector: "Consumer", price: 3594.1 },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever", sector: "FMCG", price: 2235.7 },
  { symbol: "ITC", name: "ITC", sector: "FMCG", price: 470.9 },
  { symbol: "NESTLEIND", name: "Nestle India", sector: "FMCG", price: 2480.8 },
  { symbol: "ASIANPAINT", name: "Asian Paints", sector: "Consumer", price: 3112.3 },
  { symbol: "ULTRACEMCO", name: "UltraTech Cement", sector: "Cement", price: 11194.5 },
  { symbol: "LT", name: "Larsen & Toubro", sector: "Infrastructure", price: 3568.6 },
  { symbol: "NTPC", name: "NTPC", sector: "Energy", price: 374.2 },
  { symbol: "POWERGRID", name: "Power Grid", sector: "Energy", price: 303.6 },
  { symbol: "BHARTIARTL", name: "Bharti Airtel", sector: "Telecom", price: 1442.5 },
  { symbol: "INDUSINDBK", name: "IndusInd Bank", sector: "Banking", price: 1486.2 },
  { symbol: "CIPLA", name: "Cipla", sector: "Pharma", price: 1450.4 },
  { symbol: "DRREDDY", name: "Dr. Reddy's Labs", sector: "Pharma", price: 6592.2 },
  { symbol: "APOLLOHOSP", name: "Apollo Hospitals", sector: "Healthcare", price: 5982.9 },
  { symbol: "SHRIRAMFIN", name: "Shriram Finance", sector: "Finance", price: 2476.4 },
  { symbol: "BHEL", name: "Bharat Heavy Electricals", sector: "Energy", price: 256.4 },
  { symbol: "IOC", name: "Indian Oil", sector: "Energy", price: 150.2 },
  { symbol: "MARUTI", name: "Maruti Suzuki", sector: "Auto", price: 12378.0 },
  { symbol: "HEROMOTOCO", name: "Hero MotoCorp", sector: "Auto", price: 4668.7 },
];

// Idempotent: safe to call on every server boot. Only inserts stocks that
// don't already exist, so restarting the server never resets live prices.
async function seedStocksIfNeeded() {
  const existing = await Stock.find(
    { symbol: { $in: SEED_STOCKS.map((s) => s.symbol) } },
    { symbol: 1 }
  ).lean();
  const existingSet = new Set(existing.map((s) => s.symbol));
  const missing = SEED_STOCKS.filter((stock) => !existingSet.has(stock.symbol));

  if (!missing.length) {
    console.log(`[seed] all ${SEED_STOCKS.length} stocks already present`);
    return;
  }

  await Stock.insertMany(
    missing.map((s) => ({
      ...s,
      prevClose: s.price,
      history: [{ t: 0, p: s.price }],
    }))
  );
  console.log(`[seed] inserted ${missing.length} stocks`);
}

module.exports = { seedStocksIfNeeded, SEED_STOCKS, SECTORS };

// Allow `npm run seed` to run this file directly against MONGO_URI without
// starting the whole server.
if (require.main === module) {
  require("dotenv").config();
  const { connectMongo } = require("./mongo");
  connectMongo()
    .then(seedStocksIfNeeded)
    .then(() => {
      console.log("[seed] done");
      process.exit(0);
    })
    .catch((err) => {
      console.error("[seed] failed", err);
      process.exit(1);
    });
}
