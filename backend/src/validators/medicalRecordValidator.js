const { body, param, query } = require("express-validator");

const vitalSignsBody = [
  body("vitalSigns").optional().isObject(),
  body("vitalSigns.bloodPressure").optional().isObject(),
  body("vitalSigns.bloodPressure.systolic").optional().isFloat({ min: 0 }).toFloat(),
  body("vitalSigns.bloodPressure.diastolic").optional().isFloat({ min: 0 }).toFloat(),
  body("vitalSigns.heartRate").optional().isFloat({ min: 0 }).toFloat(),
  body("vitalSigns.temperature").optional().isFloat({ min: 0 }).toFloat(),
  body("vitalSigns.respiratoryRate").optional().isFloat({ min: 0 }).toFloat(),
  body("vitalSigns.oxygenSaturation").optional().isFloat({ min: 0 }).toFloat(),
  body("vitalSigns.weight").optional().isFloat({ min: 0 }).toFloat(),
  body("vitalSigns.height").optional().isFloat({ min: 0 }).toFloat(),
];

const createMedicalRecordValidator = [
  body("patientId").isMongoId(),
  body("appointmentId").optional({ values: "falsy" }).isMongoId(),
  body("visitDate").optional().isISO8601().toDate(),
  body("chiefComplaint").trim().notEmpty(),
  body("symptoms").optional().isArray(),
  body("diagnosis").trim().notEmpty(),
  body("treatmentPlan").optional().isString().trim(),
  body("clinicalNotes").trim().notEmpty(),
  body("followUpRequired").optional().isBoolean(),
  body("followUpDate").optional().isISO8601().toDate(),
  body("isConfidential").optional().isBoolean(),
  ...vitalSignsBody,
];

const updateMedicalRecordValidator = [
  param("id").isMongoId(),
  body("chiefComplaint").optional().trim().notEmpty(),
  body("symptoms").optional().isArray(),
  body("diagnosis").optional().trim().notEmpty(),
  body("treatmentPlan").optional().isString().trim(),
  body("clinicalNotes").optional().trim().notEmpty(),
  body("followUpRequired").optional().isBoolean(),
  body("followUpDate").optional().isISO8601().toDate(),
  body("isConfidential").optional().isBoolean(),
  ...vitalSignsBody,
];

const labResultValidator = [
  param("id").isMongoId(),
  body("testName").trim().notEmpty(),
  body("result").trim().notEmpty(),
  body("normalRange").optional().isString().trim(),
  body("date").optional().isISO8601().toDate(),
  body("status").isIn(["normal", "abnormal", "critical"]),
];

const searchMedicalRecordsValidator = [
  query("diagnosis").optional().isString().trim(),
  query("dateFrom").optional().isISO8601().toDate(),
  query("dateTo").optional().isISO8601().toDate(),
  query("patientId").optional().isMongoId(),
];

const attachmentIdParam = [
  param("id").isMongoId(),
  param("attachmentId").isMongoId(),
];

module.exports = {
  createMedicalRecordValidator,
  updateMedicalRecordValidator,
  labResultValidator,
  searchMedicalRecordsValidator,
  attachmentIdParam,
};
