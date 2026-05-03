const express = require("express");
const { verifyToken } = require("../middleware/auth");
const { isAdmin } = require("../middleware/roleCheck");
const auditLogsController = require("../controllers/auditLogs.controller");

const router = express.Router();

router.get("/", verifyToken, isAdmin, auditLogsController.listAuditLogs);

module.exports = router;
