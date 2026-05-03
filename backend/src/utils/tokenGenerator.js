const jwt = require("jsonwebtoken");
const {
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  JWT_EXPIRE,
  JWT_REFRESH_EXPIRE,
} = require("../config/env");

function generateAccessToken(userId, role) {
  return jwt.sign({ sub: userId, role, type: "access" }, JWT_SECRET, {
    expiresIn: JWT_EXPIRE,
  });
}

function generateRefreshToken(userId) {
  return jwt.sign({ sub: userId, type: "refresh" }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRE,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, JWT_REFRESH_SECRET);
}

function verifyToken(token) {
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  verifyToken,
};
