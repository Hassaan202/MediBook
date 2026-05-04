const path = require("path");
const dotenv = require("dotenv");

// Repo root .env (e.g. MediBook/.env), then backend/.env — latter wins for duplicate keys.
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env"), override: true });

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
/** Off in non-production so local dev is not blocked by express-rate-limit; on in production unless opted out. */
const RATE_LIMITING_ENABLED =
  NODE_ENV === "production" &&
  String(process.env.API_RATE_LIMIT_DISABLED || "").toLowerCase() !== "true";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";
const FRONTEND_URL = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");

/** Mailtrap (or any SMTP) — optional; if unset, verification links are logged in development. */
const MAIL_HOST = process.env.MAIL_HOST || "sandbox.smtp.mailtrap.io";
const MAIL_PORT = parseInt(process.env.MAIL_PORT || "2525", 10);
const MAIL_USER = process.env.MAIL_USER || "";
const MAIL_PASS = process.env.MAIL_PASS || "";
const MAIL_FROM = process.env.MAIL_FROM || "MediBook <no-reply@medibook.local>";

module.exports = {
  PORT,
  MONGODB_URI,
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  JWT_EXPIRE,
  JWT_REFRESH_EXPIRE,
  NODE_ENV,
  RATE_LIMITING_ENABLED,
  CORS_ORIGIN,
  FRONTEND_URL,
  MAIL_HOST,
  MAIL_PORT,
  MAIL_USER,
  MAIL_PASS,
  MAIL_FROM,
};
