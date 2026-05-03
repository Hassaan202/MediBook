const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  action: {
    type: String,
    required: true,
    trim: true,
  },
  entity: {
    type: String,
    enum: [
      "user",
      "appointment",
      "prescription",
      "medical_record",
      "system",
    ],
    default: null,
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  changes: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  ipAddress: {
    type: String,
    default: null,
  },
  userAgent: {
    type: String,
    default: null,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

activityLogSchema.index({ userId: 1, timestamp: -1 });
activityLogSchema.index({ entity: 1, timestamp: -1 });

/**
 * Get activity for a specific user over the last N days.
 * @param {mongoose.Types.ObjectId|string} userId
 * @param {number} days
 * @returns {Promise<object[]>}
 */
activityLogSchema.statics.getUserActivity = async function getUserActivity(
  userId,
  days = 30
) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return this.find({ userId, timestamp: { $gte: since } })
    .sort({ timestamp: -1 })
    .lean();
};

/**
 * Get all system activity over the last N days.
 * @param {number} days
 * @returns {Promise<object[]>}
 */
activityLogSchema.statics.getSystemActivity = async function getSystemActivity(
  days = 7
) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return this.find({ timestamp: { $gte: since } })
    .sort({ timestamp: -1 })
    .populate({ path: "userId", select: "name email role" })
    .lean();
};

/**
 * Get history for a specific entity instance.
 * @param {string} entity
 * @param {mongoose.Types.ObjectId|string} entityId
 * @returns {Promise<object[]>}
 */
activityLogSchema.statics.getEntityHistory =
  async function getEntityHistory(entity, entityId) {
    return this.find({ entity, entityId })
      .sort({ timestamp: -1 })
      .populate({ path: "userId", select: "name email" })
      .lean();
  };

const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);

module.exports = ActivityLog;
