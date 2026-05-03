const { errorResponse } = require("../utils/responseHandler");
const {
  HTTP_STATUS_CODES,
  ERROR_MESSAGES,
  USER_ROLES,
} = require("../config/constants");

function doctorOnly(req, res, next) {
  if (!req.user || req.user.role !== USER_ROLES.DOCTOR) {
    return errorResponse(
      res,
      ERROR_MESSAGES.FORBIDDEN,
      HTTP_STATUS_CODES.FORBIDDEN
    );
  }
  return next();
}

module.exports = { doctorOnly };
