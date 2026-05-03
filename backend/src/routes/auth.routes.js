const express = require("express");
const rateLimit = require("express-rate-limit");
const authController = require("../controllers/auth.controller");
const { verifyToken } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validation");
const {
  registerValidator,
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
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordFlowLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post(
  "/register",
  registerLimiter,
  ...registerValidator,
  validateRequest,
  authController.register
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
