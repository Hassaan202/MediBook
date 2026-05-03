const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");

/**
 * Generate appointment report with optional filters.
 * @param {object} filters - { startDate, endDate, status, doctorId }
 * @returns {Promise<object>}
 */
async function generateAppointmentReport(filters = {}) {
  const q = {};
  if (filters.startDate || filters.endDate) {
    q.appointmentDate = {};
    if (filters.startDate) q.appointmentDate.$gte = new Date(filters.startDate);
    if (filters.endDate) q.appointmentDate.$lte = new Date(filters.endDate);
  }
  if (filters.status) q.status = filters.status;
  if (filters.doctorId) q.doctorId = filters.doctorId;

  const appointments = await Appointment.find(q)
    .populate({ path: "patientId", populate: { path: "userId", select: "name email" } })
    .populate({ path: "doctorId", populate: { path: "userId", select: "name email" } })
    .sort({ appointmentDate: -1 })
    .lean();

  const statusBreakdown = appointments.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  const totalRevenue = appointments
    .filter((a) => a.paymentStatus === "paid")
    .reduce((sum, a) => sum + (a.amount || 0), 0);

  return {
    total: appointments.length,
    statusBreakdown,
    totalRevenue,
    appointments,
  };
}

/**
 * Generate doctor performance report.
 * @param {object} filters - { startDate, endDate }
 * @returns {Promise<object[]>}
 */
async function generateDoctorReport(filters = {}) {
  const matchStage = {};
  if (filters.startDate || filters.endDate) {
    matchStage.appointmentDate = {};
    if (filters.startDate) matchStage.appointmentDate.$gte = new Date(filters.startDate);
    if (filters.endDate) matchStage.appointmentDate.$lte = new Date(filters.endDate);
  }

  const doctors = await Doctor.find({})
    .populate({ path: "userId", select: "name email" })
    .lean();

  const results = await Promise.all(
    doctors.map(async (doc) => {
      const q = { doctorId: doc._id, ...matchStage };
      const [total, completed, cancelled] = await Promise.all([
        Appointment.countDocuments(q),
        Appointment.countDocuments({ ...q, status: "completed" }),
        Appointment.countDocuments({ ...q, status: "cancelled" }),
      ]);
      return {
        doctorId: doc._id,
        name: doc.userId?.name || "—",
        email: doc.userId?.email || "—",
        specialty: doc.specialty,
        rating: doc.rating,
        totalReviews: doc.totalReviews,
        totalAppointments: total,
        completedAppointments: completed,
        cancelledAppointments: cancelled,
        completionRate: total > 0 ? Number(((completed / total) * 100).toFixed(2)) : 0,
      };
    })
  );

  return results;
}

/**
 * Generate patient statistics report.
 * @param {object} filters - { startDate, endDate }
 * @returns {Promise<object>}
 */
async function generatePatientReport(filters = {}) {
  const q = {};
  if (filters.startDate || filters.endDate) {
    q.createdAt = {};
    if (filters.startDate) q.createdAt.$gte = new Date(filters.startDate);
    if (filters.endDate) q.createdAt.$lte = new Date(filters.endDate);
  }

  const patients = await Patient.find(q).lean();

  const genderBreakdown = patients.reduce((acc, p) => {
    acc[p.gender] = (acc[p.gender] || 0) + 1;
    return acc;
  }, {});

  const bloodTypeBreakdown = patients.reduce((acc, p) => {
    acc[p.bloodType] = (acc[p.bloodType] || 0) + 1;
    return acc;
  }, {});

  return {
    total: patients.length,
    genderBreakdown,
    bloodTypeBreakdown,
  };
}

/**
 * Placeholder revenue report.
 * @param {object} filters
 * @returns {Promise<object>}
 */
async function generateRevenueReport(filters = {}) {
  const q = { paymentStatus: "paid" };
  if (filters.startDate || filters.endDate) {
    q.appointmentDate = {};
    if (filters.startDate) q.appointmentDate.$gte = new Date(filters.startDate);
    if (filters.endDate) q.appointmentDate.$lte = new Date(filters.endDate);
  }

  const paid = await Appointment.find(q).lean();
  const total = paid.reduce((sum, a) => sum + (a.amount || 0), 0);

  return {
    totalRevenue: total,
    appointmentCount: paid.length,
    note: "Revenue data based on paid appointments only (placeholder)",
  };
}

/**
 * Export data to CSV string.
 * @param {object[]} data
 * @param {string[]} fields - Field names to include
 * @returns {string}
 */
function exportToCSV(data, fields) {
  if (!data || data.length === 0) return "";
  const cols = fields || Object.keys(data[0]);
  const header = cols.join(",");
  const rows = data.map((row) =>
    cols
      .map((col) => {
        const val = row[col] ?? "";
        const str = String(val).replace(/"/g, '""');
        return str.includes(",") || str.includes('"') || str.includes("\n")
          ? `"${str}"`
          : str;
      })
      .join(",")
  );
  return [header, ...rows].join("\n");
}

/**
 * Export data to formatted JSON string.
 * @param {object[]} data
 * @returns {string}
 */
function exportToJSON(data) {
  return JSON.stringify(data, null, 2);
}

module.exports = {
  generateAppointmentReport,
  generateDoctorReport,
  generatePatientReport,
  generateRevenueReport,
  exportToCSV,
  exportToJSON,
};
