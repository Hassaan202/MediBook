const nodemailer = require("nodemailer");
const {
  FRONTEND_URL,
  MAIL_HOST,
  MAIL_PORT,
  MAIL_USER,
  MAIL_PASS,
  MAIL_FROM,
} = require("../config/env");
const templates = require("./emailTemplates");

function mailConfigured() {
  return Boolean(MAIL_USER && MAIL_PASS);
}

let transporter;
let verifyLogged = false;

function getTransporter() {
  if (!mailConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: MAIL_HOST,
      port: MAIL_PORT,
      secure: MAIL_PORT === 465,
      auth: { user: MAIL_USER, pass: MAIL_PASS },
    });
  }
  return transporter;
}

async function sendMail({ to, subject, text, html }) {
  const t = getTransporter();
  if (!t) {
    // eslint-disable-next-line no-console
    console.log(`[EmailService] (no SMTP — set MAIL_USER/MAIL_PASS in .env) To: ${to}\nSubject: ${subject}\n${text}`);
    return { skipped: true };
  }
  try {
    if (!verifyLogged) {
      verifyLogged = true;
      await t.verify();
      // eslint-disable-next-line no-console
      console.log(`[EmailService] SMTP ready (${MAIL_HOST}:${MAIL_PORT})`);
    }
    const info = await t.sendMail({
      from: MAIL_FROM,
      to,
      subject,
      text,
      html: html || text.replace(/\n/g, "<br/>"),
    });
    // eslint-disable-next-line no-console
    console.log(`[EmailService] sent messageId=${info.messageId} to=${to}`);
    return { skipped: false };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[EmailService] sendMail failed:", err && err.message ? err.message : err);
    throw err;
  }
}

/**
 * Send welcome email to a newly created user.
 * @param {object} user - { name, email }
 * @param {string} tempPassword - Temporary password (if admin-created)
 */
async function sendWelcomeEmail(user, tempPassword = null) {
  const signInUrl = `${FRONTEND_URL}/login`;
  const { subject, text, html } = templates.welcomeEmail({
    name: user.name,
    signInUrl,
    tempPassword: tempPassword || null,
  });
  await sendMail({ to: user.email, subject, text, html });
}

/**
 * Email verification after self-registration.
 */
async function sendEmailVerificationEmail(user, verifyUrl) {
  const { subject, text, html } = templates.verificationEmail({ name: user.name, verifyUrl });
  await sendMail({ to: user.email, subject, text, html });
}

/**
 * Send password reset email.
 */
async function sendPasswordResetEmail(user, resetLink) {
  const { subject, text, html } = templates.passwordResetEmail({ name: user.name, resetLink });
  await sendMail({ to: user.email, subject, text, html });
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

/**
 * Notify user that an admin approved their account.
 */
async function sendRegistrationApprovedEmail(user) {
  const signInUrl = `${FRONTEND_URL}/login`;
  const { subject, text, html } = templates.registrationApprovedEmail({ name: user.name, signInUrl });
  await sendMail({ to: user.email, subject, text, html });
}

/**
 * Notify user that an admin rejected their registration.
 * @param {object} user - { name, email }
 * @param {string|null} reason - optional message shown to the applicant
 */
async function sendRegistrationRejectedEmail(user, reason = null) {
  const { subject, text, html } = templates.registrationRejectedEmail({ name: user.name, reason });
  await sendMail({ to: user.email, subject, text, html });
}

module.exports = {
  mailConfigured,
  sendWelcomeEmail,
  sendEmailVerificationEmail,
  sendPasswordResetEmail,
  sendAppointmentConfirmation,
  sendAppointmentReminder,
  sendPrescriptionEmail,
  sendSystemAnnouncement,
  sendRegistrationApprovedEmail,
  sendRegistrationRejectedEmail,
  FRONTEND_URL,
};
