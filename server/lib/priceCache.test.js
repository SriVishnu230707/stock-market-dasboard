const test = require("node:test");
const assert = require("node:assert/strict");

const priceCache = require("./priceCache");

test("priceCache initializes from docs and provides real timestamps", () => {
  priceCache.initFromDocs([
    {
      symbol: "TEST",
      name: "Test Stock",
      sector: "Tech",
      price: 150,
      prevClose: 145,
      history: [{ t: Date.now() - 5000, p: 148 }],
    },
  ]);

  const stock = priceCache.get("TEST");
  assert.equal(stock.symbol, "TEST");
  assert.equal(stock.price, 150);
  assert.equal(stock.history.length, 1);

  priceCache.tickAll();
  const ticked = priceCache.get("TEST");
  assert.equal(ticked.history.length, 2);
  assert(typeof ticked.history[1].t === "number");
  assert(ticked.history[1].t > 100000000);
});

test("priceCache snapshot calculates percentage change correctly", () => {
  priceCache.initFromDocs([
    {
      symbol: "AAPL",
      name: "Apple",
      sector: "Tech",
      price: 200,
      prevClose: 100,
    },
  ]);

  const snapshot = priceCache.snapshot();
  assert.equal(snapshot.length, 1);
  assert.equal(snapshot[0].change, 100);
});
