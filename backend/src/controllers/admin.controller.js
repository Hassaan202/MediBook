const crypto = require("crypto");
const os = require("os");
const mongoose = require("mongoose");
const User = require("../models/User");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const Appointment = require("../models/Appointment");
const MedicalRecord = require("../models/MedicalRecord");
const Prescription = require("../models/Prescription");
const AuditLog = require("../models/AuditLog");
const ActivityLog = require("../models/ActivityLog");
const Notification = require("../models/Notification");
const { auditLogger } = require("../middleware/logger");
const { successResponse, errorResponse } = require("../utils/responseHandler");
const { getPagination, paginationMeta } = require("../utils/pagination");
const { hashPassword } = require("../utils/passwordHasher");
const {
  HTTP_STATUS_CODES,
  ERROR_MESSAGES,
  USER_ROLES,
  AUDIT_ACTIONS,
  AUDIT_CATEGORIES,
} = require("../config/constants");
const { generateAppointmentReport, generateDoctorReport, generatePatientReport, exportToCSV, exportToJSON } = require("../services/reportService");
const { sendWelcomeEmail, sendSystemAnnouncement } = require("../services/emailService");

function clientMeta(req) {
  return {
    ipAddress: req.ip || req.socket?.remoteAddress || null,
    userAgent: req.get("user-agent") || null,
  };
}

// ─── Dashboard Stats ───────────────────────────────────────────────────────────

/**
 * getDashboardStats
 * Retrieves an aggregated overview of the entire system for the Admin Dashboard.
 * Includes user counts, appointment statistics, system alerts, and recent activities.
 */
async function getDashboardStats(req, res, next) {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      totalDoctors,
      activeDoctors,
      totalPatients,
      totalAppointments,
      scheduledAppointments,
      todayAppointments,
      weekAppointments,
      monthAppointments,
      totalMedicalRecords,
      totalActivePrescriptions,
      recentAuditLogs,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ lastLogin: { $gte: thirtyDaysAgo } }),
      Doctor.countDocuments({}),
      Doctor.countDocuments({ available: true }),
      Patient.countDocuments({}),
      Appointment.countDocuments({}),
      Appointment.countDocuments({ status: { $in: ["scheduled", "confirmed"] } }),
      Appointment.countDocuments({ appointmentDate: { $gte: startOfDay } }),
      Appointment.countDocuments({ appointmentDate: { $gte: startOfWeek } }),
      Appointment.countDocuments({ appointmentDate: { $gte: startOfMonth } }),
      MedicalRecord.countDocuments({}),
      Prescription.countDocuments({ status: "active" }),
      AuditLog.find({})
        .sort({ timestamp: -1 })
        .limit(10)
        .populate({ path: "userId", select: "name email" })
        .lean(),
    ]);

    const usersByRole = await User.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]);

    const appointmentsByStatus = await Appointment.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    return successResponse(res, {
      users: {
        total: totalUsers,
        active: activeUsers,
        byRole: usersByRole.reduce((acc, r) => { acc[r._id] = r.count; return acc; }, {}),
      },
      doctors: {
        total: totalDoctors,
        active: activeDoctors,
        inactive: totalDoctors - activeDoctors,
      },
      patients: {
        total: totalPatients,
      },
      appointments: {
        total: totalAppointments,
        scheduled: scheduledAppointments,
        today: todayAppointments,
        thisWeek: weekAppointments,
        thisMonth: monthAppointments,
        byStatus: appointmentsByStatus.reduce((acc, r) => { acc[r._id] = r.count; return acc; }, {}),
      },
      medicalRecords: {
        total: totalMedicalRecords,
      },
      prescriptions: {
        active: totalActivePrescriptions,
      },
      recentActivity: recentAuditLogs.map((log) => ({
        id: log._id,
        action: log.action,
        category: log.category,
        description: log.description,
        user: log.userId ? { name: log.userId.name, email: log.userId.email } : null,
        timestamp: log.timestamp,
        severity: log.severity,
      })),
      revenue: {
        placeholder: true,
        note: "Revenue module coming soon",
      },
    });
  } catch (err) {
    return next(err);
  }
}

// ─── User Management ──────────────────────────────────────────────────────────

async function getAllUsers(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const q = {};
    if (req.query.role) q.role = String(req.query.role);
    if (req.query.isActive !== undefined) q.isActive = req.query.isActive === "true";
    if (req.query.search) {
      const re = new RegExp(String(req.query.search).trim(), "i");
      q.$or = [{ name: re }, { email: re }];
    }
    if (req.query.startDate || req.query.endDate) {
      q.createdAt = {};
      if (req.query.startDate) q.createdAt.$gte = new Date(req.query.startDate);
      if (req.query.endDate) q.createdAt.$lte = new Date(req.query.endDate);
    }

    let sortField = req.query.sortBy || "createdAt";
    const sortDir = req.query.sortOrder === "asc" ? 1 : -1;
    const [users, total] = await Promise.all([
      User.find(q).sort({ [sortField]: sortDir }).skip(skip).limit(limit).lean(),
      User.countDocuments(q),
    ]);

    return successResponse(res, {
      users,
      pagination: paginationMeta(total, page, limit),
    });
  } catch (err) {
    return next(err);
  }
}

async function getUserById(req, res, next) {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) {
      return errorResponse(res, ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
    }

    let profile = null;
    if (user.role === USER_ROLES.DOCTOR) {
      profile = await Doctor.findOne({ userId: user._id }).lean();
    } else if (user.role === USER_ROLES.PATIENT) {
      profile = await Patient.findOne({ userId: user._id }).lean();
    }

    const recentActivity = await AuditLog.find({ userId: user._id })
      .sort({ timestamp: -1 })
      .limit(20)
      .lean();

    return successResponse(res, { user, profile, recentActivity });
  } catch (err) {
    return next(err);
  }
}

async function createUser(req, res, next) {
  try {
    const {
      email, password, name, role,
      specialty, experience, fees,
      dateOfBirth, gender, bloodType, phone, emergencyContact, address,
    } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      return errorResponse(res, ERROR_MESSAGES.EMAIL_EXISTS, HTTP_STATUS_CODES.CONFLICT);
    }

    const user = await User.create({ email, password, name, role });

    try {
      if (role === USER_ROLES.DOCTOR) {
        await Doctor.create({ userId: user._id, specialty, experience, fees });
      } else if (role === USER_ROLES.PATIENT) {
        await Patient.create({
          userId: user._id,
          dateOfBirth,
          gender,
          bloodType,
          phone,
          address,
          emergencyContact: {
            name: emergencyContact?.name,
            phone: emergencyContact?.phone,
            relationship: emergencyContact?.relationship,
          },
        });
      }
    } catch (innerErr) {
      await User.deleteOne({ _id: user._id });
      throw innerErr;
    }

    sendWelcomeEmail(user);

    await auditLogger({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.USER_CREATED,
      category: AUDIT_CATEGORIES.ADMIN,
      description: `Admin created user: ${email} (${role})`,
      resourceType: "user",
      resourceId: user._id,
      severity: "info",
      ...clientMeta(req),
    });

    return successResponse(res, { user }, "User created", HTTP_STATUS_CODES.CREATED);
  } catch (err) {
    return next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return errorResponse(res, ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
    }

    const allowed = ["name", "avatar", "isActive"];
    const before = {};
    const after = {};

    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        before[field] = user[field];
        user[field] = req.body[field];
        after[field] = req.body[field];
      }
    }

    await user.save();

    await auditLogger({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.USER_UPDATED,
      category: AUDIT_CATEGORIES.ADMIN,
      description: `Admin updated user: ${user.email}`,
      details: { before, after },
      resourceType: "user",
      resourceId: user._id,
      severity: "info",
      ...clientMeta(req),
    });

    return successResponse(res, { user }, "User updated");
  } catch (err) {
    return next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return errorResponse(res, ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
    }

    const hardDelete = req.query.hard === "true";

    if (hardDelete) {
      // Hard delete — cascade
      if (user.role === USER_ROLES.DOCTOR) {
        const doc = await Doctor.findOne({ userId: user._id });
        if (doc) {
          await Appointment.deleteMany({ doctorId: doc._id });
          await Doctor.deleteOne({ _id: doc._id });
        }
      } else if (user.role === USER_ROLES.PATIENT) {
        const pat = await Patient.findOne({ userId: user._id });
        if (pat) {
          await Appointment.deleteMany({ patientId: pat._id });
          await Patient.deleteOne({ _id: pat._id });
        }
      }
      await User.deleteOne({ _id: user._id });
    } else {
      // Soft delete
      user.isActive = false;
      await user.save();
    }

    await auditLogger({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.USER_DELETED,
      category: AUDIT_CATEGORIES.ADMIN,
      description: `Admin ${hardDelete ? "hard" : "soft"} deleted user: ${user.email}`,
      resourceType: "user",
      resourceId: user._id,
      severity: "warning",
      ...clientMeta(req),
    });

    return successResponse(res, null, "User deleted");
  } catch (err) {
    return next(err);
  }
}

async function activateUser(req, res, next) {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: true } },
      { new: true }
    );
    if (!user) {
      return errorResponse(res, ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
    }

    await auditLogger({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.USER_UPDATED,
      category: AUDIT_CATEGORIES.ADMIN,
      description: `Admin activated user: ${user.email}`,
      resourceType: "user",
      resourceId: user._id,
      severity: "info",
      ...clientMeta(req),
    });

    return successResponse(res, { user }, "User activated");
  } catch (err) {
    return next(err);
  }
}

async function deactivateUser(req, res, next) {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false } },
      { new: true }
    );
    if (!user) {
      return errorResponse(res, ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
    }

    await auditLogger({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.USER_UPDATED,
      category: AUDIT_CATEGORIES.ADMIN,
      description: `Admin deactivated user: ${user.email}`,
      resourceType: "user",
      resourceId: user._id,
      severity: "warning",
      ...clientMeta(req),
    });

    return successResponse(res, { user }, "User deactivated");
  } catch (err) {
    return next(err);
  }
}

async function resetUserPassword(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return errorResponse(res, ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
    }

    const tempPassword = crypto.randomBytes(8).toString("hex");
    user.password = tempPassword;
    user.refreshToken = null;
    await user.save();

    sendWelcomeEmail(user, tempPassword);

    await auditLogger({
      userId: req.user.userId,
      action: AUDIT_ACTIONS.PASSWORD_CHANGED,
      category: AUDIT_CATEGORIES.ADMIN,
      description: `Admin force-reset password for: ${user.email}`,
      resourceType: "user",
      resourceId: user._id,
      severity: "warning",
      ...clientMeta(req),
    });

    return successResponse(res, { tempPassword }, "Password reset. Send to user securely.");
  } catch (err) {
    return next(err);
  }
}

// ─── Audit & Activity Logs ────────────────────────────────────────────────────

async function getAuditLogs(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const q = {};
    if (req.query.userId) q.userId = req.query.userId;
    if (req.query.action) q.action = String(req.query.action);
    if (req.query.category) q.category = String(req.query.category);
    if (req.query.severity) q.severity = String(req.query.severity);
    if (req.query.startDate || req.query.endDate) {
      q.timestamp = {};
      if (req.query.startDate) q.timestamp.$gte = new Date(req.query.startDate);
      if (req.query.endDate) q.timestamp.$lte = new Date(req.query.endDate);
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(q)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: "userId", select: "name email" })
        .lean(),
      AuditLog.countDocuments(q),
    ]);

    if (req.query.export === "csv") {
      const flat = logs.map((l) => ({
        id: l._id,
        user: l.userId?.name || "",
        email: l.userId?.email || "",
        action: l.action,
        category: l.category,
        description: l.description,
        severity: l.severity,
        timestamp: l.timestamp,
      }));
      const csv = (await import("../services/reportService.js")).exportToCSV(flat, Object.keys(flat[0] || {}));
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=audit-logs.csv");
      return res.send(csv);
    }

    return successResponse(res, {
      logs: logs.map((l) => ({
        id: l._id,
        userId: l.userId?._id || l.userId,
        userName: l.userId?.name || "Unknown",
        userEmail: l.userId?.email || "",
        action: l.action,
        category: l.category,
        description: l.description,
        details: l.details,
        severity: l.severity,
        resourceType: l.resourceType,
        resourceId: l.resourceId,
        ipAddress: l.ipAddress,
        timestamp: l.timestamp,
      })),
      pagination: paginationMeta(total, page, limit),
    });
  } catch (err) {
    return next(err);
  }
}

async function getActivityLogs(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const q = {};
    if (req.query.userId) q.userId = req.query.userId;
    if (req.query.entity) q.entity = String(req.query.entity);
    if (req.query.startDate || req.query.endDate) {
      q.timestamp = {};
      if (req.query.startDate) q.timestamp.$gte = new Date(req.query.startDate);
      if (req.query.endDate) q.timestamp.$lte = new Date(req.query.endDate);
    }

    const [logs, total] = await Promise.all([
      ActivityLog.find(q)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: "userId", select: "name email" })
        .lean(),
      ActivityLog.countDocuments(q),
    ]);

    return successResponse(res, {
      logs,
      pagination: paginationMeta(total, page, limit),
    });
  } catch (err) {
    return next(err);
  }
}

// ─── Statistics & Reports ─────────────────────────────────────────────────────

async function getStatistics(req, res, next) {
  try {
    const now = new Date();
    const periods = [7, 30, 90].map((d) => ({
      days: d,
      since: new Date(now.getTime() - d * 24 * 60 * 60 * 1000),
    }));

    const [
      userGrowth,
      apptTrend,
      specialtyStats,
      cancellationRate,
    ] = await Promise.all([
      // New users per day for last 30 days
      User.aggregate([
        { $match: { createdAt: { $gte: periods[1].since } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      // Appointments per day for last 30 days
      Appointment.aggregate([
        { $match: { createdAt: { $gte: periods[1].since } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      // Top specialties
      Doctor.aggregate([
        {
          $lookup: {
            from: "appointments",
            localField: "_id",
            foreignField: "doctorId",
            as: "appts",
          },
        },
        {
          $group: {
            _id: "$specialty",
            doctorCount: { $sum: 1 },
            appointmentCount: { $sum: { $size: "$appts" } },
            avgRating: { $avg: "$rating" },
          },
        },
        { $sort: { appointmentCount: -1 } },
        { $limit: 10 },
      ]),
      // Cancellation rate
      Appointment.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            cancelled: {
              $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
            },
          },
        },
      ]),
    ]);

    const cr = cancellationRate[0] || { total: 0, cancelled: 0 };

    return successResponse(res, {
      userGrowth,
      appointmentTrend: apptTrend,
      specialtyStats,
      cancellationRate: cr.total > 0
        ? Number(((cr.cancelled / cr.total) * 100).toFixed(2))
        : 0,
      revenueTrend: { placeholder: true, note: "Revenue module coming soon" },
    });
  } catch (err) {
    return next(err);
  }
}

async function getAppointmentReports(req, res, next) {
  try {
    const report = await generateAppointmentReport({
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      status: req.query.status,
      doctorId: req.query.doctorId,
    });

    if (req.query.export === "csv") {
      const flat = report.appointments.map((a) => ({
        id: a._id,
        patient: a.patientId?.userId?.name || "",
        doctor: a.doctorId?.userId?.name || "",
        date: a.appointmentDate,
        slot: a.timeSlot,
        status: a.status,
        amount: a.amount,
        paymentStatus: a.paymentStatus,
      }));
      const csv = exportToCSV(flat, Object.keys(flat[0] || {}));
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=appointments-report.csv");
      return res.send(csv);
    }

    return successResponse(res, report);
  } catch (err) {
    return next(err);
  }
}

async function getRevenueReport(req, res, next) {
  try {
    const { generateRevenueReport } = require("../services/reportService");
    const report = await generateRevenueReport({
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });
    return successResponse(res, report);
  } catch (err) {
    return next(err);
  }
}

async function getDoctorReports(req, res, next) {
  try {
    const report = await generateDoctorReport({
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });
    return successResponse(res, { doctors: report });
  } catch (err) {
    return next(err);
  }
}

async function getPatientReports(req, res, next) {
  try {
    const { generatePatientReport } = require("../services/reportService");
    const report = await generatePatientReport({
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });
    return successResponse(res, report);
  } catch (err) {
    return next(err);
  }
}

// ─── Announcements ────────────────────────────────────────────────────────────

async function createAnnouncement(req, res, next) {
  try {
    const { title, message, role, priority = "normal" } = req.body;
    if (!title || !message) {
      return errorResponse(res, "Title and message are required", HTTP_STATUS_CODES.BAD_REQUEST);
    }

    const q = {};
    if (role) q.role = role;
    const users = await User.find(q).select("_id").lean();

    const notifications = users.map((u) => ({
      userId: u._id,
      type: "system_announcement",
      title,
      message,
      priority,
      deliveryMethod: priority === "urgent" ? ["in-app", "sms"] : ["in-app"],
      sentAt: new Date(),
    }));

    await Notification.insertMany(notifications);

    sendSystemAnnouncement(
      await User.find(q).select("email name").lean(),
      message
    );

    await auditLogger({
      userId: req.user.userId,
      action: "system_config_changed",
      category: AUDIT_CATEGORIES.SYSTEM,
      description: `System announcement sent: "${title}" to ${users.length} users`,
      severity: "info",
      ...clientMeta(req),
    });

    return successResponse(
      res,
      { sent: users.length },
      "Announcement sent",
      HTTP_STATUS_CODES.CREATED
    );
  } catch (err) {
    return next(err);
  }
}

// ─── System Health ────────────────────────────────────────────────────────────

async function systemHealthCheck(req, res, next) {
  try {
    const dbState = mongoose.connection.readyState;
    const dbStatus =
      dbState === 1 ? "connected" : dbState === 2 ? "connecting" : "disconnected";

    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();

    return successResponse(res, {
      status: dbState === 1 ? "healthy" : "degraded",
      database: {
        status: dbStatus,
        host: mongoose.connection.host,
        name: mongoose.connection.name,
      },
      memory: {
        heapUsedMB: Number((memUsage.heapUsed / 1024 / 1024).toFixed(2)),
        heapTotalMB: Number((memUsage.heapTotal / 1024 / 1024).toFixed(2)),
        rssMB: Number((memUsage.rss / 1024 / 1024).toFixed(2)),
        systemTotalMB: Number((totalMem / 1024 / 1024).toFixed(2)),
        systemFreeMB: Number((freeMem / 1024 / 1024).toFixed(2)),
        systemUsagePct: Number((((totalMem - freeMem) / totalMem) * 100).toFixed(2)),
      },
      cpu: {
        platform: os.platform(),
        arch: os.arch(),
        cores: os.cpus().length,
        loadAvg: os.loadavg(),
      },
      process: {
        nodeVersion: process.version,
        uptime: process.uptime(),
        pid: process.pid,
      },
      timestamp: new Date(),
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getDashboardStats,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  activateUser,
  deactivateUser,
  resetUserPassword,
  getAuditLogs,
  getActivityLogs,
  getStatistics,
  getAppointmentReports,
  getRevenueReport,
  getDoctorReports,
  getPatientReports,
  createAnnouncement,
  systemHealthCheck,
};
