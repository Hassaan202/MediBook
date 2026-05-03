const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

function requireEnv(name) {
  const value = process.env[name];
  if (!value || String(value).trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const PORT = parseInt(process.env.PORT || "5000", 10);
const MONGODB_URI = requireEnv("MONGODB_URI");
const JWT_SECRET = requireEnv("JWT_SECRET");
const JWT_REFRESH_SECRET = requireEnv("JWT_REFRESH_SECRET");
const JWT_EXPIRE = process.env.JWT_EXPIRE || "15m";
const JWT_REFRESH_EXPIRE = process.env.JWT_REFRESH_EXPIRE || "7d";
const NODE_ENV = process.env.NODE_ENV || "development";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

module.exports = {
  PORT,
  MONGODB_URI,
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  JWT_EXPIRE,
  JWT_REFRESH_EXPIRE,
  NODE_ENV,
  CORS_ORIGIN,
};
