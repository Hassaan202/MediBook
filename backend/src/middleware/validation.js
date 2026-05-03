const { validationResult } = require("express-validator");
const { errorResponse } = require("../utils/responseHandler");
const {
  HTTP_STATUS_CODES,
  ERROR_MESSAGES,
} = require("../config/constants");

function trimDeep(value) {
  if (typeof value === "string") {
    return value.trim();
  }
  if (Array.isArray(value)) {
    return value.map(trimDeep);
  }
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const out = {};
    Object.keys(value).forEach((k) => {
      out[k] = trimDeep(value[k]);
    });
    return out;
  }
  return value;
}

function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === "object") {
    req.body = trimDeep(req.body);
  }
  next();
}

function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(
      res,
      ERROR_MESSAGES.VALIDATION_FAILED,
      HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
      errors.array().map((e) => ({
        field: e.path,
        message: e.msg,
        value: e.value,
      }))
    );
  }
  return next();
}

module.exports = { validateRequest, sanitizeInput };
