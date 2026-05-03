/**
 * Email service — placeholder implementations.
 * In production, replace console.log calls with a real email provider
 * (e.g. nodemailer + Gmail / SendGrid / AWS SES).
 */

/**
 * Send welcome email to a newly created user.
 * @param {object} user - { name, email }
 * @param {string} tempPassword - Temporary password (if admin-created)
 */
function sendWelcomeEmail(user, tempPassword = null) {
  // eslint-disable-next-line no-console
  console.log(
    `[EmailService] Welcome email → ${user.email} (${user.name})` +
      (tempPassword ? ` | tempPassword: ${tempPassword}` : "")
  );
}

/**
 * Send password reset email.
 * @param {object} user - { name, email }
 * @param {string} resetLink
 */
function sendPasswordResetEmail(user, resetLink) {
  // eslint-disable-next-line no-console
  console.log(
    `[EmailService] Password reset email → ${user.email} | link: ${resetLink}`
  );
}

/**
 * Send appointment confirmation to patient.
 * @param {object} appointment - Populated appointment document
 */
function sendAppointmentConfirmation(appointment) {
  const patientEmail =
    appointment.patientId?.userId?.email ||
    appointment.patientId?.email ||
    "unknown";
  // eslint-disable-next-line no-console
  console.log(
    `[EmailService] Appointment confirmation → ${patientEmail} | date: ${appointment.appointmentDate} slot: ${appointment.timeSlot}`
  );
}

/**
 * Send appointment reminder.
 * @param {object} appointment - Populated appointment document
 */
function sendAppointmentReminder(appointment) {
  const patientEmail =
    appointment.patientId?.userId?.email ||
    appointment.patientId?.email ||
    "unknown";
  // eslint-disable-next-line no-console
  console.log(
    `[EmailService] Appointment reminder → ${patientEmail} | appointmentId: ${appointment._id}`
  );
}

/**
 * Send prescription details to patient.
 * @param {object} prescription - Populated prescription document
 */
function sendPrescriptionEmail(prescription) {
  const patientEmail =
    prescription.patientId?.userId?.email ||
    prescription.patientId?.email ||
    "unknown";
  // eslint-disable-next-line no-console
  console.log(
    `[EmailService] Prescription email → ${patientEmail} | prescriptionId: ${prescription._id}`
  );
}

/**
 * Send system-wide announcement to a list of users.
 * @param {object[]} users - Array of user objects with email field
 * @param {string} message
 */
function sendSystemAnnouncement(users, message) {
  const emails = users.map((u) => u.email).join(", ");
  // eslint-disable-next-line no-console
  console.log(
    `[EmailService] System announcement → [${emails}] | message: ${message}`
  );
}

module.exports = {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendAppointmentConfirmation,
  sendAppointmentReminder,
  sendPrescriptionEmail,
  sendSystemAnnouncement,
};
