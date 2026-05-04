const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const { CORS_ORIGIN, RATE_LIMITING_ENABLED } = require("./config/env");
const { requestLogger } = require("./middleware/logger");
const { sanitizeInput } = require("./middleware/validation");
const authRoutes = require("./routes/auth.routes");
const usersRoutes = require("./routes/users.routes");
const doctorsRoutes = require("./routes/doctors.routes");
const patientsRoutes = require("./routes/patients.routes");
const appointmentsRoutes = require("./routes/appointments.routes");
const notificationsRoutes = require("./routes/notifications.routes");
const medicalRecordsRoutes = require("./routes/medicalRecords.routes");
const prescriptionsRoutes = require("./routes/prescriptions.routes");
const reviewsRoutes = require("./routes/reviews.routes");
const adminRoutes = require("./routes/admin.routes");
const analyticsRoutes = require("./routes/analytics.routes");
const systemConfigRoutes = require("./routes/systemConfig.routes");
const {
  notFoundHandler,
  validationErrorHandler,
  globalErrorHandler,
} = require("./middleware/errorHandler");

const app = express();

app.set("trust proxy", 1);

// ─── Rate Limiting ─────────────────────────────────────────────────────────────

// General API rate limit: 100 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests from this IP, please try again later." },
  skip: () => !RATE_LIMITING_ENABLED,
});

// Login/register limits are applied on specific routes in `auth.routes.js` (avoid double-limiting).

// ─── Core Middleware ──────────────────────────────────────────────────────────

app.use(helmet());

// Support comma-separated origins in CORS_ORIGIN env var
const allowedOrigins = CORS_ORIGIN.split(",").map((o) => o.trim());
app.use(
  cors({
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(requestLogger);
app.use(sanitizeInput);

// ─── Static Uploads ───────────────────────────────────────────────────────────

app.use(
  "/uploads",
  express.static(path.join(__dirname, "../uploads"))
);

// ─── Apply Rate Limiting ──────────────────────────────────────────────────────

app.use("/api/", apiLimiter);

// ─── API Routes ───────────────────────────────────────────────────────────────

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/doctors", doctorsRoutes);
app.use("/api/patients", patientsRoutes);
app.use("/api/appointments", appointmentsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/medical-records", medicalRecordsRoutes);
app.use("/api/prescriptions", prescriptionsRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/system-config", systemConfigRoutes);

// ─── Error Handlers ───────────────────────────────────────────────────────────

app.use(notFoundHandler);
app.use(validationErrorHandler);
app.use(globalErrorHandler);

module.exports = app;
