const mongoose = require("mongoose");

let mongoServer = null;

async function connectMongo() {
  const configuredUri = process.env.MONGO_URI || "";

  // Try the configured URI first (Atlas or local mongod).
  if (configuredUri && !configuredUri.includes("REPLACE_WITH")) {
    try {
      mongoose.set("strictQuery", true);
      await mongoose.connect(configuredUri, { serverSelectionTimeoutMS: 5000 });
      console.log(`[mongo] connected -> ${configuredUri}`);
      return;
    } catch (err) {
      console.warn(`[mongo] could not connect to ${configuredUri}: ${err.message}`);
      console.warn("[mongo] falling back to in-memory MongoDB...");
    }
  }

  // Fallback: spin up an in-memory MongoDB instance via mongodb-memory-server.
  // This downloads a mongod binary on first run (~100 MB) and keeps it cached
  // for subsequent starts. Data lives only in RAM — perfect for development
  // and demos, but it won't survive a server restart.
  try {
    const { MongoMemoryServer } = require("mongodb-memory-server");
    mongoServer = await MongoMemoryServer.create();
    const memUri = mongoServer.getUri();
    mongoose.set("strictQuery", true);
    await mongoose.connect(memUri, { serverSelectionTimeoutMS: 5000 });
    console.log(`[mongo] connected -> in-memory MongoDB (${memUri})`);
    console.log(
      "[mongo] NOTE: data is ephemeral — it will be lost when the server stops."
    );
  } catch (err) {
    console.error("[mongo] in-memory MongoDB failed to start:", err.message);
    console.error(
      "[mongo] install it with: npm install mongodb-memory-server\n" +
        "        or set MONGO_URI in server/.env to an Atlas connection string."
    );
    throw err;
  }
}

// Clean shutdown: stop the in-memory server if we started one.
async function disconnectMongo() {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
}

module.exports = { connectMongo, disconnectMongo };
