const mongoose = require("mongoose");

async function connectMongo() {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/stockdash";
  mongoose.set("strictQuery", true);
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log(`[mongo] connected -> ${uri}`);
  } catch (err) {
    console.error(`[mongo] could not connect to ${uri}`);
    console.error(
      "[mongo] make sure MongoDB is running locally, or set MONGO_URI in .env to an Atlas connection string."
    );
    throw err;
  }
}

module.exports = { connectMongo };
