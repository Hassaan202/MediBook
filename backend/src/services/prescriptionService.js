const crypto = require("crypto");
const { JWT_SECRET } = require("../config/env");

function validateMedication(m) {
  const errors = [];
  if (!m || typeof m !== "object") {
    errors.push("medication required");
    return errors;
  }
  if (!m.medicationName) errors.push("medicationName required");
  if (!m.dosage) errors.push("dosage required");
  if (!m.frequency) errors.push("frequency required");
  if (!m.duration) errors.push("duration required");
  return errors;
}

function calculateValidUntil(fromDate, days) {
  const d = new Date(fromDate || Date.now());
  const add = days != null ? days : 90;
  d.setDate(d.getDate() + add);
  return d;
}

function generateDigitalSignature(prescription) {
  const secret =
    process.env.PRESCRIPTION_SIGNATURE_SECRET || JWT_SECRET || "medibook";
  const payload = JSON.stringify({
    patientId: String(prescription.patientId),
    doctorId: String(prescription.doctorId),
    medications: prescription.medications,
    diagnosis: prescription.diagnosis,
    prescriptionDate: prescription.prescriptionDate,
  });
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function checkPrescriptionExpiry(prescription) {
  if (!prescription.validUntil) return false;
  return new Date(prescription.validUntil).getTime() < Date.now();
}

function formatPrescriptionForPDF(prescription) {
  const lines = [];
  lines.push(`Diagnosis: ${prescription.diagnosis || ""}`);
  lines.push(`Date: ${prescription.prescriptionDate || ""}`);
  (prescription.medications || []).forEach((med, i) => {
    lines.push(
      `${i + 1}. ${med.medicationName} ${med.dosage} ${med.frequency} ${med.duration}`
    );
  });
  if (prescription.notes) lines.push(`Notes: ${prescription.notes}`);
  return lines.join("\n");
}

module.exports = {
  validateMedication,
  calculateValidUntil,
  generateDigitalSignature,
  checkPrescriptionExpiry,
  formatPrescriptionForPDF,
};
