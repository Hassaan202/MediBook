const { HTTP_STATUS_CODES } = require("../config/constants");

/**
 * successResponse
 * Standardizes the success response format sent to the client.
 */
function successResponse(res, data, message, statusCode = HTTP_STATUS_CODES.OK) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

/**
 * errorResponse
 * Standardizes the error response format sent to the client.
 */
function errorResponse(
  res,
  message,
  statusCode = HTTP_STATUS_CODES.BAD_REQUEST,
  errors = []
) {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
}

module.exports = { successResponse, errorResponse };
