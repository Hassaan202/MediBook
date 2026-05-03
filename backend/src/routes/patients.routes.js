const express = require("express");
const patientsController = require("../controllers/patients.controller");
const { verifyToken } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validation");
const { isAdmin, isDoctorOrAdmin } = require("../middleware/roleCheck");
const {
  checkPatientAccess,
  checkPatientWriteAccess,
  checkPatientAppointmentsList,
} = require("../middleware/resourceOwnership");
const {
  createPatientValidator,
  updatePatientValidator,
} = require("../validators/patientValidator");

const router = express.Router();

router.get(
  "/",
  verifyToken,
  isDoctorOrAdmin,
  patientsController.getAllPatients
);
router.post(
  "/",
  verifyToken,
  isAdmin,
  ...createPatientValidator,
  validateRequest,
  patientsController.createPatient
);
router.get(
  "/:id/appointments",
  verifyToken,
  checkPatientAppointmentsList,
  patientsController.getPatientAppointments
);
router.get(
  "/:id/medical-history",
  verifyToken,
  checkPatientAccess,
  patientsController.getPatientMedicalHistory
);
router.get(
  "/:id",
  verifyToken,
  checkPatientAccess,
  patientsController.getPatientById
);
router.put(
  "/:id",
  verifyToken,
  checkPatientWriteAccess,
  ...updatePatientValidator,
  validateRequest,
  patientsController.updatePatient
);
router.delete(
  "/:id",
  verifyToken,
  isAdmin,
  patientsController.deletePatient
);

module.exports = router;
