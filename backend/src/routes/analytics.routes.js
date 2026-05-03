const { Router } = require("express");
const { verifyToken } = require("../middleware/auth");
const { isAdmin, isDoctorOrAdmin } = require("../middleware/roleCheck");
const ctrl = require("../controllers/analytics.controller");

const router = Router();

// All analytics routes require authentication
router.use(verifyToken);

// Dashboard & general — admin only
router.get("/dashboard", isAdmin, ctrl.getDashboardAnalytics);

// Appointment analytics — admin only
router.get("/appointments", isAdmin, ctrl.getAppointmentAnalytics);

// Doctor analytics — doctor can see their own, admin can see all
router.get("/doctors/:doctorId", isDoctorOrAdmin, ctrl.getDoctorAnalytics);

// Patient analytics — admin only (doctors have access via medical records routes)
router.get("/patients/:patientId", isAdmin, ctrl.getPatientAnalytics);

// Trends — admin only
router.get("/trends", isAdmin, ctrl.getTrends);

// Specialty analytics — admin only
router.get("/specialties", isAdmin, ctrl.getSpecialtyAnalytics);

module.exports = router;
