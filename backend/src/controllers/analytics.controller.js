const User = require("../models/User");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const Appointment = require("../models/Appointment");
const MedicalRecord = require("../models/MedicalRecord");
const Prescription = require("../models/Prescription");
const Review = require("../models/Review");
const { successResponse, errorResponse } = require("../utils/responseHandler");
const { HTTP_STATUS_CODES, ERROR_MESSAGES } = require("../config/constants");
const {
  calculateGrowthRate,
  aggregateByPeriod,
  formatChartData,
  calculateAverages,
} = require("../services/analyticsService");

// ─── Dashboard Analytics ──────────────────────────────────────────────────────

async function getDashboardAnalytics(req, res, next) {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [
      currentPeriodAppts,
      previousPeriodAppts,
      totalCompleted,
      totalCancelled,
      upcomingAppts,
      newPatients,
      prevPatients,
      activeDoctors,
      allDoctors,
      totalPrescriptions,
      dailyAppts,
      topSpecialties,
      hourlyDist,
    ] = await Promise.all([
      Appointment.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Appointment.countDocuments({ createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } }),
      Appointment.countDocuments({ status: "completed" }),
      Appointment.countDocuments({ status: "cancelled" }),
      Appointment.countDocuments({ appointmentDate: { $gte: now }, status: { $in: ["scheduled", "confirmed"] } }),
      Patient.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Patient.countDocuments({ createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } }),
      Doctor.countDocuments({ available: true }),
      Doctor.countDocuments({}),
      Prescription.countDocuments({ status: "active" }),
      Appointment.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Doctor.aggregate([
        {
          $group: {
            _id: "$specialty",
            count: { $sum: 1 },
            avgRating: { $avg: "$rating" },
            avgFees: { $avg: "$fees" },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      Appointment.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: {
              $hour: "$appointmentDate",
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const allRatings = await Doctor.find({}).select("rating").lean();
    const avgDoctorRating = calculateAverages(allRatings, "rating");

    return successResponse(res, {
      appointments: {
        current30Days: currentPeriodAppts,
        growthRate: calculateGrowthRate(currentPeriodAppts, previousPeriodAppts),
        completed: totalCompleted,
        cancelled: totalCancelled,
        upcoming: upcomingAppts,
        dailyTrend: dailyAppts.map((d) => ({ date: d._id, count: d.count })),
      },
      patients: {
        new30Days: newPatients,
        growthRate: calculateGrowthRate(newPatients, prevPatients),
      },
      doctors: {
        active: activeDoctors,
        total: allDoctors,
        averageRating: avgDoctorRating,
        utilizationRate: allDoctors > 0
          ? Number(((activeDoctors / allDoctors) * 100).toFixed(2))
          : 0,
      },
      prescriptions: {
        active: totalPrescriptions,
      },
      topSpecialties: topSpecialties.map((s) => ({
        specialty: s._id,
        doctorCount: s.count,
        avgRating: Number((s.avgRating || 0).toFixed(2)),
        avgFees: Number((s.avgFees || 0).toFixed(2)),
      })),
      peakHours: hourlyDist.map((h) => ({
        hour: h._id,
        count: h.count,
      })),
      revenue: { placeholder: true, note: "Revenue module coming soon" },
    });
  } catch (err) {
    return next(err);
  }
}

// ─── Appointment Analytics ────────────────────────────────────────────────────

async function getAppointmentAnalytics(req, res, next) {
  try {
    const days = parseInt(req.query.days || "30", 10);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [statusDist, specialtyDist, dayOfWeekDist, cancellationReasons, overTime] =
      await Promise.all([
        Appointment.aggregate([
          { $match: { createdAt: { $gte: since } } },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        Appointment.aggregate([
          { $match: { createdAt: { $gte: since } } },
          {
            $lookup: {
              from: "doctors",
              localField: "doctorId",
              foreignField: "_id",
              as: "doctor",
            },
          },
          { $unwind: "$doctor" },
          {
            $group: {
              _id: "$doctor.specialty",
              count: { $sum: 1 },
              totalRevenue: { $sum: "$amount" },
            },
          },
          { $sort: { count: -1 } },
        ]),
        Appointment.aggregate([
          { $match: { createdAt: { $gte: since } } },
          {
            $group: {
              _id: { $dayOfWeek: "$appointmentDate" },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        Appointment.aggregate([
          { $match: { status: "cancelled", cancellationReason: { $ne: "" }, createdAt: { $gte: since } } },
          {
            $group: {
              _id: "$cancellationReason",
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
        Appointment.aggregate([
          { $match: { createdAt: { $gte: since } } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
      ]);

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return successResponse(res, {
      period: `Last ${days} days`,
      statusDistribution: statusDist.map((s) => ({ status: s._id, count: s.count })),
      specialtyDistribution: specialtyDist.map((s) => ({
        specialty: s._id,
        count: s.count,
        totalRevenue: s.totalRevenue,
      })),
      dayOfWeekDistribution: dayOfWeekDist.map((d) => ({
        day: dayNames[d._id - 1] || d._id,
        count: d.count,
      })),
      cancellationReasons: cancellationReasons.map((r) => ({
        reason: r._id,
        count: r.count,
      })),
      overTime: overTime.map((d) => ({ date: d._id, count: d.count })),
    });
  } catch (err) {
    return next(err);
  }
}

// ─── Doctor Analytics ─────────────────────────────────────────────────────────

async function getDoctorAnalytics(req, res, next) {
  try {
    const { doctorId } = req.params;

    const doctor = await Doctor.findById(doctorId)
      .populate({ path: "userId", select: "name email" })
      .lean();

    if (!doctor) {
      return errorResponse(res, ERROR_MESSAGES.DOCTOR_NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
    }

    const [
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      totalPatients,
      totalPrescriptions,
      commonDiagnoses,
      recentRecords,
    ] = await Promise.all([
      Appointment.countDocuments({ doctorId }),
      Appointment.countDocuments({ doctorId, status: "completed" }),
      Appointment.countDocuments({ doctorId, status: "cancelled" }),
      Appointment.distinct("patientId", { doctorId }),
      Prescription.countDocuments({ doctorId }),
      MedicalRecord.aggregate([
        { $match: { doctorId: doctor._id } },
        { $group: { _id: "$diagnosis", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      MedicalRecord.find({ doctorId: doctor._id })
        .sort({ visitDate: -1 })
        .limit(5)
        .lean(),
    ]);

    return successResponse(res, {
      doctor: {
        id: doctor._id,
        name: doctor.userId?.name,
        email: doctor.userId?.email,
        specialty: doctor.specialty,
        rating: doctor.rating,
        totalReviews: doctor.totalReviews,
        experience: doctor.experience,
        fees: doctor.fees,
        available: doctor.available,
      },
      appointments: {
        total: totalAppointments,
        completed: completedAppointments,
        cancelled: cancelledAppointments,
        completionRate: totalAppointments > 0
          ? Number(((completedAppointments / totalAppointments) * 100).toFixed(2))
          : 0,
      },
      patients: {
        unique: totalPatients.length,
      },
      prescriptions: {
        total: totalPrescriptions,
      },
      commonDiagnoses: commonDiagnoses.map((d) => ({ diagnosis: d._id, count: d.count })),
      revenue: { placeholder: true, note: "Revenue module coming soon" },
    });
  } catch (err) {
    return next(err);
  }
}

// ─── Patient Analytics ────────────────────────────────────────────────────────

async function getPatientAnalytics(req, res, next) {
  try {
    const { patientId } = req.params;

    const patient = await Patient.findById(patientId)
      .populate({ path: "userId", select: "name email" })
      .lean();

    if (!patient) {
      return errorResponse(res, ERROR_MESSAGES.PATIENT_NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
    }

    const [
      totalVisits,
      upcomingAppointments,
      totalPrescriptions,
      consultedDoctors,
      diagnoses,
      vitalTrend,
    ] = await Promise.all([
      Appointment.countDocuments({ patientId, status: "completed" }),
      Appointment.find({ patientId, appointmentDate: { $gte: new Date() }, status: { $in: ["scheduled", "confirmed"] } })
        .populate({ path: "doctorId", populate: { path: "userId", select: "name" } })
        .sort({ appointmentDate: 1 })
        .limit(5)
        .lean(),
      Prescription.countDocuments({ patientId }),
      Appointment.distinct("doctorId", { patientId }),
      MedicalRecord.aggregate([
        { $match: { patientId: patient._id } },
        { $group: { _id: "$diagnosis", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      MedicalRecord.find({ patientId: patient._id, "vitalSigns.heartRate": { $exists: true } })
        .select("visitDate vitalSigns")
        .sort({ visitDate: -1 })
        .limit(10)
        .lean(),
    ]);

    return successResponse(res, {
      patient: {
        id: patient._id,
        name: patient.userId?.name,
        email: patient.userId?.email,
        gender: patient.gender,
        bloodType: patient.bloodType,
        dateOfBirth: patient.dateOfBirth,
        chronicConditions: patient.chronicConditions,
        allergies: patient.allergies,
      },
      appointments: {
        totalVisits,
        upcoming: upcomingAppointments.length,
      },
      prescriptions: {
        total: totalPrescriptions,
      },
      doctors: {
        unique: consultedDoctors.length,
      },
      diagnoses: diagnoses.map((d) => ({ diagnosis: d._id, count: d.count })),
      vitalTrend: vitalTrend.map((r) => ({
        date: r.visitDate,
        heartRate: r.vitalSigns?.heartRate,
        bloodPressure: r.vitalSigns?.bloodPressure,
        weight: r.vitalSigns?.weight,
      })),
    });
  } catch (err) {
    return next(err);
  }
}

// ─── Trends ───────────────────────────────────────────────────────────────────

async function getTrends(req, res, next) {
  try {
    const days = parseInt(req.query.days || "30", 10);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [userRegistrations, appointmentBookings, prescriptionCreations] =
      await Promise.all([
        User.aggregate([
          { $match: { createdAt: { $gte: since } } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        Appointment.aggregate([
          { $match: { createdAt: { $gte: since } } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        Prescription.aggregate([
          { $match: { createdAt: { $gte: since } } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
      ]);

    return successResponse(res, {
      period: `Last ${days} days`,
      userRegistrations: userRegistrations.map((d) => ({ date: d._id, count: d.count })),
      appointmentBookings: appointmentBookings.map((d) => ({ date: d._id, count: d.count })),
      prescriptionCreations: prescriptionCreations.map((d) => ({ date: d._id, count: d.count })),
    });
  } catch (err) {
    return next(err);
  }
}

// ─── Specialty Analytics ──────────────────────────────────────────────────────

async function getSpecialtyAnalytics(req, res, next) {
  try {
    const specialtyStats = await Doctor.aggregate([
      {
        $lookup: {
          from: "appointments",
          localField: "_id",
          foreignField: "doctorId",
          as: "appointments",
        },
      },
      {
        $group: {
          _id: "$specialty",
          doctorCount: { $sum: 1 },
          totalAppointments: { $sum: { $size: "$appointments" } },
          avgRating: { $avg: "$rating" },
          avgFees: { $avg: "$fees" },
        },
      },
      { $sort: { totalAppointments: -1 } },
    ]);

    return successResponse(res, {
      specialties: specialtyStats.map((s) => ({
        specialty: s._id,
        doctorCount: s.doctorCount,
        totalAppointments: s.totalAppointments,
        avgRating: Number((s.avgRating || 0).toFixed(2)),
        avgFees: Number((s.avgFees || 0).toFixed(2)),
      })),
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getDashboardAnalytics,
  getAppointmentAnalytics,
  getDoctorAnalytics,
  getPatientAnalytics,
  getTrends,
  getSpecialtyAnalytics,
};
