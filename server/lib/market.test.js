const test = require("node:test");
const assert = require("node:assert/strict");

const market = require("./market");

test("defaults to simulated market data unless a real provider is configured", () => {
  const config = market.resolveMarketDataConfig({
    MARKET_DATA_PROVIDER: "",
    MARKET_DATA_API_KEY: "",
  });

  assert.equal(config.provider, "simulated");
  assert.equal(config.apiKey, "");
});

test("accepts a configured finnhub provider with an API key", () => {
  const config = market.resolveMarketDataConfig({
    MARKET_DATA_PROVIDER: "finnhub",
    MARKET_DATA_API_KEY: "demo-key",
  });

  assert.equal(config.provider, "finnhub");
  assert.equal(config.apiKey, "demo-key");
});

test("normalizes symbols for provider requests", () => {
  assert.equal(market.normalizeTickerForProvider("reliance", "yahoo"), "RELIANCE.NS");
  assert.equal(market.normalizeTickerForProvider("reliance.ns", "yahoo"), "RELIANCE.NS");
  assert.equal(market.normalizeTickerForProvider("AAPL", "finnhub"), "AAPL");
});
