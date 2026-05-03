const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const { CORS_ORIGIN } = require("./config/env");
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
const auditLogsRoutes = require("./routes/auditLogs.routes");
const {
  notFoundHandler,
  validationErrorHandler,
  globalErrorHandler,
} = require("./middleware/errorHandler");

const app = express();

app.set("trust proxy", 1);

app.use(helmet());
app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true,
  })
);
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(requestLogger);
app.use(sanitizeInput);

app.use(
  "/uploads",
  express.static(path.join(__dirname, "../uploads"))
);

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/doctors", doctorsRoutes);
app.use("/api/patients", patientsRoutes);
app.use("/api/appointments", appointmentsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/medical-records", medicalRecordsRoutes);
app.use("/api/prescriptions", prescriptionsRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/audit-logs", auditLogsRoutes);

app.use(notFoundHandler);
app.use(validationErrorHandler);
app.use(globalErrorHandler);

module.exports = app;
