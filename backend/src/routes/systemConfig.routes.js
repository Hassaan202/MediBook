const { Router } = require("express");
const { verifyToken, optionalAuth } = require("../middleware/auth");
const { isAdmin } = require("../middleware/roleCheck");
const ctrl = require("../controllers/systemConfig.controller");

const router = Router();

// Get all configs — admin only
router.get("/", verifyToken, isAdmin, ctrl.getAllConfigs);

// Get configs by category — needs to be before /:key to avoid conflict
router.get("/category/:category", verifyToken, isAdmin, ctrl.getConfigsByCategory);

// Get specific config — optionally authenticated (public vs sensitive handled in controller)
router.get("/:key", optionalAuth, ctrl.getConfigByKey);

// Update config — admin only
router.put("/:key", verifyToken, isAdmin, ctrl.updateConfig);

module.exports = router;
