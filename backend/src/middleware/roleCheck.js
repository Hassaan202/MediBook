const { errorResponse } = require("../utils/responseHandler");
const { HTTP_STATUS_CODES, ERROR_MESSAGES, USER_ROLES } = require("../config/constants");

function requireAuthUser(req, res, next) {
  if (!req.user) {
    return errorResponse(
      res,
      ERROR_MESSAGES.UNAUTHORIZED,
      HTTP_STATUS_CODES.UNAUTHORIZED
    );
  }
  return next();
}

function isPatient(req, res, next) {
  if (!req.user || req.user.role !== USER_ROLES.PATIENT) {
    return errorResponse(
      res,
      ERROR_MESSAGES.FORBIDDEN,
      HTTP_STATUS_CODES.FORBIDDEN
    );
  }
  return next();
}

function isDoctor(req, res, next) {
  if (!req.user || req.user.role !== USER_ROLES.DOCTOR) {
    return errorResponse(
      res,
      ERROR_MESSAGES.FORBIDDEN,
      HTTP_STATUS_CODES.FORBIDDEN
    );
  }
  return next();
}

function isAdmin(req, res, next) {
  if (!req.user || req.user.role !== USER_ROLES.ADMIN) {
    return errorResponse(
      res,
      ERROR_MESSAGES.FORBIDDEN,
      HTTP_STATUS_CODES.FORBIDDEN
    );
  }
  return next();
}

function isDoctorOrAdmin(req, res, next) {
  if (
    !req.user ||
    (req.user.role !== USER_ROLES.DOCTOR && req.user.role !== USER_ROLES.ADMIN)
  ) {
    return errorResponse(
      res,
      ERROR_MESSAGES.FORBIDDEN,
      HTTP_STATUS_CODES.FORBIDDEN
    );
  }
  return next();
}

function isPatientOrAdmin(req, res, next) {
  if (
    !req.user ||
    (req.user.role !== USER_ROLES.PATIENT && req.user.role !== USER_ROLES.ADMIN)
  ) {
    return errorResponse(
      res,
      ERROR_MESSAGES.FORBIDDEN,
      HTTP_STATUS_CODES.FORBIDDEN
    );
  }
  return next();
}

function isOwnerOrAdmin(ownerUserId) {
  return function ownerOrAdminMiddleware(req, res, next) {
    if (!req.user) {
      return errorResponse(
        res,
        ERROR_MESSAGES.UNAUTHORIZED,
        HTTP_STATUS_CODES.UNAUTHORIZED
      );
    }
    if (req.user.role === USER_ROLES.ADMIN) {
      return next();
    }
    if (String(ownerUserId) === String(req.user.userId)) {
      return next();
    }
    return errorResponse(
      res,
      ERROR_MESSAGES.FORBIDDEN,
      HTTP_STATUS_CODES.FORBIDDEN
    );
  };
}

module.exports = {
  requireAuthUser,
  isPatient,
  isDoctor,
  isAdmin,
  isDoctorOrAdmin,
  isPatientOrAdmin,
  isOwnerOrAdmin,
};
