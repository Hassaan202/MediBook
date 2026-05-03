const mongoose = require("mongoose");

const medicationSchema = new mongoose.Schema(
  {
    medicationName: { type: String, required: true, trim: true },
    genericName: { type: String, trim: true },
    dosage: { type: String, required: true, trim: true },
    frequency: { type: String, required: true, trim: true },
    duration: { type: String, required: true, trim: true },
    instructions: { type: String, default: "" },
    route: {
      type: String,
      enum: [
        "oral",
        "injection",
        "topical",
        "inhalation",
        "sublingual",
        "rectal",
        "other",
      ],
      default: "oral",
    },
    startDate: { type: Date },
    endDate: { type: Date },
    quantity: { type: Number },
    refills: { type: Number, default: 0 },
  },
  { _id: true }
);

const prescriptionSchema = new mongoose.Schema(
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
    medicalRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MedicalRecord",
      default: null,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
    },
    prescriptionDate: { type: Date, required: true, default: Date.now },
    medications: {
      type: [medicationSchema],
      required: true,
      validate: {
        validator(v) {
          return Array.isArray(v) && v.length >= 1;
        },
        message: "At least one medication is required",
      },
    },
    diagnosis: { type: String, required: true, trim: true },
    notes: { type: String, default: "" },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
    },
    validUntil: { type: Date, default: null },
    digitalSignature: { type: String, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

prescriptionSchema.index({ patientId: 1, prescriptionDate: -1 });
prescriptionSchema.index({ doctorId: 1, prescriptionDate: -1 });
prescriptionSchema.index({ status: 1 });
prescriptionSchema.index({ prescriptionDate: -1 });

prescriptionSchema.virtual("patientDetails", {
  ref: "Patient",
  localField: "patientId",
  foreignField: "_id",
  justOne: true,
});

prescriptionSchema.virtual("doctorDetails", {
  ref: "Doctor",
  localField: "doctorId",
  foreignField: "_id",
  justOne: true,
});

prescriptionSchema.virtual("totalMedications").get(function totalMeds() {
  return Array.isArray(this.medications) ? this.medications.length : 0;
});

prescriptionSchema.set("toJSON", { virtuals: true });
prescriptionSchema.set("toObject", { virtuals: true });

prescriptionSchema.methods.addMedication = async function addMedicationMethod(
  medication
) {
  this.medications.push(medication);
  return this.save();
};

prescriptionSchema.methods.removeMedication =
  async function removeMedicationMethod(index) {
    if (index < 0 || index >= this.medications.length) {
      throw new Error("Invalid medication index");
    }
    this.medications.splice(index, 1);
    if (this.medications.length < 1) {
      throw new Error("Prescription must retain at least one medication");
    }
    return this.save();
  };

prescriptionSchema.methods.markAsCompleted =
  async function markAsCompletedMethod() {
    this.status = "completed";
    return this.save();
  };

prescriptionSchema.methods.markAsCancelled =
  async function markAsCancelledMethod() {
    this.status = "cancelled";
    return this.save();
  };

prescriptionSchema.methods.isExpired = function isExpiredMethod() {
  if (!this.validUntil) return false;
  return new Date(this.validUntil).getTime() < Date.now();
};

prescriptionSchema.statics.getActivePrescriptions =
  function getActivePrescriptionsStatic(patientId) {
    const now = new Date();
    return this.find({
      patientId,
      deletedAt: null,
      status: "active",
      $or: [{ validUntil: null }, { validUntil: { $gte: now } }],
    }).sort({ prescriptionDate: -1 });
  };

prescriptionSchema.statics.getPrescriptionsByDoctor =
  function getPrescriptionsByDoctorStatic(doctorId, startDate, endDate) {
    const q = { doctorId, deletedAt: null };
    if (startDate && endDate) {
      q.prescriptionDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }
    return this.find(q).sort({ prescriptionDate: -1 });
  };

const Prescription = mongoose.model("Prescription", prescriptionSchema);

module.exports = Prescription;
