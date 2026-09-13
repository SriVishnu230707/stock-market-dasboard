const Stock = require("../models/Stock");
const Candle = require("../models/Candle");

const SECTORS = ["Banking", "IT", "Energy", "Auto", "Pharma"];

const SEED_STOCKS = [
  { symbol: "AAPL", name: "Apple", sector: "Technology", price: 214.2 },
  { symbol: "MSFT", name: "Microsoft", sector: "Technology", price: 426.8 },
  { symbol: "AMZN", name: "Amazon", sector: "Consumer", price: 186.7 },
  { symbol: "NVDA", name: "NVIDIA", sector: "Technology", price: 117.5 },
  { symbol: "GOOGL", name: "Alphabet", sector: "Technology", price: 174.4 },
  { symbol: "META", name: "Meta", sector: "Technology", price: 513.6 },
  { symbol: "TSLA", name: "Tesla", sector: "Automotive", price: 227.1 },
  { symbol: "NFLX", name: "Netflix", sector: "Media", price: 661.3 },
  { symbol: "AMD", name: "AMD", sector: "Technology", price: 164.8 },
  { symbol: "ORCL", name: "Oracle", sector: "Technology", price: 155.5 },
  { symbol: "CRM", name: "Salesforce", sector: "Technology", price: 252.0 },
  { symbol: "AVGO", name: "Broadcom", sector: "Technology", price: 181.9 },
  { symbol: "SHOP", name: "Shopify", sector: "Technology", price: 58.6 },
  { symbol: "PYPL", name: "PayPal", sector: "Fintech", price: 74.4 },
  { symbol: "ADBE", name: "Adobe", sector: "Technology", price: 498.2 },
  { symbol: "PINS", name: "Pinterest", sector: "Internet", price: 31.6 },
  { symbol: "SNAP", name: "Snap", sector: "Internet", price: 15.9 },
  { symbol: "DIS", name: "Disney", sector: "Media", price: 94.1 },
  { symbol: "NKE", name: "Nike", sector: "Consumer", price: 91.7 },
  { symbol: "COST", name: "Costco", sector: "Consumer", price: 844.5 },
  { symbol: "WMT", name: "Walmart", sector: "Retail", price: 70.6 },
  { symbol: "JPM", name: "JPMorgan Chase", sector: "Banking", price: 207.4 },
  { symbol: "XOM", name: "Exxon Mobil", sector: "Energy", price: 114.6 },
  { symbol: "CVX", name: "Chevron", sector: "Energy", price: 146.9 },
  { symbol: "UNH", name: "UnitedHealth", sector: "Healthcare", price: 510.5 },
  { symbol: "PFE", name: "Pfizer", sector: "Healthcare", price: 28.7 },
  { symbol: "ABBV", name: "AbbVie", sector: "Healthcare", price: 175.6 },
  { symbol: "TXN", name: "Texas Instruments", sector: "Technology", price: 190.8 },
  { symbol: "TMUS", name: "T-Mobile", sector: "Telecom", price: 175.2 },
  { symbol: "V", name: "Visa", sector: "Fintech", price: 280.1 },
  { symbol: "MA", name: "Mastercard", sector: "Fintech", price: 510.2 },
  { symbol: "BAC", name: "Bank of America", sector: "Banking", price: 41.2 },
  { symbol: "CAT", name: "Caterpillar", sector: "Industrials", price: 340.8 },
  { symbol: "HD", name: "Home Depot", sector: "Retail", price: 355.8 },
  { symbol: "KO", name: "Coca-Cola", sector: "Consumer", price: 64.0 },
  { symbol: "INTC", name: "Intel", sector: "Technology", price: 21.7 },
  { symbol: "IBM", name: "IBM", sector: "Technology", price: 164.3 },
];

// Idempotent: safe to call on every server boot. Only inserts stocks that
// don't already exist, so restarting the server never resets live prices.
async function seedStocksIfNeeded() {
  const existing = await Stock.find(
    {},
    { symbol: 1, name: 1, sector: 1, price: 1, prevClose: 1, history: 1 }
  ).lean();
  const targetMap = new Map(SEED_STOCKS.map((s) => [s.symbol, s]));
  const staleSymbols = existing
    .filter((doc) => !targetMap.has(doc.symbol))
    .map((doc) => doc.symbol);
  const missing = SEED_STOCKS.filter(
    (stock) => !existing.some((doc) => doc.symbol === stock.symbol)
  );

  const updates = [];
  for (const stock of SEED_STOCKS) {
    const current = existing.find((doc) => doc.symbol === stock.symbol);
    if (!current) continue;

    const needsUpdate =
      current.name !== stock.name ||
      current.sector !== stock.sector ||
      Number(current.price) !== Number(stock.price);

    if (needsUpdate) {
      updates.push(
        Stock.updateOne(
          { symbol: stock.symbol },
          {
            $set: {
              name: stock.name,
              sector: stock.sector,
              price: Number(stock.price),
              prevClose: Number.isFinite(Number(current.prevClose))
                ? Number(current.prevClose)
                : Number(stock.price),
              history: current.history?.length
                ? current.history.slice(-120)
                : [{ t: 0, p: Number(stock.price) }],
            },
          }
        )
      );
    }
  }

  if (staleSymbols.length) {
    await Stock.deleteMany({ symbol: { $in: staleSymbols } });
  }

  if (missing.length) {
    await Stock.insertMany(
      missing.map((s) => ({
        ...s,
        prevClose: s.price,
        history: [{ t: 0, p: s.price }],
      }))
    );
  }

  if (updates.length) {
    await Promise.all(updates);
  }

  await seedCandlesIfNeeded();

  const finalCount = await Stock.countDocuments();
  console.log(
    `[seed] synced ${finalCount} stocks (${missing.length} inserted, ${staleSymbols.length} removed, ${updates.length} updated)`
  );
}

async function seedCandlesIfNeeded() {
  const count = await Candle.countDocuments();
  if (count >= 100) return;

  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const candleDocs = [];

  for (const stock of SEED_STOCKS) {
    let currentPrice = Number(stock.price);
    const points = 180;
    for (let d = points; d >= 0; d--) {
      const bucketStart = new Date(now - d * ONE_DAY_MS);
      const dayVariance = (Math.random() - 0.495) * 0.025 * currentPrice;
      const open = Number(Math.max(1, currentPrice - dayVariance * 0.5).toFixed(2));
      const close = Number(Math.max(1, currentPrice + dayVariance * 0.5).toFixed(2));
      const high = Number((Math.max(open, close) + Math.random() * 0.015 * currentPrice).toFixed(2));
      const low = Number(Math.max(0.5, Math.min(open, close) - Math.random() * 0.015 * currentPrice).toFixed(2));
      currentPrice = close;

      candleDocs.push({
        symbol: stock.symbol,
        open,
        high,
        low,
        close,
        volumeTicks: Math.floor(200 + Math.random() * 1500),
        bucketStart,
      });
    }
  }

  if (candleDocs.length) {
    await Candle.insertMany(candleDocs);
    console.log(`[seed] inserted ${candleDocs.length} historical candles for analytics`);
  }
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
