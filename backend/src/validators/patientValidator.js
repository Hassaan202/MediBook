const { body, param } = require("express-validator");

const PHONE_REGEX =
  /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;

const createPatientValidator = [
  body("userId").isMongoId(),
  body("dateOfBirth").isISO8601().toDate(),
  body("gender").isIn(["Male", "Female", "Other"]),
  body("bloodType").isIn(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]),
  body("phone").trim().matches(PHONE_REGEX),
  body("address").optional().isObject(),
  body("emergencyContact").isObject(),
  body("emergencyContact.name").trim().notEmpty(),
  body("emergencyContact.phone").trim().matches(PHONE_REGEX),
  body("emergencyContact.relationship").optional().isString().trim(),
  body("allergies").optional().isArray(),
  body("chronicConditions").optional().isArray(),
  body("currentMedications").optional().isArray(),
  body("insuranceInfo").optional().isObject(),
  body("height").optional().isFloat({ min: 0 }).toFloat(),
  body("weight").optional().isFloat({ min: 0 }).toFloat(),
];

const updatePatientValidator = [
  param("id").isMongoId(),
  body("dateOfBirth").optional().isISO8601().toDate(),
  body("gender").optional().isIn(["Male", "Female", "Other"]),
  body("bloodType")
    .optional()
    .isIn(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]),
  body("phone").optional().trim().matches(PHONE_REGEX),
  body("address").optional().isObject(),
  body("emergencyContact").optional().isObject(),
  body("allergies").optional().isArray(),
  body("chronicConditions").optional().isArray(),
  body("currentMedications").optional().isArray(),
  body("insuranceInfo").optional().isObject(),
  body("height").optional().isFloat({ min: 0 }).toFloat(),
  body("weight").optional().isFloat({ min: 0 }).toFloat(),
];

module.exports = {
  createPatientValidator,
  updatePatientValidator,
};
