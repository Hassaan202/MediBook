const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    zipCode: { type: String, trim: true },
    country: { type: String, trim: true },
  },
  { _id: false }
);

const emergencyContactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    relationship: { type: String, trim: true },
    phone: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const insuranceInfoSchema = new mongoose.Schema(
  {
    provider: { type: String, trim: true },
    policyNumber: { type: String, trim: true },
    validUntil: { type: Date },
  },
  { _id: false }
);

const patientSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    dateOfBirth: { type: Date, required: true },
    gender: {
      type: String,
      required: true,
      enum: ["Male", "Female", "Other"],
    },
    bloodType: {
      type: String,
      required: true,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },
    phone: { type: String, required: true, trim: true },
    address: { type: addressSchema, default: undefined },
    emergencyContact: {
      type: emergencyContactSchema,
      required: true,
    },
    allergies: { type: [String], default: [] },
    chronicConditions: { type: [String], default: [] },
    currentMedications: { type: [String], default: [] },
    insuranceInfo: { type: insuranceInfoSchema, default: undefined },
    height: { type: Number, default: null },
    weight: { type: Number, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

patientSchema.index({ phone: 1 });
patientSchema.index({ bloodType: 1 });
patientSchema.index({ deletedAt: 1 });

patientSchema.virtual("age").get(function getAge() {
  if (!this.dateOfBirth) return null;
  const d = new Date(this.dateOfBirth);
  let age = new Date().getFullYear() - d.getFullYear();
  const m = new Date().getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && new Date().getDate() < d.getDate())) {
    age -= 1;
  }
  return age;
});

patientSchema.virtual("bmi").get(function getBmi() {
  if (
    this.height == null ||
    this.weight == null ||
    this.height <= 0 ||
    this.weight <= 0
  ) {
    return null;
  }
  const hM = this.height / 100;
  return Number((this.weight / (hM * hM)).toFixed(2));
});

patientSchema.virtual("userDetails", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

patientSchema.set("toJSON", { virtuals: true });
patientSchema.set("toObject", { virtuals: true });

const Patient = mongoose.model("Patient", patientSchema);

module.exports = Patient;
