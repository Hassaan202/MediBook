const { verifyAccessToken } = require("../utils/tokenGenerator");
const { errorResponse } = require("../utils/responseHandler");
const { HTTP_STATUS_CODES, ERROR_MESSAGES } = require("../config/constants");

function verifyToken(req, res, next) {
  const header = req.headers.authorization || "";
  const parts = header.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return errorResponse(
      res,
      ERROR_MESSAGES.UNAUTHORIZED,
      HTTP_STATUS_CODES.UNAUTHORIZED
    );
  }
  const token = parts[1];
  try {
    const decoded = verifyAccessToken(token);
    if (decoded.type !== "access") {
      return errorResponse(
        res,
        ERROR_MESSAGES.INVALID_TOKEN,
        HTTP_STATUS_CODES.UNAUTHORIZED
      );
    }
    req.user = { userId: decoded.sub, role: decoded.role };
    return next();
  } catch {
    return errorResponse(
      res,
      ERROR_MESSAGES.INVALID_TOKEN,
      HTTP_STATUS_CODES.UNAUTHORIZED
    );
  }
}

function checkRole(roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return function roleMiddleware(req, res, next) {
    if (!req.user) {
      return errorResponse(
        res,
        ERROR_MESSAGES.UNAUTHORIZED,
        HTTP_STATUS_CODES.UNAUTHORIZED
      );
    }
    if (!allowed.includes(req.user.role)) {
      return errorResponse(
        res,
        ERROR_MESSAGES.FORBIDDEN,
        HTTP_STATUS_CODES.FORBIDDEN
      );
    }
    return next();
  };
}

function optionalAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const parts = header.split(" ");
  if (parts.length === 2 && parts[0] === "Bearer") {
    try {
      const decoded = verifyAccessToken(parts[1]);
      if (decoded.type === "access") {
        req.user = { userId: decoded.sub, role: decoded.role };
      }
    } catch {
      req.user = undefined;
    }
  }
  return next();
}

module.exports = { verifyToken, checkRole, optionalAuth };
