const { body, param } = require("express-validator");

const createDoctorValidator = [
  body("userId").isMongoId(),
  body("specialty").trim().notEmpty(),
  body("qualifications").optional().isArray(),
  body("experience").isFloat({ min: 0 }).toFloat(),
  body("fees").isFloat({ min: 0 }).toFloat(),
  body("bio").optional().isString().trim(),
  body("languages").optional().isArray(),
  body("consultationDuration").optional().isInt({ min: 5, max: 240 }).toInt(),
  body("workingHours").optional().isObject(),
  body("availableSlots").optional().isArray(),
];

const updateDoctorValidator = [
  param("id").isMongoId(),
  body("specialty").optional().trim().notEmpty(),
  body("qualifications").optional().isArray(),
  body("experience").optional().isFloat({ min: 0 }).toFloat(),
  body("fees").optional().isFloat({ min: 0 }).toFloat(),
  body("bio").optional().isString().trim(),
  body("languages").optional().isArray(),
  body("consultationDuration").optional().isInt({ min: 5, max: 240 }).toInt(),
  body("workingHours").optional().isObject(),
  body("rating").optional().isFloat({ min: 0, max: 5 }).toFloat(),
  body("totalReviews").optional().isInt({ min: 0 }).toInt(),
];

const updateAvailabilityValidator = [
  param("id").isMongoId(),
  body("available").optional().isBoolean(),
  body("availableSlots").optional().isArray(),
];

module.exports = {
  createDoctorValidator,
  updateDoctorValidator,
  updateAvailabilityValidator,
};
