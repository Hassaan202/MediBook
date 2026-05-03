const { Router } = require("express");
const { verifyToken } = require("../middleware/auth");
const { isAdmin } = require("../middleware/roleCheck");
const ctrl = require("../controllers/admin.controller");

const router = Router();

// All admin routes require authentication + admin role
router.use(verifyToken, isAdmin);

// Dashboard
router.get("/dashboard", ctrl.getDashboardStats);

// User management
router.get("/users", ctrl.getAllUsers);
router.get("/pending-registrations", ctrl.getPendingRegistrations);
router.get("/users/:id", ctrl.getUserById);
router.post("/users", ctrl.createUser);
router.post("/registrations/:id/approve", ctrl.approveRegistration);
router.post("/registrations/:id/reject", ctrl.rejectRegistration);
router.put("/users/:id", ctrl.updateUser);
router.delete("/users/:id", ctrl.deleteUser);
router.patch("/users/:id/activate", ctrl.activateUser);
router.patch("/users/:id/deactivate", ctrl.deactivateUser);
router.patch("/users/:id/reset-password", ctrl.resetUserPassword);

// Logs
router.get("/audit-logs", ctrl.getAuditLogs);
router.get("/activity-logs", ctrl.getActivityLogs);

// Statistics & reports
router.get("/statistics", ctrl.getStatistics);
router.get("/reports/appointments", ctrl.getAppointmentReports);
router.get("/reports/revenue", ctrl.getRevenueReport);
router.get("/reports/doctors", ctrl.getDoctorReports);
router.get("/reports/patients", ctrl.getPatientReports);

// Announcements & health
router.post("/announcements", ctrl.createAnnouncement);
router.get("/system-health", ctrl.systemHealthCheck);

module.exports = router;
