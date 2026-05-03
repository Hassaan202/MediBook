require("./src/config/env");
const http = require("http");
const mongoose = require("mongoose");
const { PORT } = require("./src/config/env");
const app = require("./src/app");
const { connectDB } = require("./src/config/database");
const { runAppointmentReminders } = require("./src/jobs/appointmentReminders");
const { runPrescriptionExpiry } = require("./src/jobs/prescriptionExpiry");

let server;
let reminderTimer;
let expiryTimer;

async function shutdown() {
  try {
    await mongoose.connection.close();
  } catch {
    process.exit(1);
  }
  if (server) {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  } else {
    process.exit(0);
  }
}

async function bootstrap() {
  await connectDB();
  server = http.createServer(app);
  server.listen(PORT);
  reminderTimer = setInterval(() => {
    runAppointmentReminders().catch(() => {});
  }, 60 * 60 * 1000);
  reminderTimer.unref();
  expiryTimer = setInterval(() => {
    runPrescriptionExpiry().catch(() => {});
  }, 24 * 60 * 60 * 1000);
  expiryTimer.unref();
  runAppointmentReminders().catch(() => {});
  runPrescriptionExpiry().catch(() => {});
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

process.on("uncaughtException", (err) => {
  process.stderr.write(`${err && err.stack ? err.stack : err}\n`);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  process.stderr.write(`${reason}\n`);
  process.exit(1);
});

bootstrap().catch((err) => {
  process.stderr.write(`${err && err.stack ? err.stack : err}\n`);
  process.exit(1);
});
