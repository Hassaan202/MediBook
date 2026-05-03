const { body, param, query } = require("express-validator");

const bookAppointmentValidator = [
  body("doctorId").isMongoId(),
  body("appointmentDate").isISO8601().toDate(),
  body("timeSlot").trim().notEmpty(),
  body("duration").optional().isInt({ min: 15, max: 480 }).toInt(),
  body("type")
    .optional()
    .isIn(["consultation", "follow-up", "emergency", "routine-checkup"]),
  body("symptoms").optional().isString().trim(),
];

const updateAppointmentValidator = [
  param("id").isMongoId(),
  body("symptoms").optional().isString().trim(),
  body("notes").optional().isString().trim(),
  body("type")
    .optional()
    .isIn(["consultation", "follow-up", "emergency", "routine-checkup"]),
  body("duration").optional().isInt({ min: 15, max: 480 }).toInt(),
];

const cancelAppointmentValidator = [
  param("id").isMongoId(),
  body("reason").optional().isString().trim(),
];

const statusValidator = [
  param("id").isMongoId(),
  body("status")
    .isIn([
      "scheduled",
      "confirmed",
      "in-progress",
      "completed",
      "cancelled",
      "no-show",
    ]),
];

const confirmValidator = [param("id").isMongoId()];

const rescheduleValidator = [
  param("id").isMongoId(),
  body("appointmentDate").isISO8601().toDate(),
  body("timeSlot").trim().notEmpty(),
  body("duration").optional().isInt({ min: 15, max: 480 }).toInt(),
];

const checkAvailabilityQueryValidator = [
  query("doctorId").isMongoId(),
  query("date").isISO8601().toDate(),
  query("timeSlot").trim().notEmpty(),
];

module.exports = {
  bookAppointmentValidator,
  updateAppointmentValidator,
  cancelAppointmentValidator,
  statusValidator,
  confirmValidator,
  rescheduleValidator,
  checkAvailabilityQueryValidator,
};
