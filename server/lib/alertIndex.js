// ---------------------------------------------------------------------------
// Alerts grouped by symbol, mirroring the "RELIANCE channel -> subscribers"
// idea from the project write-up. On every tick, lib/market.js only needs
// to look up the handful of alerts for the symbol that just moved, instead
// of scanning every alert in the database for every one of the 8 stocks,
// every 1.5 seconds.
// ---------------------------------------------------------------------------

const bySymbol = new Map(); // symbol -> Map<alertId, { alertId, userId, direction, target }>

function initFromDocs(alertDocs) {
  bySymbol.clear();
  for (const a of alertDocs) {
    if (a.status !== "active") continue;
    add(a.symbol, a._id.toString(), a.user.toString(), a.direction, a.target);
  }
}

function add(symbol, alertId, userId, direction, target) {
  const key = symbol.toUpperCase();
  if (!bySymbol.has(key)) bySymbol.set(key, new Map());
  bySymbol.get(key).set(alertId, { alertId, userId, direction, target });
}

function remove(symbol, alertId) {
  bySymbol.get(symbol.toUpperCase())?.delete(alertId);
}

// Returns the alerts for `symbol` that `price` just crossed, and removes
// them from the index (they're one-shot: once triggered, they're done).
function evaluate(symbol, price) {
  const key = symbol.toUpperCase();
  const bucket = bySymbol.get(key);
  if (!bucket || bucket.size === 0) return [];

  const fired = [];
  for (const entry of bucket.values()) {
    const crossed = entry.direction === "above" ? price >= entry.target : price <= entry.target;
    if (crossed) fired.push(entry);
  }
  for (const f of fired) bucket.delete(f.alertId);
  return fired;
}

module.exports = { initFromDocs, add, remove, evaluate };
