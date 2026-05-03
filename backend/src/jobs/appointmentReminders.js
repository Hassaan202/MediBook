const Appointment = require("../models/Appointment");
const Patient = require("../models/Patient");
const { sendAppointmentReminder } = require("../services/notificationService");
const {
  startOfLocalDay,
  slotStartDateTime,
} = require("../services/dateTimeService");

async function runAppointmentReminders() {
  const now = new Date();
  const horizon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const rangeStart = new Date(startOfLocalDay(now).getTime() - 24 * 60 * 60 * 1000);
  const rangeEnd = new Date(startOfLocalDay(now).getTime() + 3 * 24 * 60 * 60 * 1000);
  const appts = await Appointment.find({
    reminderSent: false,
    status: { $in: ["scheduled", "confirmed"] },
    appointmentDate: { $gte: rangeStart, $lte: rangeEnd },
  })
    .select("patientId appointmentDate timeSlot")
    .limit(500)
    .lean();
  for (let i = 0; i < appts.length; i += 1) {
    const a = appts[i];
    const start = slotStartDateTime(a.appointmentDate, a.timeSlot);
    if (!start || start < now || start > horizon) continue;
    const patient = await Patient.findById(a.patientId).select("userId").lean();
    if (!patient) continue;
    await sendAppointmentReminder(a, patient.userId);
    await Appointment.updateOne({ _id: a._id }, { $set: { reminderSent: true } });
  }
}

module.exports = { runAppointmentReminders };
