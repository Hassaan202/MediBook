const express = require("express");
const { body, param } = require("express-validator");
const { verifyToken } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validation");
const { isAdmin } = require("../middleware/roleCheck");
const { updateProfileValidator } = require("../validators/auth.validator");
const usersController = require("../controllers/users.controller");

const router = express.Router();

router.patch(
  "/me",
  verifyToken,
  ...updateProfileValidator,
  validateRequest,
  usersController.updateProfile
);

router.patch(
  "/:userId/active",
  verifyToken,
  isAdmin,
  param("userId").isMongoId(),
  body("isActive").isBoolean(),
  validateRequest,
  usersController.adminSetUserActive
);

module.exports = router;
