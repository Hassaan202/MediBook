const mongoose = require("mongoose");
const Doctor = require("../models/Doctor");
const User = require("../models/User");
const Appointment = require("../models/Appointment");
const { successResponse, errorResponse } = require("../utils/responseHandler");
const {
  HTTP_STATUS_CODES,
  ERROR_MESSAGES,
  USER_ROLES,
} = require("../config/constants");
const { getPagination, paginationMeta } = require("../utils/pagination");
const { startOfLocalDay } = require("../services/dateTimeService");
const { getAvailableSlots } = require("../services/appointmentService");
const { auditLogger } = require("../middleware/logger");
const { AUDIT_ACTIONS, AUDIT_CATEGORIES } = require("../config/constants");

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function clientMeta(req) {
  return {
    ipAddress: req.ip || req.socket?.remoteAddress || null,
    userAgent: req.get("user-agent") || null,
  };
}

async function getAllDoctors(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const match = { deletedAt: null };
    if (req.query.available !== undefined) {
      match.available = String(req.query.available) === "true";
    }
    if (req.query.specialty) {
      match.specialty = new RegExp(escapeRegex(req.query.specialty), "i");
    }
    if (req.query.minRating != null && req.query.minRating !== "") {
      match.rating = { $gte: parseFloat(req.query.minRating) };
    }
    if (req.query.minFees != null || req.query.maxFees != null) {
      match.fees = {};
      if (req.query.minFees != null && req.query.minFees !== "") {
        match.fees.$gte = parseFloat(req.query.minFees);
      }
      if (req.query.maxFees != null && req.query.maxFees !== "") {
        match.fees.$lte = parseFloat(req.query.maxFees);
      }
    }
    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userArr",
        },
      },
      { $unwind: "$userArr" },
    ];
    if (req.query.search) {
      pipeline.push({
        $match: {
          "userArr.name": new RegExp(escapeRegex(req.query.search), "i"),
        },
      });
    }
    pipeline.push({
      $facet: {
        data: [
          { $sort: { rating: -1, fees: 1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              specialty: 1,
              qualifications: 1,
              experience: 1,
              fees: 1,
              rating: 1,
              totalReviews: 1,
              available: 1,
              consultationDuration: 1,
              bio: 1,
              languages: 1,
              createdAt: 1,
              updatedAt: 1,
              user: {
                id: "$userArr._id",
                name: "$userArr.name",
                email: "$userArr.email",
                avatar: "$userArr.avatar",
                isActive: "$userArr.isActive",
              },
            },
          },
        ],
        total: [{ $count: "c" }],
      },
    });
    const agg = await Doctor.aggregate(pipeline);
    const row = agg[0] || { data: [], total: [] };
    const total = row.total[0]?.c || 0;
    const doctors = row.data.map((d) => {
      const { _id, ...rest } = d;
      return { id: _id, ...rest };
    });
    return successResponse(res, {
      doctors,
      pagination: paginationMeta(total, page, limit),
      filters: {
        specialty: req.query.specialty || null,
        available:
          req.query.available !== undefined
            ? String(req.query.available) === "true"
            : null,
        search: req.query.search || null,
      },
    });
  } catch (err) {
    return next(err);
  }
}

async function searchDoctors(req, res, next) {
  return getAllDoctors(req, res, next);
}

async function getDoctorById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(
        res,
        ERROR_MESSAGES.NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    const doc = await Doctor.findOne({ _id: id, deletedAt: null }).populate({
      path: "userDetails",
      select: "name email avatar role isActive createdAt",
    });
    if (!doc) {
      return errorResponse(
        res,
        ERROR_MESSAGES.DOCTOR_NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    return successResponse(res, { doctor: doc });
  } catch (err) {
    return next(err);
  }
}

async function createDoctor(req, res, next) {
  try {
    const u = await User.findById(req.body.userId);
    if (!u || u.role !== USER_ROLES.DOCTOR) {
      return errorResponse(
        res,
        ERROR_MESSAGES.NOT_FOUND,
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }
    const exists = await Doctor.findOne({ userId: u._id, deletedAt: null });
    if (exists) {
      return errorResponse(
        res,
        "Doctor profile already exists for this user",
        HTTP_STATUS_CODES.CONFLICT
      );
    }
    const doc = await Doctor.create({
      userId: u._id,
      specialty: req.body.specialty,
      qualifications: req.body.qualifications || [],
      experience: req.body.experience,
      fees: req.body.fees,
      bio: req.body.bio || "",
      languages: req.body.languages || ["English"],
      consultationDuration: req.body.consultationDuration || 30,
      workingHours: req.body.workingHours || {},
      availableSlots: req.body.availableSlots || [],
    });
    await auditLogger({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.USER_UPDATED,
      category: AUDIT_CATEGORIES.ADMIN,
      description: "Doctor profile created",
      resourceType: "user",
      resourceId: u._id,
      severity: "info",
      details: { doctorId: doc._id },
      ...clientMeta(req),
    });
    return successResponse(
      res,
      { doctor: doc },
      "Doctor created",
      HTTP_STATUS_CODES.CREATED
    );
  } catch (err) {
    return next(err);
  }
}

async function updateDoctor(req, res, next) {
  try {
    const { id } = req.params;
    const doc = await Doctor.findOne({ _id: id, deletedAt: null });
    if (!doc) {
      return errorResponse(
        res,
        ERROR_MESSAGES.DOCTOR_NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    const body = { ...req.body };
    if (req.user.role !== USER_ROLES.ADMIN) {
      delete body.rating;
      delete body.totalReviews;
    }
    const allowed = [
      "specialty",
      "qualifications",
      "experience",
      "fees",
      "bio",
      "languages",
      "consultationDuration",
      "workingHours",
      "rating",
      "totalReviews",
    ];
    allowed.forEach((k) => {
      if (body[k] !== undefined) doc[k] = body[k];
    });
    await doc.save();
    await auditLogger({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.USER_UPDATED,
      category: AUDIT_CATEGORIES.DATA,
      description: "Doctor profile updated",
      resourceType: "user",
      resourceId: doc.userId,
      severity: "info",
      details: { doctorId: doc._id },
      ...clientMeta(req),
    });
    return successResponse(res, { doctor: doc });
  } catch (err) {
    return next(err);
  }
}

async function deleteDoctor(req, res, next) {
  try {
    const { id } = req.params;
    const doc = await Doctor.findOne({ _id: id, deletedAt: null });
    if (!doc) {
      return errorResponse(
        res,
        ERROR_MESSAGES.DOCTOR_NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    doc.deletedAt = new Date();
    doc.available = false;
    await doc.save();
    await auditLogger({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.USER_DELETED,
      category: AUDIT_CATEGORIES.ADMIN,
      description: "Doctor profile soft deleted",
      resourceType: "user",
      resourceId: doc.userId,
      severity: "warning",
      details: { doctorId: doc._id },
      ...clientMeta(req),
    });
    return successResponse(res, null, "Doctor deleted");
  } catch (err) {
    return next(err);
  }
}

async function updateAvailability(req, res, next) {
  try {
    const { id } = req.params;
    const doc = await Doctor.findOne({ _id: id, deletedAt: null });
    if (!doc) {
      return errorResponse(
        res,
        ERROR_MESSAGES.DOCTOR_NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    if (req.body.available !== undefined) doc.available = req.body.available;
    if (req.body.availableSlots !== undefined) {
      doc.availableSlots = req.body.availableSlots;
    }
    await doc.save();
    await auditLogger({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.USER_UPDATED,
      category: AUDIT_CATEGORIES.DATA,
      description: "Doctor availability updated",
      resourceType: "user",
      resourceId: doc.userId,
      severity: "info",
      ...clientMeta(req),
    });
    return successResponse(res, { doctor: doc });
  } catch (err) {
    return next(err);
  }
}

async function getDoctorAppointments(req, res, next) {
  try {
    const { id } = req.params;
    const { page, limit, skip } = getPagination(req.query);
    const q = { doctorId: id };
    if (req.query.status) q.status = req.query.status;
    const [items, total] = await Promise.all([
      Appointment.find(q)
        .sort({ appointmentDate: -1, timeSlot: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: "patientDetails",
          populate: { path: "userDetails", select: "name email avatar" },
        })
        .lean(),
      Appointment.countDocuments(q),
    ]);
    return successResponse(res, {
      appointments: items,
      pagination: paginationMeta(total, page, limit),
    });
  } catch (err) {
    return next(err);
  }
}

async function getDoctorSchedule(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(
        res,
        ERROR_MESSAGES.NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    const doc = await Doctor.findOne({ _id: id, deletedAt: null });
    if (!doc) {
      return errorResponse(
        res,
        ERROR_MESSAGES.DOCTOR_NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    const out = [];
    const base = startOfLocalDay(new Date());
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(base.getTime() + i * 86400000);
      const slots = await getAvailableSlots(id, d);
      out.push({
        date: d.toISOString().slice(0, 10),
        slots,
      });
    }
    return successResponse(res, { schedule: out });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getAllDoctors,
  searchDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  updateAvailability,
  getDoctorAppointments,
  getDoctorSchedule,
};
