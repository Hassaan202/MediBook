const mongoose = require("mongoose");

const relatedResourceSchema = new mongoose.Schema(
  {
    resourceType: {
      type: String,
      enum: ["appointment", "prescription", "medical_record", "system"],
    },
    resourceId: { type: mongoose.Schema.Types.ObjectId },
  },
  { _id: false }
);

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "appointment_reminder",
        "appointment_confirmed",
        "appointment_cancelled",
        "prescription_ready",
        "lab_results_available",
        "system_announcement",
      ],
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    relatedResource: { type: relatedResourceSchema, default: undefined },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
    },
    deliveryMethod: {
      type: [String],
      default: ["in-app"],
      validate: {
        validator(arr) {
          const allowed = ["in-app", "email", "sms"];
          return Array.isArray(arr) && arr.every((x) => allowed.includes(x));
        },
      },
    },
    sentAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

notificationSchema.methods.markAsRead = async function markAsReadMethod() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

notificationSchema.statics.getUnreadCount = async function getUnreadCountStatic(
  userId
) {
  return this.countDocuments({ userId, isRead: false });
};

notificationSchema.statics.deleteExpired = async function deleteExpiredStatic() {
  const now = new Date();
  return this.deleteMany({ expiresAt: { $ne: null, $lt: now } });
};

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
