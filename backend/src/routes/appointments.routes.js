const express = require("express");
const appointmentsController = require("../controllers/appointments.controller");
const { verifyToken } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validation");
const { isPatient, isDoctor, isDoctorOrAdmin } = require("../middleware/roleCheck");
const { checkAppointmentOwnership } = require("../middleware/resourceOwnership");
const {
  bookAppointmentValidator,
  updateAppointmentValidator,
  cancelAppointmentValidator,
  statusValidator,
  confirmValidator,
  rescheduleValidator,
  checkAvailabilityQueryValidator,
} = require("../validators/appointmentValidator");

const router = express.Router();

router.get(
  "/check-availability",
  ...checkAvailabilityQueryValidator,
  validateRequest,
  appointmentsController.checkAvailability
);
router.get(
  "/upcoming",
  verifyToken,
  appointmentsController.getUpcomingAppointments
);
router.get(
  "/past",
  verifyToken,
  appointmentsController.getPastAppointments
);
router.post(
  "/",
  verifyToken,
  isPatient,
  ...bookAppointmentValidator,
  validateRequest,
  appointmentsController.bookAppointment
);
router.get(
  "/",
  verifyToken,
  appointmentsController.getAllAppointments
);
router.get(
  "/:id",
  verifyToken,
  checkAppointmentOwnership,
  appointmentsController.getAppointmentById
);
router.put(
  "/:id",
  verifyToken,
  checkAppointmentOwnership,
  ...updateAppointmentValidator,
  validateRequest,
  appointmentsController.updateAppointment
);
router.delete(
  "/:id",
  verifyToken,
  checkAppointmentOwnership,
  ...cancelAppointmentValidator,
  validateRequest,
  appointmentsController.cancelAppointment
);
router.patch(
  "/:id/status",
  verifyToken,
  isDoctorOrAdmin,
  checkAppointmentOwnership,
  ...statusValidator,
  validateRequest,
  appointmentsController.updateAppointmentStatus
);
router.patch(
  "/:id/confirm",
  verifyToken,
  isDoctor,
  checkAppointmentOwnership,
  ...confirmValidator,
  validateRequest,
  appointmentsController.confirmAppointment
);
router.post(
  "/:id/reschedule",
  verifyToken,
  checkAppointmentOwnership,
  ...rescheduleValidator,
  validateRequest,
  appointmentsController.rescheduleAppointment
);

module.exports = router;
