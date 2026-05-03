const Review = require("../models/Review");
const Appointment = require("../models/Appointment");
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const { successResponse, errorResponse } = require("../utils/responseHandler");
const {
  HTTP_STATUS_CODES,
  ERROR_MESSAGES,
  USER_ROLES,
  AUDIT_ACTIONS,
  AUDIT_CATEGORIES,
} = require("../config/constants");
const { getPagination, paginationMeta } = require("../utils/pagination");
const { auditLogger } = require("../middleware/logger");
const { sendReviewReceived } = require("../services/notificationService");
const User = require("../models/User");

function clientMeta(req) {
  return {
    ipAddress: req.ip || req.socket?.remoteAddress || null,
    userAgent: req.get("user-agent") || null,
  };
}

async function getDoctorReviews(req, res, next) {
  try {
    const { doctorId } = req.params;
    const { page, limit, skip } = getPagination(req.query);
    const q = { doctorId };
    const [items, total] = await Promise.all([
      Review.find(q)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: "patientId",
          select: "userId",
          populate: { path: "userDetails", select: "name" },
        })
        .lean(),
      Review.countDocuments(q),
    ]);
    return successResponse(res, {
      reviews: items,
      pagination: paginationMeta(total, page, limit),
    });
  } catch (err) {
    return next(err);
  }
}

async function createReview(req, res, next) {
  try {
    const patient = await Patient.findOne({
      userId: req.user.userId,
      deletedAt: null,
    });
    if (!patient) {
      return errorResponse(
        res,
        ERROR_MESSAGES.PATIENT_NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    const appt = await Appointment.findOne({
      _id: req.body.appointmentId,
      patientId: patient._id,
      status: "completed",
    });
    if (!appt) {
      return errorResponse(
        res,
        ERROR_MESSAGES.APPOINTMENT_NOT_FOUND,
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }
    const exists = await Review.exists({ appointmentId: appt._id });
    if (exists) {
      return errorResponse(
        res,
        ERROR_MESSAGES.REVIEW_EXISTS,
        HTTP_STATUS_CODES.CONFLICT
      );
    }
    const rev = await Review.create({
      patientId: patient._id,
      doctorId: appt.doctorId,
      appointmentId: appt._id,
      rating: req.body.rating,
      comment: req.body.comment || "",
      isAnonymous: Boolean(req.body.isAnonymous),
    });
    await Review.updateDoctorRating(appt.doctorId);
    const doctor = await Doctor.findById(appt.doctorId).select("userId").lean();
    if (doctor) {
      const du = await User.findById(doctor.userId).select("_id").lean();
      if (du) {
        await sendReviewReceived(du._id, rev._id);
      }
    }
    await auditLogger({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.REVIEW_CREATED,
      category: AUDIT_CATEGORIES.CLINICAL,
      description: "Review created",
      resourceType: "appointment",
      resourceId: appt._id,
      severity: "info",
      ...clientMeta(req),
    });
    return successResponse(
      res,
      { review: rev },
      "Review created",
      HTTP_STATUS_CODES.CREATED
    );
  } catch (err) {
    return next(err);
  }
}

async function updateReview(req, res, next) {
  try {
    const rev = await Review.findById(req.params.id);
    if (!rev) {
      return errorResponse(
        res,
        ERROR_MESSAGES.REVIEW_NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    const patient = await Patient.findOne({
      userId: req.user.userId,
      deletedAt: null,
    }).select("_id");
    if (!patient || String(patient._id) !== String(rev.patientId)) {
      return errorResponse(
        res,
        ERROR_MESSAGES.FORBIDDEN,
        HTTP_STATUS_CODES.FORBIDDEN
      );
    }
    if (req.body.rating != null) rev.rating = req.body.rating;
    if (req.body.comment != null) rev.comment = req.body.comment;
    if (req.body.isAnonymous != null) rev.isAnonymous = req.body.isAnonymous;
    await rev.save();
    await Review.updateDoctorRating(rev.doctorId);
    await auditLogger({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.REVIEW_UPDATED,
      category: AUDIT_CATEGORIES.CLINICAL,
      description: "Review updated",
      resourceType: "appointment",
      resourceId: rev.appointmentId,
      severity: "info",
      ...clientMeta(req),
    });
    return successResponse(res, { review: rev });
  } catch (err) {
    return next(err);
  }
}

async function deleteReview(req, res, next) {
  try {
    const rev = await Review.findById(req.params.id);
    if (!rev) {
      return errorResponse(
        res,
        ERROR_MESSAGES.REVIEW_NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    if (req.user.role !== USER_ROLES.ADMIN) {
      const patient = await Patient.findOne({
        userId: req.user.userId,
        deletedAt: null,
      }).select("_id");
      if (!patient || String(patient._id) !== String(rev.patientId)) {
        return errorResponse(
          res,
          ERROR_MESSAGES.FORBIDDEN,
          HTTP_STATUS_CODES.FORBIDDEN
        );
      }
    }
    const doctorId = rev.doctorId;
    const apptId = rev.appointmentId;
    await rev.deleteOne();
    await Review.updateDoctorRating(doctorId);
    await auditLogger({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.REVIEW_UPDATED,
      category: AUDIT_CATEGORIES.CLINICAL,
      description: "Review deleted",
      resourceType: "appointment",
      resourceId: apptId,
      severity: "warning",
      ...clientMeta(req),
    });
    return successResponse(res, null, "Review deleted");
  } catch (err) {
    return next(err);
  }
}

async function addDoctorResponse(req, res, next) {
  try {
    const rev = await Review.findById(req.params.id);
    if (!rev) {
      return errorResponse(
        res,
        ERROR_MESSAGES.REVIEW_NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    const doctor = await Doctor.findOne({
      userId: req.user.userId,
      deletedAt: null,
    }).select("_id");
    if (!doctor || String(doctor._id) !== String(rev.doctorId)) {
      return errorResponse(
        res,
        ERROR_MESSAGES.FORBIDDEN,
        HTTP_STATUS_CODES.FORBIDDEN
      );
    }
    await rev.addDoctorResponse(req.body.response);
    await auditLogger({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.REVIEW_UPDATED,
      category: AUDIT_CATEGORIES.CLINICAL,
      description: "Doctor responded to review",
      resourceType: "appointment",
      resourceId: rev.appointmentId,
      severity: "info",
      ...clientMeta(req),
    });
    return successResponse(res, { review: rev });
  } catch (err) {
    return next(err);
  }
}

async function getPatientReviews(req, res, next) {
  try {
    const { patientId } = req.params;
    if (req.user.role === USER_ROLES.ADMIN) {
    } else if (req.user.role === USER_ROLES.PATIENT) {
      const p = await Patient.findOne({
        userId: req.user.userId,
        deletedAt: null,
      }).select("_id");
      if (!p || String(p._id) !== String(patientId)) {
        return errorResponse(
          res,
          ERROR_MESSAGES.FORBIDDEN,
          HTTP_STATUS_CODES.FORBIDDEN
        );
      }
    } else {
      return errorResponse(
        res,
        ERROR_MESSAGES.FORBIDDEN,
        HTTP_STATUS_CODES.FORBIDDEN
      );
    }
    const { page, limit, skip } = getPagination(req.query);
    const q = { patientId };
    const [items, total] = await Promise.all([
      Review.find(q)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(q),
    ]);
    return successResponse(res, {
      reviews: items,
      pagination: paginationMeta(total, page, limit),
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getDoctorReviews,
  createReview,
  updateReview,
  deleteReview,
  addDoctorResponse,
  getPatientReviews,
};
