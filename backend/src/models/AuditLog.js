const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "login",
        "logout",
        "user_created",
        "user_updated",
        "user_deleted",
        "password_changed",
        "profile_updated",
        "appointment_created",
        "appointment_updated",
        "appointment_cancelled",
        "medical_record_created",
        "medical_record_updated",
        "medical_record_viewed",
        "prescription_created",
        "prescription_updated",
        "review_created",
        "review_updated",
      ],
    },
    category: {
      type: String,
      required: true,
      enum: ["auth", "data", "admin", "clinical", "system"],
    },
    description: { type: String, required: true },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    resourceType: {
      type: String,
      enum: [
        "user",
        "appointment",
        "prescription",
        "medical_record",
        "payment",
        "system",
      ],
      default: null,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
    severity: {
      type: String,
      enum: ["info", "warning", "error", "critical"],
      default: "info",
    },
    timestamp: { type: Date, required: true, default: Date.now },
  },
  { timestamps: false }
);

auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ category: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ severity: 1, timestamp: -1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

module.exports = AuditLog;
