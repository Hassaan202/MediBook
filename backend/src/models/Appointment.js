const mongoose = require("mongoose");
const {
  slotStartDateTime,
  slotEndDateTime,
  startOfLocalDay,
  hoursUntilAppointment,
} = require("../services/dateTimeService");

const ACTIVE_STATUSES = ["scheduled", "confirmed", "in-progress"];

const appointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    appointmentDate: { type: Date, required: true },
    timeSlot: { type: String, required: true, trim: true },
    duration: { type: Number, default: 30 },
    status: {
      type: String,
      enum: [
        "scheduled",
        "confirmed",
        "in-progress",
        "completed",
        "cancelled",
        "no-show",
      ],
      default: "scheduled",
    },
    type: {
      type: String,
      enum: ["consultation", "follow-up", "emergency", "routine-checkup"],
      default: "consultation",
    },
    symptoms: { type: String, default: "" },
    notes: { type: String, default: "" },
    prescriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Prescription",
      default: null,
    },
    medicalRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MedicalRecord",
      default: null,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refunded"],
      default: "pending",
    },
    amount: { type: Number, required: true, min: 0 },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    cancellationReason: { type: String, default: "" },
    cancelledAt: { type: Date, default: null },
    reminderSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

appointmentSchema.index({ patientId: 1, appointmentDate: -1 });
appointmentSchema.index({ doctorId: 1, appointmentDate: -1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ appointmentDate: 1 });
appointmentSchema.index({ patientId: 1, status: 1 });
appointmentSchema.index({ doctorId: 1, status: 1 });
appointmentSchema.index(
  { doctorId: 1, appointmentDate: 1, timeSlot: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $nin: ["cancelled", "no-show"] },
    },
  }
);

appointmentSchema.virtual("patientDetails", {
  ref: "Patient",
  localField: "patientId",
  foreignField: "_id",
  justOne: true,
});

appointmentSchema.virtual("doctorDetails", {
  ref: "Doctor",
  localField: "doctorId",
  foreignField: "_id",
  justOne: true,
});

appointmentSchema.set("toJSON", { virtuals: true });
appointmentSchema.set("toObject", { virtuals: true });

appointmentSchema.methods.canBeCancelled = function canBeCancelledMethod() {
  if (["cancelled", "completed", "no-show"].includes(this.status)) {
    return false;
  }
  const h = hoursUntilAppointment(this.appointmentDate, this.timeSlot);
  if (h == null) return false;
  return h >= 24;
};

appointmentSchema.methods.isUpcoming = function isUpcomingMethod() {
  const start = slotStartDateTime(this.appointmentDate, this.timeSlot);
  if (!start) return false;
  return (
    start > new Date() &&
    ACTIVE_STATUSES.includes(this.status)
  );
};

appointmentSchema.methods.isPast = function isPastMethod() {
  const end = slotEndDateTime(this.appointmentDate, this.timeSlot);
  if (["completed", "cancelled", "no-show"].includes(this.status)) {
    return true;
  }
  return Boolean(end && end < new Date());
};

appointmentSchema.statics.findUpcoming = function findUpcomingStatic(filter) {
  const q = {
    status: { $in: ACTIVE_STATUSES },
    appointmentDate: { $gte: startOfLocalDay(new Date()) },
  };
  if (filter && filter.doctorId) q.doctorId = filter.doctorId;
  if (filter && filter.patientId) q.patientId = filter.patientId;
  return this.find(q).sort({ appointmentDate: 1, timeSlot: 1 });
};

appointmentSchema.statics.findByDateRange = function findByDateRangeStatic(
  startDate,
  endDate,
  extra
) {
  const q = {
    appointmentDate: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
    ...(extra || {}),
  };
  return this.find(q).sort({ appointmentDate: 1, timeSlot: 1 });
};

appointmentSchema.statics.checkDoctorAvailability =
  async function checkDoctorAvailabilityStatic(doctorId, date, timeSlot) {
    const svc = require("../services/appointmentService");
    return svc.checkDoctorAvailability(doctorId, date, timeSlot);
  };

const Appointment = mongoose.model("Appointment", appointmentSchema);

module.exports = Appointment;
