const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const User = require("../models/User");
const Appointment = require("../models/Appointment");
const MedicalRecord = require("../models/MedicalRecord");
const { generatePatientSummary } = require("../services/medicalRecordService");
const { successResponse, errorResponse } = require("../utils/responseHandler");
const {
  HTTP_STATUS_CODES,
  ERROR_MESSAGES,
  USER_ROLES,
} = require("../config/constants");
const { getPagination, paginationMeta } = require("../utils/pagination");
const { auditLogger } = require("../middleware/logger");
const { AUDIT_ACTIONS, AUDIT_CATEGORIES } = require("../config/constants");

function clientMeta(req) {
  return {
    ipAddress: req.ip || req.socket?.remoteAddress || null,
    userAgent: req.get("user-agent") || null,
  };
}

async function getAllPatients(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const match = { deletedAt: null };
    if (req.query.search) {
      const rx = new RegExp(
        String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );
      const users = await User.find({ name: rx, role: USER_ROLES.PATIENT })
        .select("_id")
        .lean();
      if (!users.length) {
        return successResponse(res, {
          patients: [],
          pagination: paginationMeta(0, page, limit),
        });
      }
      match.userId = { $in: users.map((u) => u._id) };
    }
    const [items, total] = await Promise.all([
      Patient.find(match)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: "userDetails",
          select: "name email avatar role isActive createdAt",
        })
        .lean({ virtuals: true }),
      Patient.countDocuments(match),
    ]);
    return successResponse(res, {
      patients: items,
      pagination: paginationMeta(total, page, limit),
    });
  } catch (err) {
    return next(err);
  }
}

async function getPatientById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(
        res,
        ERROR_MESSAGES.NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    const doc = await Patient.findOne({ _id: id, deletedAt: null }).populate({
      path: "userDetails",
      select: "name email avatar role isActive createdAt",
    });
    if (!doc) {
      return errorResponse(
        res,
        ERROR_MESSAGES.PATIENT_NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    return successResponse(res, { patient: doc });
  } catch (err) {
    return next(err);
  }
}

async function createPatient(req, res, next) {
  try {
    const u = await User.findById(req.body.userId);
    if (!u || u.role !== USER_ROLES.PATIENT) {
      return errorResponse(
        res,
        ERROR_MESSAGES.NOT_FOUND,
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }
    const exists = await Patient.findOne({ userId: u._id, deletedAt: null });
    if (exists) {
      return errorResponse(
        res,
        "Patient profile already exists for this user",
        HTTP_STATUS_CODES.CONFLICT
      );
    }
    const doc = await Patient.create({
      userId: u._id,
      dateOfBirth: req.body.dateOfBirth,
      gender: req.body.gender,
      bloodType: req.body.bloodType,
      phone: req.body.phone,
      address: req.body.address,
      emergencyContact: req.body.emergencyContact,
      allergies: req.body.allergies || [],
      chronicConditions: req.body.chronicConditions || [],
      currentMedications: req.body.currentMedications || [],
      insuranceInfo: req.body.insuranceInfo,
      height: req.body.height,
      weight: req.body.weight,
    });
    await auditLogger({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.USER_UPDATED,
      category: AUDIT_CATEGORIES.ADMIN,
      description: "Patient profile created",
      resourceType: "user",
      resourceId: u._id,
      severity: "info",
      details: { patientId: doc._id },
      ...clientMeta(req),
    });
    return successResponse(
      res,
      { patient: doc },
      "Patient created",
      HTTP_STATUS_CODES.CREATED
    );
  } catch (err) {
    return next(err);
  }
}

async function updatePatient(req, res, next) {
  try {
    const { id } = req.params;
    const doc = await Patient.findOne({ _id: id, deletedAt: null });
    if (!doc) {
      return errorResponse(
        res,
        ERROR_MESSAGES.PATIENT_NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    const keys = [
      "dateOfBirth",
      "gender",
      "bloodType",
      "phone",
      "address",
      "emergencyContact",
      "allergies",
      "chronicConditions",
      "currentMedications",
      "insuranceInfo",
      "height",
      "weight",
    ];
    keys.forEach((k) => {
      if (req.body[k] !== undefined) doc[k] = req.body[k];
    });
    await doc.save();
    await auditLogger({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.USER_UPDATED,
      category: AUDIT_CATEGORIES.DATA,
      description: "Patient profile updated",
      resourceType: "user",
      resourceId: doc.userId,
      severity: "info",
      details: { patientId: doc._id },
      ...clientMeta(req),
    });
    return successResponse(res, { patient: doc });
  } catch (err) {
    return next(err);
  }
}

async function deletePatient(req, res, next) {
  try {
    const { id } = req.params;
    const doc = await Patient.findOne({ _id: id, deletedAt: null });
    if (!doc) {
      return errorResponse(
        res,
        ERROR_MESSAGES.PATIENT_NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    doc.deletedAt = new Date();
    await doc.save();
    await auditLogger({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.USER_DELETED,
      category: AUDIT_CATEGORIES.ADMIN,
      description: "Patient profile soft deleted",
      resourceType: "user",
      resourceId: doc.userId,
      severity: "warning",
      details: { patientId: doc._id },
      ...clientMeta(req),
    });
    return successResponse(res, null, "Patient deleted");
  } catch (err) {
    return next(err);
  }
}

async function getPatientAppointments(req, res, next) {
  try {
    const { id } = req.params;
    const { page, limit, skip } = getPagination(req.query);
    const q = { patientId: id };
    if (req.query.status) q.status = req.query.status;
    const [items, total] = await Promise.all([
      Appointment.find(q)
        .sort({ appointmentDate: -1, timeSlot: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: "doctorDetails",
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

async function getPatientMedicalHistory(req, res, next) {
  try {
    const { id } = req.params;
    const summary = await generatePatientSummary(id);
    if (!summary) {
      return errorResponse(
        res,
        ERROR_MESSAGES.PATIENT_NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    const q = { patientId: id, deletedAt: null };
    if (req.user.role === USER_ROLES.PATIENT) {
      q.isConfidential = false;
    }
    const records = await MedicalRecord.find(q)
      .sort({ visitDate: -1 })
      .limit(50)
      .lean();
    await auditLogger({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.MEDICAL_RECORD_VIEWED,
      category: AUDIT_CATEGORIES.CLINICAL,
      description: "Patient medical history viewed",
      severity: "info",
      details: { patientId: String(id) },
      ...clientMeta(req),
    });
    return successResponse(res, { summary, records });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getAllPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
  getPatientAppointments,
  getPatientMedicalHistory,
};
