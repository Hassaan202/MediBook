const mongoose = require("mongoose");

/**
 * SystemConfig Schema
 * Stores all the dynamic settings for the application (e.g. max appointments, cancellation windows).
 * Useful for changing application behavior without deploying new code.
 */
const systemConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      enum: ["general", "appointment", "notification", "payment", "security"],
      required: true,
    },
    isEditable: {
      type: Boolean,
      default: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

systemConfigSchema.index({ category: 1 });

/**
 * Get a single config value by key.
 * @param {string} key
 * @returns {Promise<*>} The value, or null if not found.
 */
systemConfigSchema.statics.getConfig = async function getConfig(key) {
  const doc = await this.findOne({ key }).lean();
  return doc ? doc.value : null;
};

/**
 * Update a config value by key.
 * @param {string} key
 * @param {*} value
 * @param {mongoose.Types.ObjectId} userId
 * @returns {Promise<object>}
 */
systemConfigSchema.statics.updateConfig = async function updateConfig(
  key,
  value,
  userId
) {
  const doc = await this.findOneAndUpdate(
    { key },
    { $set: { value, updatedBy: userId } },
    { new: true, runValidators: true }
  );
  return doc;
};

/**
 * Get all configs in a given category.
 * @param {string} category
 * @returns {Promise<object[]>}
 */
systemConfigSchema.statics.getByCategory = async function getByCategory(
  category
) {
  return this.find({ category }).lean();
};

const SystemConfig = mongoose.model("SystemConfig", systemConfigSchema);

module.exports = SystemConfig;
