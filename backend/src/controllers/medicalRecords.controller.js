const path = require("path");
const MedicalRecord = require("../models/MedicalRecord");
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const Appointment = require("../models/Appointment");
const User = require("../models/User");
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
  validateVitalSigns,
  generatePatientSummary,
  checkDoctorAccess,
} = require("../services/medicalRecordService");
const { auditLogger } = require("../middleware/logger");
const {
  sendMedicalRecordCreated,
  sendLabResultsAdded,
} = require("../services/notificationService");
const { generateFileUrl, validateFileType, validateFileSize } = require("../services/fileUploadService");

function clientMeta(req) {
  return {
    ipAddress: req.ip || req.socket?.remoteAddress || null,
    userAgent: req.get("user-agent") || null,
  };
}

async function assertPatientHistoryAccess(req, patientId) {
  if (req.user.role === USER_ROLES.ADMIN) return true;
  if (req.user.role === USER_ROLES.PATIENT) {
    const p = await Patient.findOne({
      userId: req.user.userId,
      deletedAt: null,
    }).select("_id");
    return Boolean(p && String(p._id) === String(patientId));
  }
  if (req.user.role === USER_ROLES.DOCTOR) {
    const d = await Doctor.findOne({
      userId: req.user.userId,
      deletedAt: null,
    }).select("_id");
    return Boolean(d && (await checkDoctorAccess(d._id, patientId)));
  }
  return false;
}

async function getAllRecords(req, res, next) {
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
          records: [],
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
          records: [],
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
      MedicalRecord.find(q)
        .sort({ visitDate: -1 })
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
      MedicalRecord.countDocuments(q),
    ]);
    return successResponse(res, {
      records: items,
      pagination: paginationMeta(total, page, limit),
    });
  } catch (err) {
    return next(err);
  }
}

async function getRecordById(req, res, next) {
  try {
    const doc = await MedicalRecord.findOne({
      _id: req.medicalRecord._id,
      deletedAt: null,
    })
      .populate({
        path: "patientDetails",
        populate: { path: "userDetails", select: "name email phone" },
      })
      .populate({
        path: "doctorDetails",
        populate: { path: "userDetails", select: "name email" },
      })
      .populate({ path: "prescriptions" })
      .lean();
    if (!doc) {
      return errorResponse(
        res,
        ERROR_MESSAGES.MEDICAL_RECORD_NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    await auditLogger({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.MEDICAL_RECORD_VIEWED,
      category: AUDIT_CATEGORIES.CLINICAL,
      description: "Medical record viewed",
      resourceType: "medical_record",
      resourceId: doc._id,
      severity: "info",
      ...clientMeta(req),
    });
    return successResponse(res, { record: doc });
  } catch (err) {
    return next(err);
  }
}

async function createRecord(req, res, next) {
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
    const okAccess = await checkDoctorAccess(doctor._id, patient._id);
    if (!okAccess) {
      return errorResponse(
        res,
        ERROR_MESSAGES.FORBIDDEN,
        HTTP_STATUS_CODES.FORBIDDEN
      );
    }
    if (req.body.vitalSigns) {
      const ve = validateVitalSigns(req.body.vitalSigns);
      if (ve.length) {
        return errorResponse(
          res,
          ERROR_MESSAGES.INVALID_VITAL_SIGNS,
          HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          ve.map((e) => ({ message: e }))
        );
      }
    }
    let appointmentId = req.body.appointmentId || null;
    if (appointmentId) {
      const appt = await Appointment.findOne({
        _id: appointmentId,
        patientId: patient._id,
        doctorId: doctor._id,
      });
      if (!appt) {
        return errorResponse(
          res,
          ERROR_MESSAGES.APPOINTMENT_NOT_FOUND,
          HTTP_STATUS_CODES.BAD_REQUEST
        );
      }
    }
    const rec = await MedicalRecord.create({
      patientId: patient._id,
      doctorId: doctor._id,
      appointmentId,
      visitDate: req.body.visitDate || new Date(),
      chiefComplaint: req.body.chiefComplaint,
      symptoms: req.body.symptoms || [],
      diagnosis: req.body.diagnosis,
      treatmentPlan: req.body.treatmentPlan || "",
      clinicalNotes: req.body.clinicalNotes,
      vitalSigns: req.body.vitalSigns || {},
      labResults: req.body.labResults || [],
      attachments: req.body.attachments || [],
      followUpRequired: Boolean(req.body.followUpRequired),
      followUpDate: req.body.followUpDate || null,
      isConfidential: Boolean(req.body.isConfidential),
    });
    rec.calculateBMI();
    await rec.save();
    if (appointmentId) {
      await Appointment.updateOne(
        { _id: appointmentId },
        { medicalRecordId: rec._id }
      );
    }
    const patUser = await User.findById(patient.userId).select("_id").lean();
    if (patUser) {
      await sendMedicalRecordCreated(rec, patUser._id);
    }
    await auditLogger({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.MEDICAL_RECORD_CREATED,
      category: AUDIT_CATEGORIES.CLINICAL,
      description: "Medical record created",
      resourceType: "medical_record",
      resourceId: rec._id,
      severity: "info",
      ...clientMeta(req),
    });
    const populated = await MedicalRecord.findById(rec._id)
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
      { record: populated },
      "Medical record created successfully",
      HTTP_STATUS_CODES.CREATED
    );
  } catch (err) {
    return next(err);
  }
}

async function updateRecord(req, res, next) {
  try {
    const doc = req.medicalRecord;
    const keys = [
      "chiefComplaint",
      "symptoms",
      "diagnosis",
      "treatmentPlan",
      "clinicalNotes",
      "vitalSigns",
      "followUpRequired",
      "followUpDate",
      "isConfidential",
    ];
    if (req.body.vitalSigns) {
      const ve = validateVitalSigns(req.body.vitalSigns);
      if (ve.length) {
        return errorResponse(
          res,
          ERROR_MESSAGES.INVALID_VITAL_SIGNS,
          HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          ve.map((e) => ({ message: e }))
        );
      }
    }
    keys.forEach((k) => {
      if (req.body[k] !== undefined) doc[k] = req.body[k];
    });
    doc.calculateBMI();
    await doc.save();
    await auditLogger({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.MEDICAL_RECORD_UPDATED,
      category: AUDIT_CATEGORIES.CLINICAL,
      description: "Medical record updated",
      resourceType: "medical_record",
      resourceId: doc._id,
      severity: "info",
      ...clientMeta(req),
    });
    return successResponse(res, { record: doc });
  } catch (err) {
    return next(err);
  }
}

async function deleteRecord(req, res, next) {
  try {
    const doc = await MedicalRecord.findOne({
      _id: req.params.id,
      deletedAt: null,
    });
    if (!doc) {
      return errorResponse(
        res,
        ERROR_MESSAGES.MEDICAL_RECORD_NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    doc.deletedAt = new Date();
    await doc.save();
    await auditLogger({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.MEDICAL_RECORD_UPDATED,
      category: AUDIT_CATEGORIES.ADMIN,
      description: "Medical record soft deleted",
      resourceType: "medical_record",
      resourceId: doc._id,
      severity: "warning",
      ...clientMeta(req),
    });
    return successResponse(res, null, "Medical record deleted");
  } catch (err) {
    return next(err);
  }
}

async function getPatientHistory(req, res, next) {
  try {
    const { patientId } = req.params;
    if (!(await assertPatientHistoryAccess(req, patientId))) {
      return errorResponse(
        res,
        ERROR_MESSAGES.FORBIDDEN,
        HTTP_STATUS_CODES.FORBIDDEN
      );
    }
    const { page, limit, skip } = getPagination(req.query);
    const q = { patientId, deletedAt: null };
    if (req.user.role === USER_ROLES.PATIENT) {
      q.isConfidential = false;
    }
    const [items, total] = await Promise.all([
      MedicalRecord.find(q)
        .sort({ visitDate: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: "doctorDetails",
          populate: { path: "userDetails", select: "name email" },
        })
        .lean(),
      MedicalRecord.countDocuments(q),
    ]);
    await auditLogger({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.MEDICAL_RECORD_VIEWED,
      category: AUDIT_CATEGORIES.CLINICAL,
      description: "Medical history listed",
      severity: "info",
      details: { patientId: String(patientId) },
      ...clientMeta(req),
    });
    return successResponse(res, {
      records: items,
      pagination: paginationMeta(total, page, limit),
    });
  } catch (err) {
    return next(err);
  }
}

async function getPatientSummary(req, res, next) {
  try {
    const { patientId } = req.params;
    if (!(await assertPatientHistoryAccess(req, patientId))) {
      return errorResponse(
        res,
        ERROR_MESSAGES.FORBIDDEN,
        HTTP_STATUS_CODES.FORBIDDEN
      );
    }
    const summary = await generatePatientSummary(patientId);
    if (!summary) {
      return errorResponse(
        res,
        ERROR_MESSAGES.PATIENT_NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    return successResponse(res, summary);
  } catch (err) {
    return next(err);
  }
}

async function addAttachment(req, res, next) {
  try {
    const doc = req.medicalRecord;
    if (!req.file) {
      return errorResponse(
        res,
        ERROR_MESSAGES.FILE_UPLOAD_INVALID,
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }
    if (!validateFileType(req.file.originalname)) {
      return errorResponse(
        res,
        ERROR_MESSAGES.FILE_UPLOAD_INVALID,
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }
    if (!validateFileSize(req.file.size)) {
      return errorResponse(
        res,
        ERROR_MESSAGES.FILE_UPLOAD_INVALID,
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }
    const fn =
      req.file.filename ||
      (req.file.path ? path.basename(req.file.path) : "file");
    const fileUrl = generateFileUrl(fn);
    await doc.addAttachment(
      req.file.originalname || req.file.filename,
      fileUrl,
      req.file.mimetype || "application/octet-stream"
    );
    await auditLogger({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.MEDICAL_RECORD_UPDATED,
      category: AUDIT_CATEGORIES.CLINICAL,
      description: "Attachment added",
      resourceType: "medical_record",
      resourceId: doc._id,
      severity: "info",
      ...clientMeta(req),
    });
    return successResponse(res, { record: doc });
  } catch (err) {
    return next(err);
  }
}

async function removeAttachment(req, res, next) {
  try {
    const doc = req.medicalRecord;
    const { attachmentId } = req.params;
    const sub = (doc.attachments || []).id(attachmentId);
    if (!sub) {
      return errorResponse(
        res,
        ERROR_MESSAGES.NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    doc.attachments.pull({ _id: attachmentId });
    await doc.save();
    await auditLogger({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.MEDICAL_RECORD_UPDATED,
      category: AUDIT_CATEGORIES.CLINICAL,
      description: "Attachment removed",
      resourceType: "medical_record",
      resourceId: doc._id,
      severity: "info",
      ...clientMeta(req),
    });
    return successResponse(res, { record: doc });
  } catch (err) {
    return next(err);
  }
}

async function addLabResult(req, res, next) {
  try {
    const doc = req.medicalRecord;
    doc.labResults.push({
      testName: req.body.testName,
      result: req.body.result,
      normalRange: req.body.normalRange || "",
      date: req.body.date ? new Date(req.body.date) : new Date(),
      status: req.body.status,
    });
    await doc.save();
    const patient = await Patient.findById(doc.patientId).select("userId").lean();
    if (patient) {
      await sendLabResultsAdded(doc, patient.userId);
    }
    await auditLogger({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.MEDICAL_RECORD_UPDATED,
      category: AUDIT_CATEGORIES.CLINICAL,
      description: "Lab result added",
      resourceType: "medical_record",
      resourceId: doc._id,
      severity: "info",
      ...clientMeta(req),
    });
    return successResponse(res, { record: doc });
  } catch (err) {
    return next(err);
  }
}

async function searchRecords(req, res, next) {
  try {
    const q = { deletedAt: null };
    if (req.query.diagnosis) {
      q.diagnosis = new RegExp(
        String(req.query.diagnosis).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );
    }
    if (req.query.dateFrom || req.query.dateTo) {
      q.visitDate = {};
      if (req.query.dateFrom) q.visitDate.$gte = new Date(req.query.dateFrom);
      if (req.query.dateTo) q.visitDate.$lte = new Date(req.query.dateTo);
    }
    if (req.user.role === USER_ROLES.ADMIN) {
      if (req.query.patientId) q.patientId = req.query.patientId;
    } else if (req.user.role === USER_ROLES.PATIENT) {
      const p = await Patient.findOne({
        userId: req.user.userId,
        deletedAt: null,
      }).select("_id");
      if (!p) {
        return successResponse(res, { records: [] });
      }
      q.patientId = p._id;
      q.isConfidential = false;
    } else if (req.user.role === USER_ROLES.DOCTOR) {
      const d = await Doctor.findOne({
        userId: req.user.userId,
        deletedAt: null,
      }).select("_id");
      if (!d) {
        return successResponse(res, { records: [] });
      }
      q.doctorId = d._id;
      if (req.query.patientId) {
        const ok = await checkDoctorAccess(d._id, req.query.patientId);
        if (!ok) {
          return errorResponse(
            res,
            ERROR_MESSAGES.FORBIDDEN,
            HTTP_STATUS_CODES.FORBIDDEN
          );
        }
        q.patientId = req.query.patientId;
      }
    } else {
      return errorResponse(
        res,
        ERROR_MESSAGES.FORBIDDEN,
        HTTP_STATUS_CODES.FORBIDDEN
      );
    }
    const items = await MedicalRecord.find(q)
      .sort({ visitDate: -1 })
      .limit(100)
      .lean();
    return successResponse(res, { records: items });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getAllRecords,
  getRecordById,
  createRecord,
  updateRecord,
  deleteRecord,
  getPatientHistory,
  getPatientSummary,
  addAttachment,
  removeAttachment,
  addLabResult,
  searchRecords,
};
