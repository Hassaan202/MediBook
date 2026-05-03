require("../config/env");
const { connectDB } = require("../config/database");
const mongoose = require("mongoose");
const User = require("../models/User");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const Appointment = require("../models/Appointment");
const MedicalRecord = require("../models/MedicalRecord");
const Prescription = require("../models/Prescription");
const Review = require("../models/Review");
const Notification = require("../models/Notification");
const AuditLog = require("../models/AuditLog");
const SystemConfig = require("../models/SystemConfig");
const { startOfLocalDay, getTimeSlots } = require("../services/dateTimeService");
const { generateDigitalSignature, calculateValidUntil } = require("../services/prescriptionService");

const SEED_EMAILS = [
  "admin@medibook.com",
  "doctor1@medibook.com","doctor2@medibook.com","doctor3@medibook.com",
  "doctor4@medibook.com","doctor5@medibook.com",
  "patient1@medibook.com","patient2@medibook.com","patient3@medibook.com",
  "patient4@medibook.com","patient5@medibook.com",
  "patient6@medibook.com","patient7@medibook.com","patient8@medibook.com",
  "patient9@medibook.com","patient10@medibook.com",
];

const daySlot = { start: "09:00", end: "17:00" };
const workingHours = {
  monday: daySlot, tuesday: daySlot, wednesday: daySlot,
  thursday: daySlot, friday: daySlot,
  saturday: { start: "10:00", end: "14:00" },
  sunday: { start: "10:00", end: "12:00" },
};
const slotTemplates = getTimeSlots("09:00", "17:00", 30);

function log(msg) { process.stdout.write(`[seed] ${msg}\n`); }

async function clearSeeds() {
  log("Clearing existing seed data…");
  const existing = await User.find({ email: { $in: SEED_EMAILS } }).select("_id");
  const userIds = existing.map((u) => u._id);
  if (!userIds.length) { log("Nothing to clear."); return; }
  const doctors = await Doctor.find({ userId: { $in: userIds } }).select("_id");
  const patients = await Patient.find({ userId: { $in: userIds } }).select("_id");
  const doctorIds = doctors.map((d) => d._id);
  const patientIds = patients.map((p) => p._id);
  await Review.deleteMany({ $or: [{ patientId: { $in: patientIds } }, { doctorId: { $in: doctorIds } }] });
  await MedicalRecord.deleteMany({ $or: [{ patientId: { $in: patientIds } }, { doctorId: { $in: doctorIds } }] });
  await Prescription.deleteMany({ $or: [{ patientId: { $in: patientIds } }, { doctorId: { $in: doctorIds } }] });
  await Appointment.deleteMany({ $or: [{ doctorId: { $in: doctorIds } }, { patientId: { $in: patientIds } }] });
  await Notification.deleteMany({ userId: { $in: userIds } });
  await AuditLog.deleteMany({ userId: { $in: userIds } });
  await Doctor.deleteMany({ userId: { $in: userIds } });
  await Patient.deleteMany({ userId: { $in: userIds } });
  await User.deleteMany({ _id: { $in: userIds } });
  log("Cleared.");
}

async function seedSystemConfigs() {
  log("Seeding system configs…");
  const defaults = [
    { key: "app_name", value: "MediBook", description: "Application name", category: "general" },
    { key: "app_version", value: "1.0.0", description: "Current version", category: "general", isEditable: false },
    { key: "max_appointments_per_day", value: 20, description: "Max appointments a doctor can have per day", category: "appointment" },
    { key: "appointment_reminder_hours", value: 24, description: "Hours before appointment to send reminder", category: "appointment" },
    { key: "cancellation_window_hours", value: 2, description: "Minimum hours before appointment to allow cancellation", category: "appointment" },
    { key: "default_slot_duration", value: 30, description: "Default appointment slot duration in minutes", category: "appointment" },
    { key: "notification_email_enabled", value: true, description: "Enable email notifications", category: "notification" },
    { key: "notification_sms_enabled", value: false, description: "Enable SMS notifications", category: "notification" },
    { key: "notification_ttl_days", value: 30, description: "Days before notification expires", category: "notification" },
    { key: "currency", value: "USD", description: "Base currency", category: "payment" },
    { key: "payment_gateway", value: "placeholder", description: "Payment gateway provider", category: "payment" },
    { key: "password_min_length", value: 8, description: "Minimum password length", category: "security" },
    { key: "jwt_expire", value: "15m", description: "JWT access token expiry", category: "security", isEditable: false },
    { key: "max_login_attempts", value: 5, description: "Max failed login attempts before lockout", category: "security" },
  ];
  for (const cfg of defaults) {
    await SystemConfig.findOneAndUpdate(
      { key: cfg.key },
      { $setOnInsert: cfg },
      { upsert: true }
    );
  }
  log(`System configs: ${defaults.length} upserted.`);
}

async function seed() {
  await connectDB();
  await clearSeeds();
  await seedSystemConfigs();

  const plainPassword = "Password1";

  // ── Admin ────────────────────────────────────────────────────────────────────
  log("Creating admin…");
  const adminUser = await User.create({
    email: "admin@medibook.com",
    password: plainPassword,
    name: "MediBook Admin",
    role: "admin",
  });

  // ── Doctors ──────────────────────────────────────────────────────────────────
  log("Creating 5 doctors…");
  const doctorSpecs = [
    { email: "doctor1@medibook.com", name: "Dr. Alice Carter", specialty: "Cardiology", fees: 200, experience: 12 },
    { email: "doctor2@medibook.com", name: "Dr. Ben Lee", specialty: "Dermatology", fees: 175, experience: 8 },
    { email: "doctor3@medibook.com", name: "Dr. Carla Ruiz", specialty: "Pediatrics", fees: 160, experience: 10 },
    { email: "doctor4@medibook.com", name: "Dr. David Kim", specialty: "Orthopedics", fees: 220, experience: 15 },
    { email: "doctor5@medibook.com", name: "Dr. Eva Novak", specialty: "Neurology", fees: 250, experience: 18 },
  ];
  const doctorDocs = [];
  for (let i = 0; i < doctorSpecs.length; i++) {
    const s = doctorSpecs[i];
    const u = await User.create({ email: s.email, password: plainPassword, name: s.name, role: "doctor" });
    const d = await Doctor.create({
      userId: u._id,
      specialty: s.specialty,
      qualifications: ["MBBS", "MD"],
      experience: s.experience,
      fees: s.fees,
      rating: 3.8 + (i % 3) * 0.2,
      totalReviews: 5 + i * 2,
      available: true,
      availableSlots: [...slotTemplates],
      workingHours,
      consultationDuration: 30,
      bio: `Experienced ${s.specialty} specialist with ${s.experience} years of practice.`,
      languages: ["English"],
    });
    doctorDocs.push({ doc: d, user: u });
  }

  // ── Patients ─────────────────────────────────────────────────────────────────
  log("Creating 10 patients…");
  const patientSpecs = [
    { email: "patient1@medibook.com", name: "Grace Hill", phone: "(555) 111-2222", gender: "Female", blood: "A+", dob: new Date(1990, 3, 12) },
    { email: "patient2@medibook.com", name: "Henry Adams", phone: "(555) 222-3333", gender: "Male", blood: "B+", dob: new Date(1985, 6, 20) },
    { email: "patient3@medibook.com", name: "Ivy Chen", phone: "(555) 333-4444", gender: "Female", blood: "O+", dob: new Date(1995, 1, 5) },
    { email: "patient4@medibook.com", name: "Jack Brown", phone: "(555) 444-5555", gender: "Male", blood: "AB+", dob: new Date(1978, 9, 30) },
    { email: "patient5@medibook.com", name: "Karen White", phone: "(555) 555-6666", gender: "Female", blood: "A-", dob: new Date(2000, 4, 15) },
    { email: "patient6@medibook.com", name: "Leo Martinez", phone: "(555) 666-7777", gender: "Male", blood: "O-", dob: new Date(1992, 7, 22) },
    { email: "patient7@medibook.com", name: "Mia Johnson", phone: "(555) 777-8888", gender: "Female", blood: "B-", dob: new Date(1988, 2, 8) },
    { email: "patient8@medibook.com", name: "Noah Wilson", phone: "(555) 888-9999", gender: "Male", blood: "AB-", dob: new Date(1975, 11, 1) },
    { email: "patient9@medibook.com", name: "Olivia Davis", phone: "(555) 999-0001", gender: "Female", blood: "A+", dob: new Date(1998, 8, 17) },
    { email: "patient10@medibook.com", name: "Paul Garcia", phone: "(555) 000-1111", gender: "Male", blood: "B+", dob: new Date(1983, 5, 25) },
  ];
  const patientDocs = [];
  for (const s of patientSpecs) {
    const u = await User.create({ email: s.email, password: plainPassword, name: s.name, role: "patient" });
    const p = await Patient.create({
      userId: u._id,
      dateOfBirth: s.dob,
      gender: s.gender,
      bloodType: s.blood,
      phone: s.phone,
      emergencyContact: { name: "Emergency Contact", relationship: "Family", phone: "(555) 999-0000" },
      allergies: s.blood.includes("A") ? ["Penicillin"] : [],
      chronicConditions: s.dob.getFullYear() < 1985 ? ["Hypertension"] : [],
    });
    patientDocs.push({ pat: p, user: u });
  }

  // ── Appointments ─────────────────────────────────────────────────────────────
  log("Creating 20 appointments…");
  const day0 = startOfLocalDay(new Date());
  const future = (n) => new Date(day0.getTime() + n * 86400000);
  const past = (n) => new Date(day0.getTime() - n * 86400000);

  const appts = [];
  for (let i = 0; i < 20; i++) {
    const pat = patientDocs[i % 10].pat._id;
    const doc = doctorDocs[i % 5].doc._id;
    const fees = doctorSpecs[i % 5].fees;
    const statuses = ["scheduled", "confirmed", "completed", "cancelled", "no-show"];
    const status = i < 8 ? "scheduled" : i < 12 ? "completed" : statuses[i % statuses.length];
    const apptDate = status === "completed" || status === "cancelled" ? past(i + 1) : future((i % 5) + 1);
    const slot = slotTemplates[i % slotTemplates.length];
    appts.push({
      patientId: pat,
      doctorId: doc,
      appointmentDate: apptDate,
      timeSlot: slot,
      status,
      amount: fees,
      paymentStatus: status === "completed" ? "paid" : "pending",
      type: ["consultation", "follow-up", "routine-checkup"][i % 3],
      symptoms: i % 3 === 0 ? "Headache and fatigue" : "",
      cancellationReason: status === "cancelled" ? "Schedule conflict" : "",
      cancelledAt: status === "cancelled" ? past(i + 1) : null,
    });
  }
  const createdAppts = await Appointment.insertMany(appts);
  const completedAppts = createdAppts.filter((a) => a.status === "completed");

  // ── Medical Records ───────────────────────────────────────────────────────────
  log("Creating 15 medical records…");
  const diagnoses = ["Hypertension","Type 2 Diabetes","Migraine","Osteoarthritis","Dermatitis","GERD","Vitamin D Deficiency","Anxiety Disorder","Hyperlipidemia","Acute URI"];
  const symptoms = ["Headache","Fatigue","Joint Pain","Rash","Nausea","Dizziness","Chest Pain","Shortness of Breath"];
  const records = [];
  for (let i = 0; i < 15; i++) {
    const pat = patientDocs[i % 10].pat._id;
    const doc = doctorDocs[i % 5].doc._id;
    const apptLink = completedAppts[i % completedAppts.length]?._id || null;
    const w = 60 + (i % 20);
    const h = 160 + (i % 20);
    records.push({
      patientId: pat,
      doctorId: doc,
      appointmentId: apptLink,
      visitDate: past(i + 1),
      chiefComplaint: `Patient visit ${i + 1}: ${symptoms[i % symptoms.length]}`,
      symptoms: [symptoms[i % symptoms.length], symptoms[(i + 1) % symptoms.length]],
      diagnosis: diagnoses[i % diagnoses.length],
      treatmentPlan: "Medication as prescribed; lifestyle modifications advised.",
      clinicalNotes: `Patient examined. ${diagnoses[i % diagnoses.length]} confirmed. Plan discussed.`,
      vitalSigns: {
        bloodPressure: { systolic: 115 + (i % 25), diastolic: 75 + (i % 10) },
        heartRate: 68 + (i % 20),
        temperature: 36.5 + (i % 5) * 0.1,
        respiratoryRate: 14 + (i % 4),
        oxygenSaturation: 97 + (i % 3),
        weight: w, height: h,
        bmi: Number((w / Math.pow(h / 100, 2)).toFixed(1)),
      },
      followUpRequired: i % 4 === 0,
      followUpDate: i % 4 === 0 ? future(14) : null,
      isConfidential: i % 10 === 0,
    });
  }
  const createdRecords = await MedicalRecord.insertMany(records);
  for (let i = 0; i < records.length; i++) {
    if (records[i].appointmentId) {
      await Appointment.updateOne({ _id: records[i].appointmentId }, { $set: { medicalRecordId: createdRecords[i]._id } });
    }
  }

  // ── Prescriptions ─────────────────────────────────────────────────────────────
  log("Creating 12 prescriptions…");
  const medTemplates = [
    { medicationName: "Amoxicillin", genericName: "Amoxicillin", dosage: "500 mg", frequency: "Three times daily", duration: "7 days", route: "oral" },
    { medicationName: "Ibuprofen", genericName: "Ibuprofen", dosage: "400 mg", frequency: "As needed", duration: "5 days", route: "oral" },
    { medicationName: "Lisinopril", genericName: "Lisinopril", dosage: "10 mg", frequency: "Once daily", duration: "90 days", route: "oral" },
    { medicationName: "Metformin", genericName: "Metformin HCl", dosage: "500 mg", frequency: "Twice daily", duration: "90 days", route: "oral" },
    { medicationName: "Salbutamol inhaler", genericName: "Albuterol", dosage: "100 mcg", frequency: "Two puffs as needed", duration: "30 days", route: "inhalation" },
  ];
  const rxPayloads = [];
  for (let i = 0; i < 12; i++) {
    const pat = patientDocs[i % 10].pat._id;
    const doc = doctorDocs[(i + 1) % 5].doc._id;
    const rec = createdRecords[i % createdRecords.length];
    const ap = completedAppts[i % completedAppts.length];
    const pdate = past(i + 1);
    const status = i % 6 === 0 ? "completed" : i % 11 === 0 ? "cancelled" : "active";
    const meds = [{ ...medTemplates[i % medTemplates.length] }];
    if (i % 3 === 0) meds.push({ ...medTemplates[(i + 2) % medTemplates.length] });
    const plain = { patientId: pat, doctorId: doc, medications: meds, diagnosis: diagnoses[i % diagnoses.length], prescriptionDate: pdate };
    const digitalSignature = generateDigitalSignature(plain);
    rxPayloads.push({
      patientId: pat,
      doctorId: doc,
      medicalRecordId: rec._id,
      appointmentId: ap?._id || null,
      prescriptionDate: pdate,
      medications: meds,
      diagnosis: diagnoses[i % diagnoses.length],
      notes: i % 3 === 0 ? "Take with food." : "",
      status,
      validUntil: status === "active" ? calculateValidUntil(pdate, 90) : null,
      digitalSignature,
    });
  }
  const createdRx = await Prescription.insertMany(rxPayloads);
  for (const rx of createdRx) {
    if (rx.appointmentId) {
      await Appointment.updateOne({ _id: rx.appointmentId }, { $set: { prescriptionId: rx._id } });
    }
  }

  // ── Reviews ───────────────────────────────────────────────────────────────────
  log("Creating 10 reviews…");
  const reviewCount = Math.min(10, completedAppts.length);
  for (let i = 0; i < reviewCount; i++) {
    const ap = completedAppts[i];
    await Review.create({
      patientId: ap.patientId,
      doctorId: ap.doctorId,
      appointmentId: ap._id,
      rating: 3 + (i % 3),
      comment: i % 2 === 0 ? "Very professional and thorough." : "Good experience overall, would recommend.",
      isAnonymous: i % 5 === 0,
    });
  }
  for (const { doc } of doctorDocs) {
    await Review.updateDoctorRating(doc._id);
  }

  // ── Notifications ─────────────────────────────────────────────────────────────
  log("Creating sample notifications…");
  await Notification.insertMany([
    {
      userId: patientDocs[0].user._id,
      type: "appointment_reminder",
      title: "Upcoming Appointment",
      message: "You have an appointment tomorrow. Please arrive 10 minutes early.",
      relatedResource: { resourceType: "appointment", resourceId: createdAppts[0]._id },
      priority: "normal",
      deliveryMethod: ["in-app"],
      sentAt: new Date(),
    },
    {
      userId: doctorDocs[0].user._id,
      type: "appointment_confirmed",
      title: "Appointment Confirmed",
      message: "A new appointment has been confirmed for tomorrow.",
      priority: "normal",
      deliveryMethod: ["in-app"],
      sentAt: new Date(),
    },
    {
      userId: patientDocs[1].user._id,
      type: "prescription_ready",
      title: "Prescription Ready",
      message: "Your prescription has been prepared and is ready to download.",
      relatedResource: { resourceType: "prescription", resourceId: createdRx[0]._id },
      priority: "high",
      deliveryMethod: ["in-app"],
      sentAt: new Date(),
    },
    {
      userId: adminUser._id,
      type: "system_announcement",
      title: "Welcome to MediBook",
      message: "The system has been seeded with demo data. All features are active.",
      priority: "low",
      deliveryMethod: ["in-app"],
      sentAt: new Date(),
    },
  ]);

  // ── Audit Logs ────────────────────────────────────────────────────────────────
  log("Creating sample audit logs…");
  await AuditLog.insertMany([
    {
      userId: adminUser._id,
      action: "login",
      category: "auth",
      description: "Admin logged in",
      severity: "info",
      timestamp: past(1),
    },
    {
      userId: adminUser._id,
      action: "user_created",
      category: "data",
      description: "Seed: created doctor and patient accounts",
      severity: "info",
      timestamp: past(1),
    },
  ]);

  log("✅ Seed complete.");
  log(`  Admin: admin@medibook.com / ${plainPassword}`);
  log(`  Doctor: doctor1@medibook.com / ${plainPassword}`);
  log(`  Patient: patient1@medibook.com / ${plainPassword}`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    process.stderr.write(`${err && err.stack ? err.stack : err}\n`);
    process.exit(1);
  });
