const mongoose = require("mongoose");
const { JsonWebTokenError, TokenExpiredError } = require("jsonwebtoken");
const { errorResponse } = require("../utils/responseHandler");
const {
  HTTP_STATUS_CODES,
  ERROR_MESSAGES,
} = require("../config/constants");

function validationErrorHandler(err, req, res, next) {
  if (err && err.name === "ValidationError" && err instanceof mongoose.Error) {
    const errors = Object.values(err.errors || {}).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return errorResponse(
      res,
      ERROR_MESSAGES.VALIDATION_FAILED,
      HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
      errors
    );
  }
  return next(err);
}

function globalErrorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof JsonWebTokenError || err instanceof TokenExpiredError) {
    return errorResponse(
      res,
      ERROR_MESSAGES.INVALID_TOKEN,
      HTTP_STATUS_CODES.UNAUTHORIZED
    );
  }

  if (err instanceof mongoose.Error.CastError) {
    return errorResponse(
      res,
      ERROR_MESSAGES.NOT_FOUND,
      HTTP_STATUS_CODES.NOT_FOUND
    );
  }

  if (err && err.code === 11000) {
    const isEmail = err.keyPattern && Object.prototype.hasOwnProperty.call(err.keyPattern, "email");
    return errorResponse(
      res,
      isEmail ? ERROR_MESSAGES.EMAIL_EXISTS : "Duplicate key",
      HTTP_STATUS_CODES.CONFLICT
    );
  }

  const status = err.statusCode || HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR;
  const message =
    status === HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
      ? ERROR_MESSAGES.SERVER_ERROR
      : err.message || ERROR_MESSAGES.SERVER_ERROR;

  return errorResponse(res, message, status, err.errors || []);
}

function notFoundHandler(req, res) {
  return errorResponse(
    res,
    ERROR_MESSAGES.NOT_FOUND,
    HTTP_STATUS_CODES.NOT_FOUND
  );
}

module.exports = {
  globalErrorHandler,
  notFoundHandler,
  validationErrorHandler,
};
