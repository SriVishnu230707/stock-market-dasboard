// ---------------------------------------------------------------------------
// The tick loop runs every 1.5s and touches every stock. Reading/writing
// Mongo at that frequency for every field would work but wastes round trips
// for data that's about to change again in 1.5s anyway. So the *current*
// price lives here, in memory, for the hot path; lib/market.js is
// responsible for flushing snapshots down to Mongo on a slower cadence
// (see Candle model). This cache is seeded from Mongo once at boot.
// ---------------------------------------------------------------------------

const HISTORY_LIMIT = 120;

const cache = new Map(); // symbol -> { symbol, name, sector, price, prevClose, history: [{t,p}] }

function initFromDocs(stockDocs) {
  cache.clear();
  const now = Date.now();
  for (const s of stockDocs) {
    cache.set(s.symbol, {
      symbol: s.symbol,
      name: s.name,
      sector: s.sector,
      price: s.price,
      prevClose: s.prevClose,
      history: s.history?.length
        ? s.history.slice(-HISTORY_LIMIT)
        : [{ t: now, p: s.price }],
    });
  }
}

function randomWalk(price, prevClose) {
  // Mean-reversion pull towards prevClose (0.15%), plus Brownian random shock (-0.35% to +0.35%)
  const meanReversion = prevClose ? (prevClose - price) * 0.0015 : 0;
  const shock = (Math.random() - 0.498) * price * 0.005;
  const next = price + meanReversion + shock;
  return Math.max(1, Number(next.toFixed(2)));
}

function tickAll() {
  const now = Date.now();
  for (const s of cache.values()) {
    s.price = randomWalk(s.price, s.prevClose);
    s.history.push({ t: now, p: s.price });
    if (s.history.length > HISTORY_LIMIT) s.history.shift();
  }
}

function applyLivePrices(entries) {
  const now = Date.now();
  for (const { symbol, price, prevClose } of entries) {
    const s = cache.get(symbol.toUpperCase());
    if (!s) continue;
    s.price = Number(price);
    if (Number.isFinite(prevClose)) s.prevClose = Number(prevClose);
    s.history.push({ t: now, p: s.price });
    if (s.history.length > HISTORY_LIMIT) s.history.shift();
  }
}

function pctChange(price, prev) {
  return ((price - prev) / prev) * 100;
}

function snapshot() {
  return [...cache.values()].map((s) => ({
    symbol: s.symbol,
    name: s.name,
    sector: s.sector,
    price: s.price,
    prevClose: s.prevClose,
    change: +pctChange(s.price, s.prevClose).toFixed(3),
    history: s.history,
  }));
}

function get(symbol) {
  return cache.get(symbol.toUpperCase());
}

function all() {
  return [...cache.values()];
}

module.exports = { initFromDocs, tickAll, applyLivePrices, snapshot, get, all, pctChange };
