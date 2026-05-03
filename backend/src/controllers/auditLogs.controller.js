const AuditLog = require("../models/AuditLog");
const { successResponse } = require("../utils/responseHandler");
const { getPagination, paginationMeta } = require("../utils/pagination");

async function listAuditLogs(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const q = {};
    if (req.query.category) {
      q.category = String(req.query.category);
    }
    if (req.query.action) {
      q.action = String(req.query.action);
    }
    const [items, total] = await Promise.all([
      AuditLog.find(q)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: "userId", select: "name email" })
        .lean(),
      AuditLog.countDocuments(q),
    ]);
    const rows = items.map((row) => {
      const u = row.userId;
      const userName =
        u && typeof u === "object" && u.name ? u.name : "Unknown user";
      return {
        id: row._id,
        userId: u && u._id ? u._id : row.userId,
        userName,
        userEmail: u && u.email ? u.email : "",
        action: row.action,
        details: row.description,
        type: row.category,
        severity: row.severity,
        timestamp: row.timestamp,
        resourceType: row.resourceType,
        resourceId: row.resourceId,
      };
    });
    return successResponse(res, {
      logs: rows,
      pagination: paginationMeta(total, page, limit),
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { listAuditLogs };
