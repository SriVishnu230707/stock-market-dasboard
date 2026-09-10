require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const { connectMongo } = require("./lib/mongo");
const { seedStocksIfNeeded } = require("./lib/seed");
const { socketAuth } = require("./lib/auth");
const priceCache = require("./lib/priceCache");
const alertIndex = require("./lib/alertIndex");
const { startMarketFeed } = require("./lib/market");

const Stock = require("./models/Stock");
const Alert = require("./models/Alert");

const authRoutes = require("./routes/authRoutes");
const stockRoutes = require("./routes/stockRoutes");
const watchlistRoutes = require("./routes/watchlistRoutes");
const alertRoutes = require("./routes/alertRoutes");
const portfolioRoutes = require("./routes/portfolioRoutes");

const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = (process.env.CLIENT_ORIGIN || "http://localhost:5173").split(",");

async function main() {
  await connectMongo();
  await seedStocksIfNeeded();

  // Warm the in-memory caches from Mongo once at boot. From here on, the
  // tick loop and alert engine work off these caches — see lib/market.js.
  priceCache.initFromDocs(await Stock.find());
  alertIndex.initFromDocs(await Alert.find({ status: "active" }));

  const app = express();
  app.use(cors({ origin: CLIENT_ORIGIN }));
  app.use(express.json());

  app.get("/api/health", (req, res) => res.json({ ok: true, stocks: priceCache.all().length }));
  app.use("/api/auth", authRoutes);
  app.use("/api/stocks", stockRoutes);
  app.use("/api/watchlist", watchlistRoutes);
  app.use("/api/alerts", alertRoutes);
  app.use("/api/portfolio", portfolioRoutes);

  const httpServer = http.createServer(app);
  const io = new Server(httpServer, { cors: { origin: CLIENT_ORIGIN } });

  io.use(socketAuth);
  io.on("connection", (socket) => {
    // Everyone gets the market tape; only this user's own alerts land in
    // their private room. This is the "one feed, fanned out" architecture
    // from the write-up, done with Socket.IO rooms.
    socket.join("market");
    socket.join(`user:${socket.user.sub}`);
    socket.emit("tick", priceCache.snapshot()); // immediate snapshot on connect

    socket.on("disconnect", () => {});
  });

  startMarketFeed(io);

  httpServer.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("[server] failed to start", err);
  process.exit(1);
});
