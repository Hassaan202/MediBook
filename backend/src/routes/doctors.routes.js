const express = require("express");
const doctorsController = require("../controllers/doctors.controller");
const { verifyToken } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validation");
const { isAdmin, isDoctorOrAdmin } = require("../middleware/roleCheck");
const { checkDoctorOwnership } = require("../middleware/resourceOwnership");
const {
  createDoctorValidator,
  updateDoctorValidator,
  updateAvailabilityValidator,
} = require("../validators/doctorValidator");

const router = express.Router();

router.get("/search", doctorsController.searchDoctors);
router.get("/", doctorsController.getAllDoctors);
router.get(
  "/:id/appointments",
  verifyToken,
  isDoctorOrAdmin,
  checkDoctorOwnership,
  doctorsController.getDoctorAppointments
);
router.get("/:id/schedule", doctorsController.getDoctorSchedule);
router.get("/:id", doctorsController.getDoctorById);
router.post(
  "/",
  verifyToken,
  isAdmin,
  ...createDoctorValidator,
  validateRequest,
  doctorsController.createDoctor
);
router.put(
  "/:id",
  verifyToken,
  isDoctorOrAdmin,
  checkDoctorOwnership,
  ...updateDoctorValidator,
  validateRequest,
  doctorsController.updateDoctor
);
router.patch(
  "/:id/availability",
  verifyToken,
  isDoctorOrAdmin,
  checkDoctorOwnership,
  ...updateAvailabilityValidator,
  validateRequest,
  doctorsController.updateAvailability
);
router.delete(
  "/:id",
  verifyToken,
  isAdmin,
  doctorsController.deleteDoctor
);

module.exports = router;
