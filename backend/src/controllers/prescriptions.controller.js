const Prescription = require("../models/Prescription");
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const MedicalRecord = require("../models/MedicalRecord");
const Appointment = require("../models/Appointment");
const { successResponse, errorResponse } = require("../utils/responseHandler");
const {
  HTTP_STATUS_CODES,
  ERROR_MESSAGES,
  USER_ROLES,
  AUDIT_ACTIONS,
  AUDIT_CATEGORIES,
} = require("../config/constants");
const { getPagination, paginationMeta } = require("../utils/pagination");
const {
  validateMedication,
  calculateValidUntil,
  generateDigitalSignature,
  checkPrescriptionExpiry,
} = require("../services/prescriptionService");
const { generatePrescriptionPDF } = require("../services/pdfGeneratorService");
const { auditLogger } = require("../middleware/logger");
const { sendPrescriptionReady } = require("../services/notificationService");
const User = require("../models/User");

function clientMeta(req) {
  return {
    ipAddress: req.ip || req.socket?.remoteAddress || null,
    userAgent: req.get("user-agent") || null,
  };
}

async function getAllPrescriptions(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const q = { deletedAt: null };
    if (req.user.role === USER_ROLES.ADMIN) {
      if (req.query.patientId) q.patientId = req.query.patientId;
      if (req.query.doctorId) q.doctorId = req.query.doctorId;
    } else if (req.user.role === USER_ROLES.PATIENT) {
      const p = await Patient.findOne({
        userId: req.user.userId,
        deletedAt: null,
      }).select("_id");
      if (!p) {
        return successResponse(res, {
          prescriptions: [],
          pagination: paginationMeta(0, page, limit),
        });
      }
      q.patientId = p._id;
    } else if (req.user.role === USER_ROLES.DOCTOR) {
      const d = await Doctor.findOne({
        userId: req.user.userId,
        deletedAt: null,
      }).select("_id");
      if (!d) {
        return successResponse(res, {
          prescriptions: [],
          pagination: paginationMeta(0, page, limit),
        });
      }
      q.doctorId = d._id;
    } else {
      return errorResponse(
        res,
        ERROR_MESSAGES.FORBIDDEN,
        HTTP_STATUS_CODES.FORBIDDEN
      );
    }
    const [items, total] = await Promise.all([
      Prescription.find(q)
        .sort({ prescriptionDate: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: "patientDetails",
          populate: { path: "userDetails", select: "name email" },
        })
        .populate({
          path: "doctorDetails",
          populate: { path: "userDetails", select: "name email" },
        })
        .lean(),
      Prescription.countDocuments(q),
    ]);
    return successResponse(res, {
      prescriptions: items,
      pagination: paginationMeta(total, page, limit),
    });
  } catch (err) {
    return next(err);
  }
}

async function getPrescriptionById(req, res, next) {
  try {
    const doc = await Prescription.findOne({
      _id: req.prescription._id,
      deletedAt: null,
    })
      .populate({
        path: "patientDetails",
        populate: { path: "userDetails", select: "name email" },
      })
      .populate({
        path: "doctorDetails",
        populate: { path: "userDetails", select: "name email" },
      })
      .lean();
    return successResponse(res, { prescription: doc });
  } catch (err) {
    return next(err);
  }
}

async function createPrescription(req, res, next) {
  try {
    const doctor = await Doctor.findOne({
      userId: req.user.userId,
      deletedAt: null,
    });
    if (!doctor) {
      return errorResponse(
        res,
        ERROR_MESSAGES.DOCTOR_NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    const patient = await Patient.findOne({
      _id: req.body.patientId,
      deletedAt: null,
    });
    if (!patient) {
      return errorResponse(
        res,
        ERROR_MESSAGES.PATIENT_NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    for (let i = 0; i < req.body.medications.length; i += 1) {
      const errs = validateMedication(req.body.medications[i]);
      if (errs.length) {
        return errorResponse(
          res,
          ERROR_MESSAGES.VALIDATION_FAILED,
          HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          errs.map((message) => ({ message }))
        );
      }
    }
    if (req.body.medicalRecordId) {
      const mr = await MedicalRecord.findOne({
        _id: req.body.medicalRecordId,
        patientId: patient._id,
        doctorId: doctor._id,
        deletedAt: null,
      });
      if (!mr) {
        return errorResponse(
          res,
          ERROR_MESSAGES.MEDICAL_RECORD_NOT_FOUND,
          HTTP_STATUS_CODES.BAD_REQUEST
        );
      }
    }
    if (req.body.appointmentId) {
      const ap = await Appointment.findOne({
        _id: req.body.appointmentId,
        patientId: patient._id,
        doctorId: doctor._id,
      });
      if (!ap) {
        return errorResponse(
          res,
          ERROR_MESSAGES.APPOINTMENT_NOT_FOUND,
          HTTP_STATUS_CODES.BAD_REQUEST
        );
      }
    }
    const prescriptionDate = req.body.prescriptionDate || new Date();
    const validUntil = calculateValidUntil(
      prescriptionDate,
      req.body.validDays != null ? req.body.validDays : 90
    );
    const doc = await Prescription.create({
      patientId: patient._id,
      doctorId: doctor._id,
      medicalRecordId: req.body.medicalRecordId || null,
      appointmentId: req.body.appointmentId || null,
      prescriptionDate,
      medications: req.body.medications,
      diagnosis: req.body.diagnosis,
      notes: req.body.notes || "",
      validUntil,
      status: "active",
    });
    doc.digitalSignature = generateDigitalSignature(doc.toObject());
    await doc.save();
    if (doc.appointmentId) {
      await Appointment.updateOne(
        { _id: doc.appointmentId },
        { prescriptionId: doc._id }
      );
    }
    const patUser = await User.findById(patient.userId).select("_id").lean();
    if (patUser) {
      await sendPrescriptionReady(doc, patUser._id);
    }
    await auditLogger({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.PRESCRIPTION_CREATED,
      category: AUDIT_CATEGORIES.CLINICAL,
      description: "Prescription created",
      resourceType: "prescription",
      resourceId: doc._id,
      severity: "info",
      ...clientMeta(req),
    });
    const populated = await Prescription.findById(doc._id)
      .populate({
        path: "patientDetails",
        populate: { path: "userDetails", select: "name email" },
      })
      .populate({
        path: "doctorDetails",
        populate: { path: "userDetails", select: "name email" },
      })
      .lean();
    return successResponse(
      res,
      { prescription: populated },
      "Prescription created",
      HTTP_STATUS_CODES.CREATED
    );
  } catch (err) {
    return next(err);
  }
}

async function updatePrescription(req, res, next) {
  try {
    const doc = req.prescription;
    if (req.user.role !== USER_ROLES.ADMIN && doc.status !== "active") {
      return errorResponse(
        res,
        "Prescription cannot be updated",
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }
    if (
      req.user.role !== USER_ROLES.ADMIN &&
      checkPrescriptionExpiry(doc) &&
      doc.status === "active"
    ) {
      return errorResponse(
        res,
        ERROR_MESSAGES.PRESCRIPTION_EXPIRED,
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }
    if (req.body.diagnosis !== undefined) doc.diagnosis = req.body.diagnosis;
    if (req.body.notes !== undefined) doc.notes = req.body.notes;
    if (req.body.medications) {
      for (let i = 0; i < req.body.medications.length; i += 1) {
        const errs = validateMedication(req.body.medications[i]);
        if (errs.length) {
          return errorResponse(
            res,
            ERROR_MESSAGES.VALIDATION_FAILED,
            HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
            errs.map((message) => ({ message }))
          );
        }
      }
      doc.medications = req.body.medications;
    }
    doc.digitalSignature = generateDigitalSignature(doc.toObject());
    await doc.save();
    await auditLogger({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.PRESCRIPTION_UPDATED,
      category: AUDIT_CATEGORIES.CLINICAL,
      description: "Prescription updated",
      resourceType: "prescription",
      resourceId: doc._id,
      severity: "info",
      ...clientMeta(req),
    });
    return successResponse(res, { prescription: doc });
  } catch (err) {
    return next(err);
  }
}

async function cancelPrescription(req, res, next) {
  try {
    const doc = req.prescription;
    if (doc.status === "cancelled") {
      return errorResponse(
        res,
        "Prescription already cancelled",
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }
    doc.status = "cancelled";
    await doc.save();
    await auditLogger({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.PRESCRIPTION_UPDATED,
      category: AUDIT_CATEGORIES.CLINICAL,
      description: "Prescription cancelled",
      resourceType: "prescription",
      resourceId: doc._id,
      severity: "warning",
      ...clientMeta(req),
    });
    return successResponse(res, { prescription: doc });
  } catch (err) {
    return next(err);
  }
}

async function getPatientPrescriptions(req, res, next) {
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
    } else if (req.user.role === USER_ROLES.DOCTOR) {
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
      const { checkDoctorAccess } = require("../services/medicalRecordService");
      const ok = await checkDoctorAccess(d._id, patientId);
      if (!ok) {
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
    const q = { patientId, deletedAt: null };
    const [items, total] = await Promise.all([
      Prescription.find(q)
        .sort({ prescriptionDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Prescription.countDocuments(q),
    ]);
    return successResponse(res, {
      prescriptions: items,
      pagination: paginationMeta(total, page, limit),
    });
  } catch (err) {
    return next(err);
  }
}

async function getActivePrescriptions(req, res, next) {
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
    } else if (req.user.role === USER_ROLES.DOCTOR) {
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
      const { checkDoctorAccess } = require("../services/medicalRecordService");
      const ok = await checkDoctorAccess(d._id, patientId);
      if (!ok) {
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
    const items = await Prescription.getActivePrescriptions(patientId);
    return successResponse(res, { prescriptions: items });
  } catch (err) {
    return next(err);
  }
}

async function addMedication(req, res, next) {
  try {
    const doc = req.prescription;
    const med = {
      medicationName: req.body.medicationName,
      genericName: req.body.genericName,
      dosage: req.body.dosage,
      frequency: req.body.frequency,
      duration: req.body.duration,
      instructions: req.body.instructions,
      route: req.body.route,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      quantity: req.body.quantity,
      refills: req.body.refills,
    };
    const errs = validateMedication(med);
    if (errs.length) {
      return errorResponse(
        res,
        ERROR_MESSAGES.VALIDATION_FAILED,
        HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
        errs.map((message) => ({ message }))
      );
    }
    await doc.addMedication(med);
    doc.digitalSignature = generateDigitalSignature(doc.toObject());
    await doc.save();
    await auditLogger({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.PRESCRIPTION_UPDATED,
      category: AUDIT_CATEGORIES.CLINICAL,
      description: "Medication added to prescription",
      resourceType: "prescription",
      resourceId: doc._id,
      severity: "info",
      ...clientMeta(req),
    });
    return successResponse(res, { prescription: doc });
  } catch (err) {
    return next(err);
  }
}

async function removeMedication(req, res, next) {
  try {
    const doc = req.prescription;
    const idx = parseInt(req.params.medicationIndex, 10);
    await doc.removeMedication(idx);
    doc.digitalSignature = generateDigitalSignature(doc.toObject());
    await doc.save();
    await auditLogger({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.PRESCRIPTION_UPDATED,
      category: AUDIT_CATEGORIES.CLINICAL,
      description: "Medication removed from prescription",
      resourceType: "prescription",
      resourceId: doc._id,
      severity: "info",
      ...clientMeta(req),
    });
    return successResponse(res, { prescription: doc });
  } catch (err) {
    if (err && err.message && err.message.includes("Invalid")) {
      return errorResponse(
        res,
        err.message,
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }
    return next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const doc = req.prescription;
    doc.status = req.body.status;
    await doc.save();
    await auditLogger({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.PRESCRIPTION_UPDATED,
      category: AUDIT_CATEGORIES.CLINICAL,
      description: "Prescription status updated",
      resourceType: "prescription",
      resourceId: doc._id,
      severity: "info",
      details: { status: req.body.status },
      ...clientMeta(req),
    });
    return successResponse(res, { prescription: doc });
  } catch (err) {
    return next(err);
  }
}

async function generatePDF(req, res, next) {
  try {
    const doc = await Prescription.findOne({
      _id: req.prescription._id,
      deletedAt: null,
    }).lean();
    const buf = await generatePrescriptionPDF(doc);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="prescription-${doc._id}.pdf"`
    );
    return res.send(buf);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getAllPrescriptions,
  getPrescriptionById,
  createPrescription,
  updatePrescription,
  cancelPrescription,
  getPatientPrescriptions,
  getActivePrescriptions,
  addMedication,
  removeMedication,
  updateStatus,
  generatePDF,
};
