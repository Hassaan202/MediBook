const express = require("express");
const { verifyToken } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validation");
const { isAdmin } = require("../middleware/roleCheck");
const { doctorOnly } = require("../middleware/doctorOnly");
const medicalRecordsController = require("../controllers/medicalRecords.controller");
const {
  loadMedicalRecord,
  assertMedicalRecordRead,
  assertMedicalRecordWrite,
} = require("../middleware/recordOwnership");
const {
  createMedicalRecordValidator,
  updateMedicalRecordValidator,
  labResultValidator,
  searchMedicalRecordsValidator,
  attachmentIdParam,
} = require("../validators/medicalRecordValidator");
const {
  uploadAttachment,
  handleUploadError,
} = require("../middleware/fileUpload");

const router = express.Router();

router.get(
  "/search",
  verifyToken,
  ...searchMedicalRecordsValidator,
  validateRequest,
  medicalRecordsController.searchRecords
);
router.get(
  "/patient/:patientId/summary",
  verifyToken,
  medicalRecordsController.getPatientSummary
);
router.get(
  "/patient/:patientId",
  verifyToken,
  medicalRecordsController.getPatientHistory
);
router.get("/", verifyToken, medicalRecordsController.getAllRecords);
router.get(
  "/:id",
  verifyToken,
  loadMedicalRecord,
  assertMedicalRecordRead,
  medicalRecordsController.getRecordById
);
router.post(
  "/",
  verifyToken,
  doctorOnly,
  ...createMedicalRecordValidator,
  validateRequest,
  medicalRecordsController.createRecord
);
router.put(
  "/:id",
  verifyToken,
  loadMedicalRecord,
  assertMedicalRecordWrite,
  ...updateMedicalRecordValidator,
  validateRequest,
  medicalRecordsController.updateRecord
);
router.delete(
  "/:id",
  verifyToken,
  isAdmin,
  medicalRecordsController.deleteRecord
);
router.post(
  "/:id/attachments",
  verifyToken,
  loadMedicalRecord,
  assertMedicalRecordWrite,
  uploadAttachment,
  handleUploadError,
  medicalRecordsController.addAttachment
);
router.delete(
  "/:id/attachments/:attachmentId",
  verifyToken,
  loadMedicalRecord,
  assertMedicalRecordWrite,
  ...attachmentIdParam,
  validateRequest,
  medicalRecordsController.removeAttachment
);
router.post(
  "/:id/lab-results",
  verifyToken,
  loadMedicalRecord,
  assertMedicalRecordWrite,
  ...labResultValidator,
  validateRequest,
  medicalRecordsController.addLabResult
);

module.exports = router;
