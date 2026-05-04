const express = require("express");
const rateLimit = require("express-rate-limit");
const { RATE_LIMITING_ENABLED } = require("../config/env");
const authController = require("../controllers/auth.controller");
const { verifyToken } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validation");
const {
  registerValidator,
  verifyEmailValidator,
  resendVerificationValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  refreshTokenValidator,
} = require("../validators/auth.validator");

const router = express.Router();

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !RATE_LIMITING_ENABLED,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !RATE_LIMITING_ENABLED,
});

const passwordFlowLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !RATE_LIMITING_ENABLED,
});

router.post(
  "/register",
  registerLimiter,
  ...registerValidator,
  validateRequest,
  authController.register
);

router.post(
  "/verify-email",
  registerLimiter,
  ...verifyEmailValidator,
  validateRequest,
  authController.verifyEmail
);

router.post(
  "/resend-verification",
  registerLimiter,
  ...resendVerificationValidator,
  validateRequest,
  authController.resendVerification
);

router.post(
  "/login",
  loginLimiter,
  ...loginValidator,
  validateRequest,
  authController.login
);

router.post("/logout", verifyToken, authController.logout);

router.post(
  "/refresh-token",
  passwordFlowLimiter,
  ...refreshTokenValidator,
  validateRequest,
  authController.refreshToken
);

router.post(
  "/forgot-password",
  passwordFlowLimiter,
  ...forgotPasswordValidator,
  validateRequest,
  authController.forgotPassword
);

router.post(
  "/reset-password",
  passwordFlowLimiter,
  ...resetPasswordValidator,
  validateRequest,
  authController.resetPassword
);

router.get("/me", verifyToken, authController.getCurrentUser);

module.exports = router;
