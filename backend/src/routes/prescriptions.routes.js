const express = require("express");
const { verifyToken } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validation");
const { doctorOnly } = require("../middleware/doctorOnly");
const prescriptionsController = require("../controllers/prescriptions.controller");
const {
  loadPrescription,
  assertPrescriptionRead,
  assertPrescriptionDoctorWrite,
} = require("../middleware/recordOwnership");
const {
  createPrescriptionValidator,
  updatePrescriptionValidator,
  addMedicationValidator,
  prescriptionStatusValidator,
  medicationIndexParam,
} = require("../validators/prescriptionValidator");

const router = express.Router();

router.get(
  "/patient/:patientId/active",
  verifyToken,
  prescriptionsController.getActivePrescriptions
);
router.get(
  "/patient/:patientId",
  verifyToken,
  prescriptionsController.getPatientPrescriptions
);
router.get("/", verifyToken, prescriptionsController.getAllPrescriptions);
router.get(
  "/:id/pdf",
  verifyToken,
  loadPrescription,
  assertPrescriptionRead,
  prescriptionsController.generatePDF
);
router.get(
  "/:id",
  verifyToken,
  loadPrescription,
  assertPrescriptionRead,
  prescriptionsController.getPrescriptionById
);
router.post(
  "/",
  verifyToken,
  doctorOnly,
  ...createPrescriptionValidator,
  validateRequest,
  prescriptionsController.createPrescription
);
router.put(
  "/:id",
  verifyToken,
  loadPrescription,
  assertPrescriptionDoctorWrite,
  ...updatePrescriptionValidator,
  validateRequest,
  prescriptionsController.updatePrescription
);
router.delete(
  "/:id",
  verifyToken,
  loadPrescription,
  assertPrescriptionDoctorWrite,
  prescriptionsController.cancelPrescription
);
router.post(
  "/:id/medications",
  verifyToken,
  loadPrescription,
  assertPrescriptionDoctorWrite,
  ...addMedicationValidator,
  validateRequest,
  prescriptionsController.addMedication
);
router.delete(
  "/:id/medications/:medicationIndex",
  verifyToken,
  loadPrescription,
  assertPrescriptionDoctorWrite,
  ...medicationIndexParam,
  validateRequest,
  prescriptionsController.removeMedication
);
router.patch(
  "/:id/status",
  verifyToken,
  loadPrescription,
  assertPrescriptionDoctorWrite,
  ...prescriptionStatusValidator,
  validateRequest,
  prescriptionsController.updateStatus
);

module.exports = router;
