const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const User = require("../models/User");
const { successResponse, errorResponse } = require("../utils/responseHandler");
const {
  HTTP_STATUS_CODES,
  ERROR_MESSAGES,
  USER_ROLES,
  AUDIT_ACTIONS,
  AUDIT_CATEGORIES,
  APPOINTMENT_STATUS,
} = require("../config/constants");
const { getPagination, paginationMeta } = require("../utils/pagination");
const {
  startOfLocalDay,
  slotStartDateTime,
  isDateInFuture,
} = require("../services/dateTimeService");
const {
  checkDoctorAvailability,
  calculateAppointmentFee,
  canCancelAppointment,
  hasOverlappingAppointment,
} = require("../services/appointmentService");
const {
  sendAppointmentConfirmation,
  sendAppointmentCancellation,
} = require("../services/notificationService");
const { auditLogger } = require("../middleware/logger");

function clientMeta(req) {
  return {
    ipAddress: req.ip || req.socket?.remoteAddress || null,
    userAgent: req.get("user-agent") || null,
  };
}

const STATUS_GRAPH = {
  [APPOINTMENT_STATUS.SCHEDULED]: [
    APPOINTMENT_STATUS.CONFIRMED,
    APPOINTMENT_STATUS.CANCELLED,
    APPOINTMENT_STATUS.NO_SHOW,
  ],
  [APPOINTMENT_STATUS.CONFIRMED]: [
    APPOINTMENT_STATUS.IN_PROGRESS,
    APPOINTMENT_STATUS.CANCELLED,
    APPOINTMENT_STATUS.NO_SHOW,
  ],
  [APPOINTMENT_STATUS.IN_PROGRESS]: [
    APPOINTMENT_STATUS.COMPLETED,
    APPOINTMENT_STATUS.CANCELLED,
    APPOINTMENT_STATUS.NO_SHOW,
  ],
  [APPOINTMENT_STATUS.COMPLETED]: [],
  [APPOINTMENT_STATUS.CANCELLED]: [],
  [APPOINTMENT_STATUS.NO_SHOW]: [],
};

async function performCancel(appt, cancelledByUserId, reason, req) {
  const a = await Appointment.findById(appt._id);
  if (!a) return { ok: false, message: ERROR_MESSAGES.APPOINTMENT_NOT_FOUND };
  if (
    [APPOINTMENT_STATUS.CANCELLED, APPOINTMENT_STATUS.COMPLETED, APPOINTMENT_STATUS.NO_SHOW].includes(
      a.status
    )
  ) {
    return { ok: false, message: "Appointment cannot be cancelled" };
  }
  a.status = APPOINTMENT_STATUS.CANCELLED;
  a.cancelledBy = cancelledByUserId;
  a.cancellationReason = reason || "";
  a.cancelledAt = new Date();
  await a.save();
  await Doctor.updateOne(
    { _id: a.doctorId },
    { $addToSet: { availableSlots: a.timeSlot } }
  );
  const pat = await Patient.findById(a.patientId).select("userId").lean();
  const docD = await Doctor.findById(a.doctorId).select("userId").lean();
  if (pat && docD) {
    await sendAppointmentCancellation(
      a,
      pat.userId,
      docD.userId,
      reason || ""
    );
  }
  await auditLogger({
    userId: cancelledByUserId,
    action: AUDIT_ACTIONS.APPOINTMENT_CANCELLED,
    category: AUDIT_CATEGORIES.CLINICAL,
    description: "Appointment cancelled",
    resourceType: "appointment",
    resourceId: a._id,
    severity: "warning",
    details: { reason: reason || "" },
    ...clientMeta(req),
  });
  return { ok: true, appointment: a };
}

async function getAllAppointments(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const q = {};
    if (req.user.role === USER_ROLES.DOCTOR) {
      const d = await Doctor.findOne({
        userId: req.user.userId,
        deletedAt: null,
      }).select("_id");
      if (!d) {
        return successResponse(res, {
          appointments: [],
          pagination: paginationMeta(0, page, limit),
        });
      }
      q.doctorId = d._id;
    } else if (req.user.role === USER_ROLES.PATIENT) {
      const p = await Patient.findOne({
        userId: req.user.userId,
        deletedAt: null,
      }).select("_id");
      if (!p) {
        return successResponse(res, {
          appointments: [],
          pagination: paginationMeta(0, page, limit),
        });
      }
      q.patientId = p._id;
    }
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

async function getAppointmentById(req, res, next) {
  try {
    const appt = await Appointment.findById(req.params.id)
      .populate({
        path: "patientDetails",
        populate: { path: "userDetails", select: "name email avatar phone" },
      })
      .populate({
        path: "doctorDetails",
        populate: { path: "userDetails", select: "name email avatar" },
      })
      .lean();
    if (!appt) {
      return errorResponse(
        res,
        ERROR_MESSAGES.APPOINTMENT_NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    return successResponse(res, { appointment: appt });
  } catch (err) {
    return next(err);
  }
}

async function bookAppointment(req, res, next) {
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
    const { doctorId, appointmentDate, timeSlot, duration, type, symptoms } =
      req.body;
    const doctor = await Doctor.findOne({ _id: doctorId, deletedAt: null });
    if (!doctor || !doctor.available) {
      return errorResponse(
        res,
        ERROR_MESSAGES.DOCTOR_NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    const dayDate = startOfLocalDay(appointmentDate);
    const startAt = slotStartDateTime(dayDate, timeSlot);
    if (!startAt || !isDateInFuture(startAt)) {
      return errorResponse(
        res,
        ERROR_MESSAGES.PAST_DATE_BOOKING,
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }
    const chk = await checkDoctorAvailability(doctorId, dayDate, timeSlot);
    if (!chk.available) {
      return errorResponse(
        res,
        chk.reason || ERROR_MESSAGES.SLOT_NOT_AVAILABLE,
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }
    const overlap = await hasOverlappingAppointment(
      doctorId,
      dayDate,
      timeSlot,
      null
    );
    if (overlap) {
      return errorResponse(
        res,
        ERROR_MESSAGES.DUPLICATE_APPOINTMENT,
        HTTP_STATUS_CODES.CONFLICT
      );
    }
    const dur = duration || doctor.consultationDuration || 30;
    const amount = await calculateAppointmentFee(doctorId, dur);
    if (amount == null) {
      return errorResponse(
        res,
        ERROR_MESSAGES.DOCTOR_NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    let appt;
    try {
      appt = await Appointment.create({
        patientId: patient._id,
        doctorId,
        appointmentDate: dayDate,
        timeSlot,
        duration: dur,
        type: type || "consultation",
        symptoms: symptoms || "",
        amount,
      });
    } catch (e) {
      if (e && e.code === 11000) {
        return errorResponse(
          res,
          ERROR_MESSAGES.DUPLICATE_APPOINTMENT,
          HTTP_STATUS_CODES.CONFLICT
        );
      }
      throw e;
    }
    await Doctor.updateOne(
      { _id: doctorId },
      { $pull: { availableSlots: timeSlot } }
    );
    const docUser = await User.findById(doctor.userId).select("_id").lean();
    const patUser = await User.findById(patient.userId).select("_id").lean();
    if (docUser && patUser) {
      await sendAppointmentConfirmation(appt, patUser._id, docUser._id);
    }
    await auditLogger({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.APPOINTMENT_CREATED,
      category: AUDIT_CATEGORIES.CLINICAL,
      description: "Appointment booked",
      resourceType: "appointment",
      resourceId: appt._id,
      severity: "info",
      ...clientMeta(req),
    });
    const populated = await Appointment.findById(appt._id)
      .populate({
        path: "patientDetails",
        populate: { path: "userDetails", select: "name email avatar" },
      })
      .populate({
        path: "doctorDetails",
        populate: { path: "userDetails", select: "name email avatar" },
      })
      .lean();
    return successResponse(
      res,
      {
        appointment: populated,
        notification: "Confirmation sent to doctor and patient",
      },
      "Appointment booked successfully",
      HTTP_STATUS_CODES.CREATED
    );
  } catch (err) {
    return next(err);
  }
}

async function updateAppointment(req, res, next) {
  try {
    const appt = await Appointment.findById(req.params.id);
    if (!appt) {
      return errorResponse(
        res,
        ERROR_MESSAGES.APPOINTMENT_NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    if (["cancelled", "completed", "no-show"].includes(appt.status)) {
      return errorResponse(
        res,
        "Appointment cannot be updated",
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }
    if (req.body.symptoms !== undefined) appt.symptoms = req.body.symptoms;
    if (req.body.notes !== undefined) appt.notes = req.body.notes;
    if (req.body.type !== undefined) appt.type = req.body.type;
    if (req.body.duration !== undefined) appt.duration = req.body.duration;
    await appt.save();
    await auditLogger({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.APPOINTMENT_UPDATED,
      category: AUDIT_CATEGORIES.CLINICAL,
      description: "Appointment updated",
      resourceType: "appointment",
      resourceId: appt._id,
      severity: "info",
      ...clientMeta(req),
    });
    return successResponse(res, { appointment: appt });
  } catch (err) {
    return next(err);
  }
}

async function cancelAppointment(req, res, next) {
  try {
    const appt = await Appointment.findById(req.params.id);
    if (!appt) {
      return errorResponse(
        res,
        ERROR_MESSAGES.APPOINTMENT_NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    const chk = await canCancelAppointment(
      appt,
      req.user.userId,
      req.user.role
    );
    if (!chk.allowed) {
      return errorResponse(
        res,
        chk.reason || ERROR_MESSAGES.CANCELLATION_WINDOW_EXPIRED,
        chk.reason === "Forbidden"
          ? HTTP_STATUS_CODES.FORBIDDEN
          : HTTP_STATUS_CODES.BAD_REQUEST
      );
    }
    const r = await performCancel(
      appt,
      req.user.userId,
      req.body.reason || "",
      req
    );
    if (!r.ok) {
      return errorResponse(
        res,
        r.message,
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }
    return successResponse(res, { appointment: r.appointment });
  } catch (err) {
    return next(err);
  }
}

async function updateAppointmentStatus(req, res, next) {
  try {
    const appt = await Appointment.findById(req.params.id);
    if (!appt) {
      return errorResponse(
        res,
        ERROR_MESSAGES.APPOINTMENT_NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    const nextStatus = req.body.status;
    const allowed = STATUS_GRAPH[appt.status] || [];
    if (!allowed.includes(nextStatus)) {
      return errorResponse(
        res,
        ERROR_MESSAGES.INVALID_STATUS_TRANSITION,
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }
    appt.status = nextStatus;
    await appt.save();
    await auditLogger({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.APPOINTMENT_UPDATED,
      category: AUDIT_CATEGORIES.CLINICAL,
      description: "Appointment status updated",
      resourceType: "appointment",
      resourceId: appt._id,
      severity: "info",
      details: { status: nextStatus },
      ...clientMeta(req),
    });
    return successResponse(res, { appointment: appt });
  } catch (err) {
    return next(err);
  }
}

async function confirmAppointment(req, res, next) {
  try {
    const appt = await Appointment.findById(req.params.id);
    if (!appt) {
      return errorResponse(
        res,
        ERROR_MESSAGES.APPOINTMENT_NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    if (appt.status !== APPOINTMENT_STATUS.SCHEDULED) {
      return errorResponse(
        res,
        ERROR_MESSAGES.INVALID_STATUS_TRANSITION,
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }
    appt.status = APPOINTMENT_STATUS.CONFIRMED;
    await appt.save();
    await auditLogger({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.APPOINTMENT_UPDATED,
      category: AUDIT_CATEGORIES.CLINICAL,
      description: "Appointment confirmed",
      resourceType: "appointment",
      resourceId: appt._id,
      severity: "info",
      ...clientMeta(req),
    });
    return successResponse(res, { appointment: appt });
  } catch (err) {
    return next(err);
  }
}

async function getUpcomingAppointments(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const q = {
      status: {
        $in: [
          APPOINTMENT_STATUS.SCHEDULED,
          APPOINTMENT_STATUS.CONFIRMED,
          APPOINTMENT_STATUS.IN_PROGRESS,
        ],
      },
      appointmentDate: { $gte: startOfLocalDay(new Date()) },
    };
    if (req.user.role === USER_ROLES.DOCTOR) {
      const d = await Doctor.findOne({
        userId: req.user.userId,
        deletedAt: null,
      }).select("_id");
      if (!d) {
        return successResponse(res, {
          appointments: [],
          pagination: paginationMeta(0, page, limit),
        });
      }
      q.doctorId = d._id;
    } else if (req.user.role === USER_ROLES.PATIENT) {
      const p = await Patient.findOne({
        userId: req.user.userId,
        deletedAt: null,
      }).select("_id");
      if (!p) {
        return successResponse(res, {
          appointments: [],
          pagination: paginationMeta(0, page, limit),
        });
      }
      q.patientId = p._id;
    } else if (req.user.role !== USER_ROLES.ADMIN) {
      return errorResponse(
        res,
        ERROR_MESSAGES.FORBIDDEN,
        HTTP_STATUS_CODES.FORBIDDEN
      );
    }
    const [items, total] = await Promise.all([
      Appointment.find(q)
        .sort({ appointmentDate: 1, timeSlot: 1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: "patientDetails",
          populate: { path: "userDetails", select: "name email avatar" },
        })
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

async function getPastAppointments(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const q = {
      $or: [
        { status: { $in: [APPOINTMENT_STATUS.COMPLETED, APPOINTMENT_STATUS.CANCELLED, APPOINTMENT_STATUS.NO_SHOW] } },
        { appointmentDate: { $lt: startOfLocalDay(new Date()) } },
      ],
    };
    if (req.user.role === USER_ROLES.DOCTOR) {
      const d = await Doctor.findOne({
        userId: req.user.userId,
        deletedAt: null,
      }).select("_id");
      if (!d) {
        return successResponse(res, {
          appointments: [],
          pagination: paginationMeta(0, page, limit),
        });
      }
      q.doctorId = d._id;
    } else if (req.user.role === USER_ROLES.PATIENT) {
      const p = await Patient.findOne({
        userId: req.user.userId,
        deletedAt: null,
      }).select("_id");
      if (!p) {
        return successResponse(res, {
          appointments: [],
          pagination: paginationMeta(0, page, limit),
        });
      }
      q.patientId = p._id;
    } else if (req.user.role !== USER_ROLES.ADMIN) {
      return errorResponse(
        res,
        ERROR_MESSAGES.FORBIDDEN,
        HTTP_STATUS_CODES.FORBIDDEN
      );
    }
    const [items, total] = await Promise.all([
      Appointment.find(q)
        .sort({ appointmentDate: -1, timeSlot: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: "patientDetails",
          populate: { path: "userDetails", select: "name email avatar" },
        })
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

async function rescheduleAppointment(req, res, next) {
  try {
    const appt = await Appointment.findById(req.params.id);
    if (!appt) {
      return errorResponse(
        res,
        ERROR_MESSAGES.APPOINTMENT_NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND
      );
    }
    const chk = await canCancelAppointment(
      appt,
      req.user.userId,
      req.user.role
    );
    if (!chk.allowed && req.user.role !== USER_ROLES.ADMIN) {
      return errorResponse(
        res,
        chk.reason || ERROR_MESSAGES.CANCELLATION_WINDOW_EXPIRED,
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }
    const cancelRes = await performCancel(
      appt,
      req.user.userId,
      "Rescheduled",
      req
    );
    if (!cancelRes.ok) {
      return errorResponse(
        res,
        cancelRes.message,
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }
    const doctor = await Doctor.findOne({
      _id: appt.doctorId,
      deletedAt: null,
    });
    const dayDate = startOfLocalDay(req.body.appointmentDate);
    const timeSlot = req.body.timeSlot;
    const startAt = slotStartDateTime(dayDate, timeSlot);
    if (!startAt || !isDateInFuture(startAt)) {
      return errorResponse(
        res,
        ERROR_MESSAGES.PAST_DATE_BOOKING,
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }
    const av = await checkDoctorAvailability(appt.doctorId, dayDate, timeSlot);
    if (!av.available) {
      return errorResponse(
        res,
        av.reason || ERROR_MESSAGES.SLOT_NOT_AVAILABLE,
        HTTP_STATUS_CODES.BAD_REQUEST
      );
    }
    const overlap = await hasOverlappingAppointment(
      appt.doctorId,
      dayDate,
      timeSlot,
      null
    );
    if (overlap) {
      return errorResponse(
        res,
        ERROR_MESSAGES.DUPLICATE_APPOINTMENT,
        HTTP_STATUS_CODES.CONFLICT
      );
    }
    const dur = req.body.duration || doctor.consultationDuration || 30;
    const amount = await calculateAppointmentFee(appt.doctorId, dur);
    let newAppt;
    try {
      newAppt = await Appointment.create({
        patientId: appt.patientId,
        doctorId: appt.doctorId,
        appointmentDate: dayDate,
        timeSlot,
        duration: dur,
        type: appt.type,
        symptoms: appt.symptoms,
        amount,
      });
    } catch (e) {
      if (e && e.code === 11000) {
        return errorResponse(
          res,
          ERROR_MESSAGES.DUPLICATE_APPOINTMENT,
          HTTP_STATUS_CODES.CONFLICT
        );
      }
      throw e;
    }
    await Doctor.updateOne(
      { _id: appt.doctorId },
      { $pull: { availableSlots: timeSlot } }
    );
    const docUser = await User.findById(doctor.userId).select("_id").lean();
    const pat = await Patient.findById(appt.patientId).select("userId").lean();
    const patUser = pat
      ? await User.findById(pat.userId).select("_id").lean()
      : null;
    if (docUser && patUser) {
      await sendAppointmentConfirmation(newAppt, patUser._id, docUser._id);
    }
    await auditLogger({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.APPOINTMENT_CREATED,
      category: AUDIT_CATEGORIES.CLINICAL,
      description: "Appointment rescheduled",
      resourceType: "appointment",
      resourceId: newAppt._id,
      severity: "info",
      ...clientMeta(req),
    });
    const populated = await Appointment.findById(newAppt._id)
      .populate({
        path: "patientDetails",
        populate: { path: "userDetails", select: "name email avatar" },
      })
      .populate({
        path: "doctorDetails",
        populate: { path: "userDetails", select: "name email avatar" },
      })
      .lean();
    return successResponse(res, { appointment: populated });
  } catch (err) {
    return next(err);
  }
}

async function checkAvailability(req, res, next) {
  try {
    const { doctorId, date, timeSlot } = req.query;
    const dayDate = startOfLocalDay(date);
    const result = await checkDoctorAvailability(doctorId, dayDate, timeSlot);
    return successResponse(res, {
      available: result.available,
      reason: result.reason || null,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getAllAppointments,
  getAppointmentById,
  bookAppointment,
  updateAppointment,
  cancelAppointment,
  updateAppointmentStatus,
  confirmAppointment,
  getUpcomingAppointments,
  getPastAppointments,
  rescheduleAppointment,
  checkAvailability,
};
