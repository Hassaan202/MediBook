const mongoose = require("mongoose");
const { MONGODB_URI, NODE_ENV } = require("./env");

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectDB() {
  mongoose.set("strictQuery", true);

  let attempt = 0;
  let lastError;

  while (attempt < MAX_RETRIES) {
    try {
      await mongoose.connect(MONGODB_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10000,
      });
      if (NODE_ENV !== "production") {
        mongoose.set("debug", false);
      }
      return mongoose.connection;
    } catch (err) {
      lastError = err;
      attempt += 1;
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS);
      }
    }
  }

  throw lastError;
}

module.exports = { connectDB, mongoose };
