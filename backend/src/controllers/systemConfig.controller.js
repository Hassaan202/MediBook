const SystemConfig = require("../models/SystemConfig");
const { auditLogger } = require("../middleware/logger");
const { successResponse, errorResponse } = require("../utils/responseHandler");
const { HTTP_STATUS_CODES, ERROR_MESSAGES, AUDIT_CATEGORIES } = require("../config/constants");

function clientMeta(req) {
  return {
    ipAddress: req.ip || req.socket?.remoteAddress || null,
    userAgent: req.get("user-agent") || null,
  };
}

/**
 * GET /api/system-config
 * Admin only — returns all configs grouped by category.
 */
async function getAllConfigs(req, res, next) {
  try {
    const configs = await SystemConfig.find({}).lean();

    // Group by category
    const grouped = configs.reduce((acc, c) => {
      if (!acc[c.category]) acc[c.category] = [];
      acc[c.category].push({
        key: c.key,
        value: c.value,
        description: c.description,
        isEditable: c.isEditable,
        updatedAt: c.updatedAt,
      });
      return acc;
    }, {});

    return successResponse(res, { configs, grouped });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/system-config/:key
 * Returns a specific config value. Public configs are available to all, sensitive to admin only.
 */
async function getConfigByKey(req, res, next) {
  try {
    const config = await SystemConfig.findOne({ key: req.params.key }).lean();
    if (!config) {
      return errorResponse(res, ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
    }

    // Sensitive configs restricted to admin
    const sensitiveKeys = ["jwt_expire", "jwt_refresh_expire", "admin_email"];
    if (sensitiveKeys.includes(config.key) && req.user?.role !== "admin") {
      return errorResponse(res, ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS_CODES.FORBIDDEN);
    }

    return successResponse(res, config);
  } catch (err) {
    return next(err);
  }
}

/**
 * PUT /api/system-config/:key
 * Admin only — update a config value.
 */
async function updateConfig(req, res, next) {
  try {
    const { value } = req.body;
    if (value === undefined) {
      return errorResponse(res, "value is required", HTTP_STATUS_CODES.BAD_REQUEST);
    }

    const config = await SystemConfig.findOne({ key: req.params.key });
    if (!config) {
      return errorResponse(res, ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
    }
    if (!config.isEditable) {
      return errorResponse(res, "This configuration is not editable", HTTP_STATUS_CODES.FORBIDDEN);
    }

    const oldValue = config.value;
    const updated = await SystemConfig.updateConfig(req.params.key, value, req.user.userId);

    await auditLogger({
      userId: req.user.userId,
      action: "system_config_changed",
      category: AUDIT_CATEGORIES.SYSTEM,
      description: `System config updated: ${req.params.key}`,
      details: { before: { value: oldValue }, after: { value } },
      severity: "critical",
      ...clientMeta(req),
    });

    return successResponse(res, updated, "Configuration updated");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/system-config/category/:category
 * Get all configs in a category.
 */
async function getConfigsByCategory(req, res, next) {
  try {
    const validCategories = ["general", "appointment", "notification", "payment", "security"];
    if (!validCategories.includes(req.params.category)) {
      return errorResponse(res, "Invalid category", HTTP_STATUS_CODES.BAD_REQUEST);
    }

    const configs = await SystemConfig.getByCategory(req.params.category);
    const kvMap = configs.reduce((acc, c) => {
      acc[c.key] = c.value;
      return acc;
    }, {});

    return successResponse(res, { configs, kvMap });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getAllConfigs,
  getConfigByKey,
  updateConfig,
  getConfigsByCategory,
};
