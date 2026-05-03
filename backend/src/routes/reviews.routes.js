const express = require("express");
const { verifyToken } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validation");
const { doctorOnly } = require("../middleware/doctorOnly");
const { isPatient } = require("../middleware/roleCheck");
const reviewsController = require("../controllers/reviews.controller");
const {
  createReviewValidator,
  updateReviewValidator,
  reviewResponseValidator,
} = require("../validators/reviewValidator");

const router = express.Router();

router.get("/doctor/:doctorId", reviewsController.getDoctorReviews);
router.get(
  "/patient/:patientId",
  verifyToken,
  reviewsController.getPatientReviews
);
router.post(
  "/",
  verifyToken,
  isPatient,
  ...createReviewValidator,
  validateRequest,
  reviewsController.createReview
);
router.put(
  "/:id",
  verifyToken,
  ...updateReviewValidator,
  validateRequest,
  reviewsController.updateReview
);
router.delete("/:id", verifyToken, reviewsController.deleteReview);
router.post(
  "/:id/response",
  verifyToken,
  doctorOnly,
  ...reviewResponseValidator,
  validateRequest,
  reviewsController.addDoctorResponse
);

module.exports = router;
