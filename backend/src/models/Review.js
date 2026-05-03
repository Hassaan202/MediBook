const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
      unique: true,
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "" },
    isAnonymous: { type: Boolean, default: false },
    response: { type: String, default: null },
    respondedAt: { type: Date, default: null },
    isApproved: { type: Boolean, default: true },
  },
  { timestamps: true }
);

reviewSchema.index({ doctorId: 1, createdAt: -1 });
reviewSchema.index({ patientId: 1, createdAt: -1 });
reviewSchema.index({ rating: 1 });

reviewSchema.methods.addDoctorResponse = async function addDoctorResponseMethod(
  response
) {
  this.response = response;
  this.respondedAt = new Date();
  return this.save();
};

reviewSchema.statics.getDoctorAverageRating =
  async function getDoctorAverageRatingStatic(doctorId) {
    const id =
      doctorId instanceof mongoose.Types.ObjectId
        ? doctorId
        : new mongoose.Types.ObjectId(String(doctorId));
    const agg = await this.aggregate([
      { $match: { doctorId: id } },
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    if (!agg.length) return { average: 0, count: 0 };
    const avgVal = agg[0].avg != null ? agg[0].avg : 0;
    return {
      average: Number(avgVal.toFixed(2)),
      count: agg[0].count,
    };
  };

reviewSchema.statics.updateDoctorRating = async function updateDoctorRatingStatic(
  doctorId
) {
  const Doctor = require("./Doctor");
  const stats = await this.getDoctorAverageRating(doctorId);
  await Doctor.updateOne(
    { _id: doctorId },
    { rating: stats.average, totalReviews: stats.count }
  );
  return stats;
};

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
