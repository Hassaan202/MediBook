const { HTTP_STATUS_CODES } = require("../config/constants");

function successResponse(res, data, message, statusCode = HTTP_STATUS_CODES.OK) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

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
