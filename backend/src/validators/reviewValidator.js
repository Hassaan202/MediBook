const { body, param } = require("express-validator");

const createReviewValidator = [
  body("appointmentId").isMongoId(),
  body("rating").isInt({ min: 1, max: 5 }).toInt(),
  body("comment").optional().isString().trim(),
  body("isAnonymous").optional().isBoolean(),
];

const updateReviewValidator = [
  param("id").isMongoId(),
  body("rating").optional().isInt({ min: 1, max: 5 }).toInt(),
  body("comment").optional().isString().trim(),
  body("isAnonymous").optional().isBoolean(),
];

const reviewResponseValidator = [
  param("id").isMongoId(),
  body("response").trim().notEmpty(),
];

module.exports = {
  createReviewValidator,
  updateReviewValidator,
  reviewResponseValidator,
};
