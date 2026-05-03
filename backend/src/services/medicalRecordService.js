const mongoose = require("mongoose");
const MedicalRecord = require("../models/MedicalRecord");
const Appointment = require("../models/Appointment");
const Prescription = require("../models/Prescription");
const Patient = require("../models/Patient");

function calculateBMI(heightCm, weightKg) {
  if (heightCm == null || weightKg == null) return null;
  if (heightCm <= 0 || weightKg <= 0) return null;
  const hM = heightCm / 100;
  return Number((weightKg / (hM * hM)).toFixed(2));
}

function validateVitalSigns(vs) {
  const errors = [];
  if (!vs || typeof vs !== "object") return errors;
  if (vs.bloodPressure) {
    const s = vs.bloodPressure.systolic;
    const d = vs.bloodPressure.diastolic;
    if (s != null && (s < 40 || s > 300)) errors.push("systolic out of range");
    if (d != null && (d < 20 || d > 200)) errors.push("diastolic out of range");
  }
  if (vs.heartRate != null && (vs.heartRate < 20 || vs.heartRate > 300)) {
    errors.push("heartRate out of range");
  }
  if (vs.temperature != null && (vs.temperature < 30 || vs.temperature > 45)) {
    errors.push("temperature out of range");
  }
  if (
    vs.respiratoryRate != null &&
    (vs.respiratoryRate < 4 || vs.respiratoryRate > 60)
  ) {
    errors.push("respiratoryRate out of range");
  }
  if (
    vs.oxygenSaturation != null &&
    (vs.oxygenSaturation < 50 || vs.oxygenSaturation > 100)
  ) {
    errors.push("oxygenSaturation out of range");
  }
  if (vs.weight != null && (vs.weight < 1 || vs.weight > 500)) {
    errors.push("weight out of range");
  }
  if (vs.height != null && (vs.height < 30 || vs.height > 280)) {
    errors.push("height out of range");
  }
  return errors;
}

function formatMedicalHistory(records) {
  return (records || []).map((r) => ({
    id: r._id,
    visitDate: r.visitDate,
    diagnosis: r.diagnosis,
    chiefComplaint: r.chiefComplaint,
    doctorId: r.doctorId,
    isConfidential: r.isConfidential,
  }));
}

async function checkDoctorAccess(doctorProfileId, patientId) {
  const pid = new mongoose.Types.ObjectId(patientId);
  const did = new mongoose.Types.ObjectId(doctorProfileId);
  const appt = await Appointment.findOne({
    patientId: pid,
    doctorId: did,
    status: "completed",
  })
    .select("_id")
    .lean();
  if (appt) return true;
  const mr = await MedicalRecord.exists({
    patientId: pid,
    doctorId: did,
    deletedAt: null,
  });
  if (mr) return true;
  const pr = await Prescription.exists({
    patientId: pid,
    doctorId: did,
    deletedAt: null,
  });
  return Boolean(pr);
}

async function generatePatientSummary(patientId) {
  const patient = await Patient.findOne({
    _id: patientId,
    deletedAt: null,
  })
    .populate({
      path: "userDetails",
      select: "name email",
    })
    .lean({ virtuals: true });
  if (!patient) return null;
  const records = await MedicalRecord.find({
    patientId,
    deletedAt: null,
  })
    .sort({ visitDate: -1 })
    .select("diagnosis visitDate followUpRequired followUpDate")
    .lean();
  const totalVisits = await MedicalRecord.countDocuments({
    patientId,
    deletedAt: null,
  });
  const recentDiagnoses = records.slice(0, 3).map((r) => r.diagnosis);
  const activePrescriptions = await Prescription.countDocuments({
    patientId,
    deletedAt: null,
    status: "active",
    $or: [{ validUntil: null }, { validUntil: { $gte: new Date() } }],
  });
  const upcomingFollowUps = await MedicalRecord.countDocuments({
    patientId,
    deletedAt: null,
    followUpRequired: true,
    followUpDate: { $gte: new Date() },
  });
  const lastVisit = records.length ? records[0].visitDate : null;
  return {
    patient,
    totalVisits,
    recentDiagnoses,
    activePrescriptions,
    chronicConditions: patient.chronicConditions || [],
    upcomingFollowUps,
    lastVisit,
  };
}

module.exports = {
  calculateBMI,
  validateVitalSigns,
  formatMedicalHistory,
  generatePatientSummary,
  checkDoctorAccess,
};
