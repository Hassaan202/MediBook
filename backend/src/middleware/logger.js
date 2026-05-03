const morgan = require("morgan");
const { NODE_ENV } = require("../config/env");
const AuditLog = require("../models/AuditLog");

const requestLogger = morgan(NODE_ENV === "production" ? "combined" : "dev");

async function auditLogger(payload) {
  const doc = {
    userId: payload.userId,
    action: payload.action,
    category: payload.category,
    description: payload.description,
    details: payload.details || {},
    resourceType: payload.resourceType,
    resourceId: payload.resourceId,
    ipAddress: payload.ipAddress || null,
    userAgent: payload.userAgent || null,
    severity: payload.severity || "info",
    timestamp: payload.timestamp || new Date(),
  };
  if (doc.resourceType == null) {
    delete doc.resourceType;
  }
  if (doc.resourceId == null) {
    delete doc.resourceId;
  }
  await AuditLog.create(doc);
}

module.exports = { requestLogger, auditLogger };
