const mongoose = require("mongoose");
const MedicalRecord = require("../models/MedicalRecord");
const Prescription = require("../models/Prescription");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const { errorResponse } = require("../utils/responseHandler");
const {
  HTTP_STATUS_CODES,
  ERROR_MESSAGES,
  USER_ROLES,
} = require("../config/constants");
const { checkDoctorAccess } = require("../services/medicalRecordService");

async function loadMedicalRecord(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(
        res,
        ERROR_MESSAGES.MEDICAL_RECORD_NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    const doc = await MedicalRecord.findOne({ _id: id, deletedAt: null });
    if (!doc) {
      return errorResponse(
        res,
        ERROR_MESSAGES.MEDICAL_RECORD_NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    req.medicalRecord = doc;
    return next();
  } catch (err) {
    return next(err);
  }
}

async function assertMedicalRecordRead(req, res, next) {
  try {
    const doc = req.medicalRecord;
    const role = req.user.role;
    if (role === USER_ROLES.ADMIN) {
      return next();
    }
    if (role === USER_ROLES.PATIENT) {
      const p = await Patient.findOne({
        userId: req.user.userId,
        deletedAt: null,
      }).select("_id");
      if (p && String(p._id) === String(doc.patientId)) {
        if (doc.isConfidential) {
          return errorResponse(
            res,
            ERROR_MESSAGES.FORBIDDEN,
            HTTP_STATUS_CODES.FORBIDDEN
          );
        }
        return next();
      }
    }
    if (role === USER_ROLES.DOCTOR) {
      const d = await Doctor.findOne({
        userId: req.user.userId,
        deletedAt: null,
      }).select("_id");
      if (!d) {
        return errorResponse(
          res,
          ERROR_MESSAGES.FORBIDDEN,
          HTTP_STATUS_CODES.FORBIDDEN
        );
      }
      if (String(d._id) === String(doc.doctorId)) {
        return next();
      }
      if (doc.isConfidential) {
        return errorResponse(
          res,
          ERROR_MESSAGES.FORBIDDEN,
          HTTP_STATUS_CODES.FORBIDDEN
        );
      }
      const ok = await checkDoctorAccess(d._id, doc.patientId);
      if (ok) {
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

async function assertMedicalRecordWrite(req, res, next) {
  try {
    const doc = req.medicalRecord;
    if (req.user.role === USER_ROLES.ADMIN) {
      return next();
    }
    if (req.user.role !== USER_ROLES.DOCTOR) {
      return errorResponse(
        res,
        ERROR_MESSAGES.FORBIDDEN,
        HTTP_STATUS_CODES.FORBIDDEN
      );
    }
    const d = await Doctor.findOne({
      userId: req.user.userId,
      deletedAt: null,
    }).select("_id");
    if (d && String(d._id) === String(doc.doctorId)) {
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

async function loadPrescription(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(
        res,
        ERROR_MESSAGES.PRESCRIPTION_NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    const doc = await Prescription.findOne({ _id: id, deletedAt: null });
    if (!doc) {
      return errorResponse(
        res,
        ERROR_MESSAGES.PRESCRIPTION_NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    req.prescription = doc;
    return next();
  } catch (err) {
    return next(err);
  }
}

async function assertPrescriptionRead(req, res, next) {
  try {
    const doc = req.prescription;
    if (req.user.role === USER_ROLES.ADMIN) {
      return next();
    }
    if (req.user.role === USER_ROLES.PATIENT) {
      const p = await Patient.findOne({
        userId: req.user.userId,
        deletedAt: null,
      }).select("_id");
      if (p && String(p._id) === String(doc.patientId)) {
        return next();
      }
    }
    if (req.user.role === USER_ROLES.DOCTOR) {
      const d = await Doctor.findOne({
        userId: req.user.userId,
        deletedAt: null,
      }).select("_id");
      if (!d) {
        return errorResponse(
          res,
          ERROR_MESSAGES.FORBIDDEN,
          HTTP_STATUS_CODES.FORBIDDEN
        );
      }
      if (String(d._id) === String(doc.doctorId)) {
        return next();
      }
      const ok = await checkDoctorAccess(d._id, doc.patientId);
      if (ok) {
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

async function assertPrescriptionDoctorWrite(req, res, next) {
  try {
    const doc = req.prescription;
    if (req.user.role === USER_ROLES.ADMIN) {
      return next();
    }
    if (req.user.role !== USER_ROLES.DOCTOR) {
      return errorResponse(
        res,
        ERROR_MESSAGES.FORBIDDEN,
        HTTP_STATUS_CODES.FORBIDDEN
      );
    }
    const d = await Doctor.findOne({
      userId: req.user.userId,
      deletedAt: null,
    }).select("_id");
    if (d && String(d._id) === String(doc.doctorId)) {
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

module.exports = {
  loadMedicalRecord,
  assertMedicalRecordRead,
  assertMedicalRecordWrite,
  loadPrescription,
  assertPrescriptionRead,
  assertPrescriptionDoctorWrite,
};
