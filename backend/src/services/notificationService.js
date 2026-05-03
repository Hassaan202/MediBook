const Notification = require("../models/Notification");

async function createNotification(payload) {
  const doc = {
    userId: payload.userId,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    priority: payload.priority || "normal",
    deliveryMethod: payload.deliveryMethod || ["in-app"],
    sentAt: payload.sentAt != null ? payload.sentAt : new Date(),
    expiresAt: payload.expiresAt != null ? payload.expiresAt : null,
  };
  if (payload.relatedResource) {
    doc.relatedResource = payload.relatedResource;
  }
  return Notification.create(doc);
}

async function sendAppointmentConfirmation(appointment, patientUserId, doctorUserId) {
  const title = "Appointment confirmed";
  const msg = `Your appointment on ${appointment.appointmentDate?.toISOString?.() || ""} slot ${appointment.timeSlot} is booked.`;
  await createNotification({
    userId: patientUserId,
    type: "appointment_confirmed",
    title,
    message: msg,
    relatedResource: {
      resourceType: "appointment",
      resourceId: appointment._id,
    },
    priority: "normal",
  });
  await createNotification({
    userId: doctorUserId,
    type: "appointment_confirmed",
    title: "New appointment booked",
    message: msg,
    relatedResource: {
      resourceType: "appointment",
      resourceId: appointment._id,
    },
    priority: "normal",
  });
}

async function sendAppointmentCancellation(appointment, patientUserId, doctorUserId, reason) {
  const r = reason || "Cancelled";
  await createNotification({
    userId: patientUserId,
    type: "appointment_cancelled",
    title: "Appointment cancelled",
    message: `Your appointment was cancelled. Reason: ${r}`,
    relatedResource: {
      resourceType: "appointment",
      resourceId: appointment._id,
    },
    priority: "high",
  });
  await createNotification({
    userId: doctorUserId,
    type: "appointment_cancelled",
    title: "Appointment cancelled",
    message: `An appointment was cancelled. Reason: ${r}`,
    relatedResource: {
      resourceType: "appointment",
      resourceId: appointment._id,
    },
    priority: "high",
  });
}

async function sendAppointmentReminder(appointment, patientUserId) {
  await createNotification({
    userId: patientUserId,
    type: "appointment_reminder",
    title: "Upcoming appointment",
    message: `Reminder: appointment on ${appointment.appointmentDate?.toISOString?.() || ""} ${appointment.timeSlot}`,
    relatedResource: {
      resourceType: "appointment",
      resourceId: appointment._id,
    },
    priority: "normal",
  });
}

async function sendSystemAnnouncement(userIds, title, message) {
  const docs = userIds.map((uid) => ({
    userId: uid,
    type: "system_announcement",
    title: title || "Announcement",
    message,
    priority: "normal",
    deliveryMethod: ["in-app"],
    sentAt: new Date(),
  }));
  if (docs.length) await Notification.insertMany(docs);
}

async function sendMedicalRecordCreated(record, patientUserId) {
  await createNotification({
    userId: patientUserId,
    type: "lab_results_available",
    title: "New medical record",
    message: `A visit record was added for ${record.visitDate?.toISOString?.() || ""}.`,
    relatedResource: {
      resourceType: "medical_record",
      resourceId: record._id,
    },
    priority: "normal",
  });
}

async function sendPrescriptionReady(prescription, patientUserId) {
  await createNotification({
    userId: patientUserId,
    type: "prescription_ready",
    title: "New prescription",
    message: "A new prescription is available in your account.",
    relatedResource: {
      resourceType: "prescription",
      resourceId: prescription._id,
    },
    priority: "high",
    deliveryMethod: ["in-app", "email"],
  });
}

async function sendLabResultsAdded(record, patientUserId) {
  await createNotification({
    userId: patientUserId,
    type: "lab_results_available",
    title: "Lab results updated",
    message: "New lab results were added to your medical record.",
    relatedResource: {
      resourceType: "medical_record",
      resourceId: record._id,
    },
    priority: "normal",
  });
}

async function sendReviewReceived(doctorUserId, reviewId) {
  await createNotification({
    userId: doctorUserId,
    type: "system_announcement",
    title: "New patient review",
    message: "You received a new review.",
    relatedResource: {
      resourceType: "system",
      resourceId: reviewId,
    },
    priority: "normal",
  });
}

module.exports = {
  createNotification,
  sendAppointmentConfirmation,
  sendAppointmentCancellation,
  sendAppointmentReminder,
  sendSystemAnnouncement,
  sendMedicalRecordCreated,
  sendPrescriptionReady,
  sendLabResultsAdded,
  sendReviewReceived,
};
