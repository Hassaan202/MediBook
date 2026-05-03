const mongoose = require("mongoose");

const daySlotSchema = new mongoose.Schema(
  {
    start: { type: String, default: "09:00" },
    end: { type: String, default: "17:00" },
  },
  { _id: false }
);

const workingHoursSchema = new mongoose.Schema(
  {
    monday: daySlotSchema,
    tuesday: daySlotSchema,
    wednesday: daySlotSchema,
    thursday: daySlotSchema,
    friday: daySlotSchema,
    saturday: daySlotSchema,
    sunday: daySlotSchema,
  },
  { _id: false, strict: false }
);

const doctorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    specialty: { type: String, required: true, trim: true },
    qualifications: { type: [String], default: [] },
    experience: { type: Number, required: true, min: 0 },
    fees: { type: Number, required: true, min: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    available: { type: Boolean, default: true },
    availableSlots: { type: [String], default: [] },
    workingHours: { type: workingHoursSchema, default: () => ({}) },
    consultationDuration: { type: Number, default: 30 },
    bio: { type: String, default: "" },
    languages: { type: [String], default: ["English"] },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

doctorSchema.index({ specialty: 1 });
doctorSchema.index({ rating: -1 });
doctorSchema.index({ fees: 1 });
doctorSchema.index({ available: 1 });
doctorSchema.index({ deletedAt: 1 });

doctorSchema.virtual("userDetails", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

doctorSchema.set("toJSON", { virtuals: true });
doctorSchema.set("toObject", { virtuals: true });

const Doctor = mongoose.model("Doctor", doctorSchema);

module.exports = Doctor;
