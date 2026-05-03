const mongoose = require("mongoose");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const Appointment = require("../models/Appointment");
const { errorResponse } = require("../utils/responseHandler");
const {
  HTTP_STATUS_CODES,
  ERROR_MESSAGES,
  USER_ROLES,
} = require("../config/constants");

async function checkDoctorOwnership(req, res, next) {
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
    if (req.user.role === USER_ROLES.ADMIN) {
      return next();
    }
    if (
      req.user.role === USER_ROLES.DOCTOR &&
      String(doc.userId) === String(req.user.userId)
    ) {
      return next();
    }
    return errorResponse(
      res,
      ERROR_MESSAGES.FORBIDDEN,
      HTTP_STATUS_CODES.FORBIDDEN
    );
  } catch (err) {
    return next(err);
  }
}

async function checkPatientAccess(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(
        res,
        ERROR_MESSAGES.NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    const doc = await Patient.findOne({ _id: id, deletedAt: null });
    if (!doc) {
      return errorResponse(
        res,
        ERROR_MESSAGES.PATIENT_NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    if (req.user.role === USER_ROLES.ADMIN) {
      return next();
    }
    if (req.user.role === USER_ROLES.DOCTOR) {
      return next();
    }
    if (
      req.user.role === USER_ROLES.PATIENT &&
      String(doc.userId) === String(req.user.userId)
    ) {
      return next();
    }
    return errorResponse(
      res,
      ERROR_MESSAGES.FORBIDDEN,
      HTTP_STATUS_CODES.FORBIDDEN
    );
  } catch (err) {
    return next(err);
  }
}

async function checkPatientAppointmentsList(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(
        res,
        ERROR_MESSAGES.NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    if (req.user.role === USER_ROLES.ADMIN) {
      return next();
    }
    if (req.user.role === USER_ROLES.PATIENT) {
      const doc = await Patient.findOne({ _id: id, deletedAt: null });
      if (doc && String(doc.userId) === String(req.user.userId)) {
        return next();
      }
    }
    return errorResponse(
      res,
      ERROR_MESSAGES.FORBIDDEN,
      HTTP_STATUS_CODES.FORBIDDEN
    );
  } catch (err) {
    return next(err);
  }
}

async function checkPatientWriteAccess(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(
        res,
        ERROR_MESSAGES.NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    const doc = await Patient.findOne({ _id: id, deletedAt: null });
    if (!doc) {
      return errorResponse(
        res,
        ERROR_MESSAGES.PATIENT_NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    if (req.user.role === USER_ROLES.ADMIN) {
      return next();
    }
    if (
      req.user.role === USER_ROLES.PATIENT &&
      String(doc.userId) === String(req.user.userId)
    ) {
      return next();
    }
    return errorResponse(
      res,
      ERROR_MESSAGES.FORBIDDEN,
      HTTP_STATUS_CODES.FORBIDDEN
    );
  } catch (err) {
    return next(err);
  }
}

async function checkAppointmentOwnership(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(
        res,
        ERROR_MESSAGES.NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    const appt = await Appointment.findById(id);
    if (!appt) {
      return errorResponse(
        res,
        ERROR_MESSAGES.APPOINTMENT_NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    if (req.user.role === USER_ROLES.ADMIN) {
      req.appointment = appt;
      return next();
    }
    if (req.user.role === USER_ROLES.PATIENT) {
      const p = await Patient.findOne({
        userId: req.user.userId,
        deletedAt: null,
      }).select("_id");
      if (p && String(p._id) === String(appt.patientId)) {
        req.appointment = appt;
        return next();
      }
    }
    if (req.user.role === USER_ROLES.DOCTOR) {
      const d = await Doctor.findOne({
        userId: req.user.userId,
        deletedAt: null,
      }).select("_id");
      if (d && String(d._id) === String(appt.doctorId)) {
        req.appointment = appt;
        return next();
      }
    }
    return errorResponse(
      res,
      ERROR_MESSAGES.FORBIDDEN,
      HTTP_STATUS_CODES.FORBIDDEN
    );
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  checkDoctorOwnership,
  checkPatientAccess,
  checkPatientAppointmentsList,
  checkPatientWriteAccess,
  checkAppointmentOwnership,
};
