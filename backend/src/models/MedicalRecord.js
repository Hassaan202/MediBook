const mongoose = require("mongoose");

const bloodPressureSchema = new mongoose.Schema(
  {
    systolic: { type: Number },
    diastolic: { type: Number },
  },
  { _id: false }
);

const vitalSignsSchema = new mongoose.Schema(
  {
    bloodPressure: bloodPressureSchema,
    heartRate: { type: Number },
    temperature: { type: Number },
    respiratoryRate: { type: Number },
    oxygenSaturation: { type: Number },
    weight: { type: Number },
    height: { type: Number },
    bmi: { type: Number },
  },
  { _id: false }
);

const labResultSchema = new mongoose.Schema(
  {
    testName: { type: String, required: true, trim: true },
    result: { type: String, required: true, trim: true },
    normalRange: { type: String, default: "", trim: true },
    date: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["normal", "abnormal", "critical"],
      required: true,
    },
  },
  { _id: true }
);

const attachmentSchema = new mongoose.Schema(
  {
    fileName: { type: String, required: true, trim: true },
    fileUrl: { type: String, required: true, trim: true },
    fileType: { type: String, required: true, trim: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const medicalRecordSchema = new mongoose.Schema(
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
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
    },
    visitDate: { type: Date, required: true, default: Date.now },
    chiefComplaint: { type: String, required: true, trim: true },
    symptoms: { type: [String], default: [] },
    diagnosis: { type: String, required: true, trim: true },
    treatmentPlan: { type: String, default: "" },
    clinicalNotes: { type: String, required: true, trim: true },
    vitalSigns: { type: vitalSignsSchema, default: () => ({}) },
    labResults: { type: [labResultSchema], default: [] },
    attachments: { type: [attachmentSchema], default: [] },
    followUpRequired: { type: Boolean, default: false },
    followUpDate: { type: Date, default: null },
    isConfidential: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

medicalRecordSchema.index({ patientId: 1, visitDate: -1 });
medicalRecordSchema.index({ doctorId: 1, visitDate: -1 });
medicalRecordSchema.index({ appointmentId: 1 });
medicalRecordSchema.index({ visitDate: -1 });
medicalRecordSchema.index({ diagnosis: "text", chiefComplaint: "text" });

medicalRecordSchema.virtual("patientDetails", {
  ref: "Patient",
  localField: "patientId",
  foreignField: "_id",
  justOne: true,
});

medicalRecordSchema.virtual("doctorDetails", {
  ref: "Doctor",
  localField: "doctorId",
  foreignField: "_id",
  justOne: true,
});

medicalRecordSchema.virtual("prescriptions", {
  ref: "Prescription",
  localField: "_id",
  foreignField: "medicalRecordId",
});

medicalRecordSchema.set("toJSON", { virtuals: true });
medicalRecordSchema.set("toObject", { virtuals: true });

function computeBmiFromVitals(vs) {
  if (!vs || vs.height == null || vs.weight == null) return null;
  if (vs.height <= 0 || vs.weight <= 0) return null;
  const hM = vs.height / 100;
  return Number((vs.weight / (hM * hM)).toFixed(2));
}

medicalRecordSchema.pre("save", function syncBmi(next) {
  if (this.vitalSigns) {
    const b = computeBmiFromVitals(this.vitalSigns);
    if (b != null) this.vitalSigns.bmi = b;
  }
  next();
});

medicalRecordSchema.methods.calculateBMI = function calculateBMIMethod() {
  if (!this.vitalSigns) this.vitalSigns = {};
  const b = computeBmiFromVitals(this.vitalSigns);
  if (b != null) this.vitalSigns.bmi = b;
  return this.vitalSigns.bmi;
};

medicalRecordSchema.methods.addLabResult = async function addLabResultMethod(
  testName,
  result,
  normalRange,
  status
) {
  this.labResults.push({
    testName,
    result,
    normalRange: normalRange || "",
    date: new Date(),
    status,
  });
  return this.save();
};

medicalRecordSchema.methods.addAttachment = async function addAttachmentMethod(
  fileName,
  fileUrl,
  fileType
) {
  this.attachments.push({
    fileName,
    fileUrl,
    fileType,
    uploadedAt: new Date(),
  });
  return this.save();
};

medicalRecordSchema.statics.getPatientHistory = function getPatientHistoryStatic(
  patientId,
  limit
) {
  const q = this.find({ patientId, deletedAt: null })
    .sort({ visitDate: -1 })
    .limit(limit || 100);
  return q;
};

medicalRecordSchema.statics.getRecentRecords = function getRecentRecordsStatic(
  patientId,
  days
) {
  const since = new Date(Date.now() - (days || 30) * 86400000);
  return this.find({
    patientId,
    deletedAt: null,
    visitDate: { $gte: since },
  }).sort({ visitDate: -1 });
};

medicalRecordSchema.statics.searchByDiagnosis =
  function searchByDiagnosisStatic(diagnosis) {
    return this.find({
      deletedAt: null,
      diagnosis: new RegExp(
        String(diagnosis).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      ),
    }).sort({ visitDate: -1 });
  };

const MedicalRecord = mongoose.model("MedicalRecord", medicalRecordSchema);

module.exports = MedicalRecord;
