const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const {
  getDayOfWeek,
  getTimeSlots,
  slotStartDateTime,
  slotEndDateTime,
  startOfLocalDay,
  isDateInFuture,
  hoursUntilAppointment,
} = require("./dateTimeService");
const { USER_ROLES } = require("../config/constants");

const ACTIVE_STATUSES = ["scheduled", "confirmed", "in-progress"];

function dayWorkingHours(workingHours, date) {
  const key = getDayOfWeek(date);
  if (!workingHours || !workingHours[key]) return null;
  const wh = workingHours[key];
  if (!wh || !wh.start || !wh.end) return null;
  return wh;
}

async function getAvailableSlots(doctorId, date) {
  const doctor = await Doctor.findOne({
    _id: doctorId,
    deletedAt: null,
  }).lean();
  if (!doctor || !doctor.available) return [];
  const wh = dayWorkingHours(doctor.workingHours, date);
  const duration = doctor.consultationDuration || 30;
  let slots = [];
  if (wh) {
    slots = getTimeSlots(wh.start, wh.end, duration);
  }
  if (Array.isArray(doctor.availableSlots) && doctor.availableSlots.length) {
    const set = new Set(slots.length ? slots : doctor.availableSlots);
    doctor.availableSlots.forEach((s) => set.add(s));
    slots = Array.from(set);
  }
  const dayStart = startOfLocalDay(date);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const taken = await Appointment.find({
    doctorId,
    appointmentDate: { $gte: dayStart, $lt: dayEnd },
    status: { $in: ACTIVE_STATUSES },
  })
    .select("timeSlot")
    .lean();
  const takenSet = new Set(taken.map((t) => t.timeSlot));
  return slots.filter((s) => !takenSet.has(s));
}

async function checkDoctorAvailability(doctorId, date, timeSlot) {
  const doctor = await Doctor.findOne({
    _id: doctorId,
    deletedAt: null,
    available: true,
  }).lean();
  if (!doctor) return { available: false, reason: "Doctor not found or unavailable" };
  const start = slotStartDateTime(date, timeSlot);
  if (!start || !isDateInFuture(start)) {
    return { available: false, reason: "Invalid or past slot" };
  }
  const slots = await getAvailableSlots(doctorId, date);
  if (!slots.includes(timeSlot)) {
    return { available: false, reason: "Slot not available" };
  }
  const existing = await Appointment.findOne({
    doctorId,
    appointmentDate: { $gte: startOfLocalDay(date), $lt: new Date(startOfLocalDay(date).getTime() + 86400000) },
    timeSlot,
    status: { $in: ACTIVE_STATUSES },
  }).lean();
  if (existing) {
    return { available: false, reason: "Slot already booked" };
  }
  return { available: true, reason: null };
}

async function calculateAppointmentFee(doctorId, durationMinutes) {
  const doctor = await Doctor.findById(doctorId).select("fees consultationDuration").lean();
  if (!doctor) return null;
  const slotLen = doctor.consultationDuration || 30;
  const units = Math.max(1, Math.ceil((durationMinutes || slotLen) / slotLen));
  return Number((doctor.fees * units).toFixed(2));
}

function validateAppointmentData(data) {
  const errors = [];
  if (!data.doctorId) errors.push({ field: "doctorId", message: "doctorId is required" });
  if (!data.appointmentDate) errors.push({ field: "appointmentDate", message: "appointmentDate is required" });
  if (!data.timeSlot) errors.push({ field: "timeSlot", message: "timeSlot is required" });
  return errors;
}

async function canCancelAppointment(appointment, userId, userRole) {
  if (!appointment) return { allowed: false, reason: "Appointment not found" };
  if (["cancelled", "completed", "no-show"].includes(appointment.status)) {
    return { allowed: false, reason: "Appointment cannot be cancelled" };
  }
  if (userRole === USER_ROLES.ADMIN) {
    return { allowed: true, reason: null };
  }
  const h = hoursUntilAppointment(appointment.appointmentDate, appointment.timeSlot);
  if (h != null && h < 24) {
    return { allowed: false, reason: "Cancellation must be at least 24 hours before the appointment" };
  }
  if (userRole === USER_ROLES.PATIENT) {
    const Patient = require("../models/Patient");
    const p = await Patient.findOne({ userId }).select("_id").lean();
    if (!p || String(p._id) !== String(appointment.patientId)) {
      return { allowed: false, reason: "Forbidden" };
    }
    return { allowed: true, reason: null };
  }
  if (userRole === USER_ROLES.DOCTOR) {
    const Doctor = require("../models/Doctor");
    const d = await Doctor.findOne({ userId }).select("_id").lean();
    if (!d || String(d._id) !== String(appointment.doctorId)) {
      return { allowed: false, reason: "Forbidden" };
    }
    return { allowed: true, reason: null };
  }
  return { allowed: false, reason: "Forbidden" };
}

async function hasOverlappingAppointment(doctorId, appointmentDate, timeSlot, excludeId) {
  const start = slotStartDateTime(appointmentDate, timeSlot);
  const end = slotEndDateTime(appointmentDate, timeSlot);
  if (!start || !end) return true;
  const dayStart = startOfLocalDay(appointmentDate);
  const dayEnd = new Date(dayStart.getTime() + 86400000);
  const q = {
    doctorId,
    appointmentDate: { $gte: dayStart, $lt: dayEnd },
    status: { $in: ACTIVE_STATUSES },
  };
  if (excludeId) q._id = { $ne: excludeId };
  const others = await Appointment.find(q).select("timeSlot").lean();
  for (let i = 0; i < others.length; i += 1) {
    if (others[i].timeSlot === timeSlot) return true;
    const os = slotStartDateTime(appointmentDate, others[i].timeSlot);
    const oe = slotEndDateTime(appointmentDate, others[i].timeSlot);
    if (os && oe && start < oe && end > os) return true;
  }
  return false;
}

module.exports = {
  getAvailableSlots,
  checkDoctorAvailability,
  calculateAppointmentFee,
  validateAppointmentData,
  canCancelAppointment,
  hasOverlappingAppointment,
  ACTIVE_STATUSES,
};
