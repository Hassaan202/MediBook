const { body, param } = require("express-validator");

const medicationFields = [
  body("medications").isArray({ min: 1 }),
  body("medications.*.medicationName").trim().notEmpty(),
  body("medications.*.dosage").trim().notEmpty(),
  body("medications.*.frequency").trim().notEmpty(),
  body("medications.*.duration").trim().notEmpty(),
  body("medications.*.genericName").optional().isString().trim(),
  body("medications.*.instructions").optional().isString().trim(),
  body("medications.*.route")
    .optional()
    .isIn([
      "oral",
      "injection",
      "topical",
      "inhalation",
      "sublingual",
      "rectal",
      "other",
    ]),
  body("medications.*.startDate").optional().isISO8601().toDate(),
  body("medications.*.endDate").optional().isISO8601().toDate(),
  body("medications.*.quantity").optional().isFloat({ min: 0 }).toFloat(),
  body("medications.*.refills").optional().isInt({ min: 0 }).toInt(),
];

const createPrescriptionValidator = [
  body("patientId").isMongoId(),
  body("medicalRecordId").optional({ values: "falsy" }).isMongoId(),
  body("appointmentId").optional({ values: "falsy" }).isMongoId(),
  body("prescriptionDate").optional().isISO8601().toDate(),
  body("diagnosis").trim().notEmpty(),
  body("notes").optional().isString().trim(),
  body("validDays").optional().isInt({ min: 1, max: 365 }).toInt(),
  ...medicationFields,
];

const simplifiedUpdatePrescriptionValidator = [
  param("id").isMongoId(),
  body("diagnosis").optional().trim().notEmpty(),
  body("notes").optional().isString().trim(),
  body("medications")
    .optional()
    .isArray({ min: 1 }),
  body("medications.*.medicationName").optional().trim().notEmpty(),
  body("medications.*.dosage").optional().trim().notEmpty(),
  body("medications.*.frequency").optional().trim().notEmpty(),
  body("medications.*.duration").optional().trim().notEmpty(),
];

const addMedicationValidator = [
  param("id").isMongoId(),
  body("medicationName").trim().notEmpty(),
  body("dosage").trim().notEmpty(),
  body("frequency").trim().notEmpty(),
  body("duration").trim().notEmpty(),
  body("genericName").optional().isString().trim(),
  body("instructions").optional().isString().trim(),
  body("route")
    .optional()
    .isIn([
      "oral",
      "injection",
      "topical",
      "inhalation",
      "sublingual",
      "rectal",
      "other",
    ]),
];

const prescriptionStatusValidator = [
  param("id").isMongoId(),
  body("status").isIn(["active", "completed", "cancelled"]),
];

const medicationIndexParam = [
  param("id").isMongoId(),
  param("medicationIndex").isInt({ min: 0 }).toInt(),
];

module.exports = {
  createPrescriptionValidator,
  updatePrescriptionValidator: simplifiedUpdatePrescriptionValidator,
  addMedicationValidator,
  prescriptionStatusValidator,
  medicationIndexParam,
};
