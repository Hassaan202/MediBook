require("../config/env");
const { connectDB } = require("../config/database");
const User = require("../models/User");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const Appointment = require("../models/Appointment");
const Notification = require("../models/Notification");
const MedicalRecord = require("../models/MedicalRecord");
const Prescription = require("../models/Prescription");
const Review = require("../models/Review");
const { startOfLocalDay, getTimeSlots } = require("../services/dateTimeService");
const {
  generateDigitalSignature,
  calculateValidUntil,
} = require("../services/prescriptionService");

const SEED_EMAILS = [
  "admin@medibook.com",
  "doctor1@medibook.com",
  "doctor2@medibook.com",
  "doctor3@medibook.com",
  "doctor4@medibook.com",
  "doctor5@medibook.com",
  "doctor6@medibook.com",
  "patient1@medibook.com",
  "patient2@medibook.com",
  "patient3@medibook.com",
  "patient4@medibook.com",
];

const daySlot = { start: "09:00", end: "17:00" };
const workingHours = {
  monday: daySlot,
  tuesday: daySlot,
  wednesday: daySlot,
  thursday: daySlot,
  friday: daySlot,
  saturday: { start: "10:00", end: "14:00" },
  sunday: { start: "10:00", end: "12:00" },
};

const slotTemplates = getTimeSlots("09:00", "17:00", 30);

async function clearSeeds() {
  const existing = await User.find({ email: { $in: SEED_EMAILS } }).select("_id");
  const userIds = existing.map((u) => u._id);
  if (!userIds.length) return;
  const doctors = await Doctor.find({ userId: { $in: userIds } }).select("_id");
  const patients = await Patient.find({ userId: { $in: userIds } }).select("_id");
  const doctorIds = doctors.map((d) => d._id);
  const patientIds = patients.map((p) => p._id);
  await Review.deleteMany({
    $or: [{ patientId: { $in: patientIds } }, { doctorId: { $in: doctorIds } }],
  });
  await MedicalRecord.deleteMany({
    $or: [{ patientId: { $in: patientIds } }, { doctorId: { $in: doctorIds } }],
  });
  await Prescription.deleteMany({
    $or: [{ patientId: { $in: patientIds } }, { doctorId: { $in: doctorIds } }],
  });
  await Appointment.deleteMany({
    $or: [{ doctorId: { $in: doctorIds } }, { patientId: { $in: patientIds } }],
  });
  await Notification.deleteMany({ userId: { $in: userIds } });
  await Doctor.deleteMany({ userId: { $in: userIds } });
  await Patient.deleteMany({ userId: { $in: userIds } });
  await User.deleteMany({ _id: { $in: userIds } });
}

async function seed() {
  await connectDB();
  await clearSeeds();
  const plainPassword = "password";
  await User.create({
    email: "admin@medibook.com",
    password: plainPassword,
    name: "MediBook Admin",
    role: "admin",
  });
  const doctorSpecs = [
    { email: "doctor1@medibook.com", name: "Dr. Alice Carter", specialty: "Cardiology", fees: 200 },
    { email: "doctor2@medibook.com", name: "Dr. Ben Lee", specialty: "Dermatology", fees: 175 },
    { email: "doctor3@medibook.com", name: "Dr. Carla Ruiz", specialty: "Pediatrics", fees: 160 },
    { email: "doctor4@medibook.com", name: "Dr. David Kim", specialty: "Orthopedics", fees: 220 },
    { email: "doctor5@medibook.com", name: "Dr. Eva Novak", specialty: "Neurology", fees: 250 },
    { email: "doctor6@medibook.com", name: "Dr. Frank Okafor", specialty: "General Practice", fees: 120 },
  ];
  const doctorDocs = [];
  for (let i = 0; i < doctorSpecs.length; i += 1) {
    const s = doctorSpecs[i];
    const u = await User.create({
      email: s.email,
      password: plainPassword,
      name: s.name,
      role: "doctor",
    });
    const d = await Doctor.create({
      userId: u._id,
      specialty: s.specialty,
      qualifications: ["MBBS", "MD"],
      experience: 5 + i,
      fees: s.fees,
      rating: 4 + (i % 2) * 0.3,
      totalReviews: 10 + i,
      available: true,
      availableSlots: [...slotTemplates],
      workingHours,
      consultationDuration: 30,
      bio: `${s.specialty} specialist`,
      languages: ["English"],
    });
    doctorDocs.push(d);
  }
  const patientSpecs = [
    {
      email: "patient1@medibook.com",
      name: "Grace Hill",
      phone: "(555) 111-2222",
    },
    {
      email: "patient2@medibook.com",
      name: "Henry Adams",
      phone: "(555) 222-3333",
    },
    {
      email: "patient3@medibook.com",
      name: "Ivy Chen",
      phone: "(555) 333-4444",
    },
    {
      email: "patient4@medibook.com",
      name: "Jack Brown",
      phone: "(555) 444-5555",
    },
  ];
  const patientDocs = [];
  for (let i = 0; i < patientSpecs.length; i += 1) {
    const s = patientSpecs[i];
    const u = await User.create({
      email: s.email,
      password: plainPassword,
      name: s.name,
      role: "patient",
    });
    const p = await Patient.create({
      userId: u._id,
      dateOfBirth: new Date(1990 + i, 3, 12),
      gender: i % 2 === 0 ? "Female" : "Male",
      bloodType: ["A+", "B+", "O+", "AB+"][i % 4],
      phone: s.phone,
      emergencyContact: {
        name: "Emergency Contact",
        relationship: "Family",
        phone: "(555) 999-0000",
      },
    });
    patientDocs.push({ patient: p, user: u });
  }
  const d0 = doctorDocs[0]._id;
  const d1 = doctorDocs[1]._id;
  const d2 = doctorDocs[2]._id;
  const d3 = doctorDocs[3]._id;
  const d4 = doctorDocs[4]._id;
  const d5 = doctorDocs[5]._id;
  const p0 = patientDocs[0].patient._id;
  const p1 = patientDocs[1].patient._id;
  const p2 = patientDocs[2].patient._id;
  const p3 = patientDocs[3].patient._id;
  const day0 = startOfLocalDay(new Date());
  const day1 = new Date(day0.getTime() + 86400000);
  const day2 = new Date(day0.getTime() + 2 * 86400000);
  const dayPast = new Date(day0.getTime() - 3 * 86400000);
  const apptsBase = [
    {
      patientId: p0,
      doctorId: d0,
      appointmentDate: day1,
      timeSlot: "09:00-09:30",
      status: "scheduled",
      amount: 200,
    },
    {
      patientId: p0,
      doctorId: d1,
      appointmentDate: day2,
      timeSlot: "10:00-10:30",
      status: "confirmed",
      amount: 175,
    },
    {
      patientId: p1,
      doctorId: d0,
      appointmentDate: day1,
      timeSlot: "11:00-11:30",
      status: "scheduled",
      amount: 200,
    },
    {
      patientId: p1,
      doctorId: d2,
      appointmentDate: day2,
      timeSlot: "09:00-09:30",
      status: "in-progress",
      amount: 160,
    },
    {
      patientId: p2,
      doctorId: d1,
      appointmentDate: day0,
      timeSlot: "14:00-14:30",
      status: "completed",
      amount: 175,
    },
    {
      patientId: p2,
      doctorId: d0,
      appointmentDate: dayPast,
      timeSlot: "10:00-10:30",
      status: "cancelled",
      amount: 200,
      cancellationReason: "Schedule conflict",
    },
    {
      patientId: p3,
      doctorId: d2,
      appointmentDate: day1,
      timeSlot: "15:00-15:30",
      status: "scheduled",
      amount: 160,
    },
    {
      patientId: p3,
      doctorId: d0,
      appointmentDate: day2,
      timeSlot: "16:00-16:30",
      status: "no-show",
      amount: 200,
    },
    {
      patientId: p0,
      doctorId: d2,
      appointmentDate: dayPast,
      timeSlot: "09:00-09:30",
      status: "completed",
      amount: 160,
    },
    {
      patientId: p1,
      doctorId: d1,
      appointmentDate: day0,
      timeSlot: "09:00-09:30",
      status: "confirmed",
      amount: 175,
    },
    {
      patientId: p2,
      doctorId: d0,
      appointmentDate: day2,
      timeSlot: "12:00-12:30",
      status: "scheduled",
      amount: 200,
    },
    {
      patientId: p3,
      doctorId: d1,
      appointmentDate: day1,
      timeSlot: "13:00-13:30",
      status: "scheduled",
      amount: 175,
    },
  ];
  const extraCompleted = [];
  for (let ei = 0; ei < 20; ei += 1) {
    extraCompleted.push({
      patientId: [p0, p1, p2, p3][ei % 4],
      doctorId: [d0, d1, d2, d3, d4, d5][ei % 6],
      appointmentDate: new Date(dayPast.getTime() - (ei + 1) * 86400000),
      timeSlot: slotTemplates[ei % slotTemplates.length],
      status: "completed",
      amount: 160 + (ei % 5) * 10,
    });
  }
  const createdAppts = await Appointment.insertMany([...apptsBase, ...extraCompleted]);
  const completedAppts = createdAppts.filter((a) => a.status === "completed");
  const diagnosesList = [
    "Hypertension",
    "Type 2 diabetes mellitus",
    "Acute viral upper respiratory infection",
    "Migraine",
    "Osteoarthritis",
    "Atopic dermatitis",
    "Gastroesophageal reflux disease",
    "Vitamin D deficiency",
    "Anxiety disorder",
    "Acute conjunctivitis",
    "Hyperlipidemia",
    "Chronic low back pain",
  ];
  const symptomsPool = [
    "Headache",
    "Fatigue",
    "Cough",
    "Fever",
    "Joint pain",
    "Rash",
    "Nausea",
    "Dizziness",
  ];
  const recordPayloads = [];
  for (let ri = 0; ri < 28; ri += 1) {
    const pt = [p0, p1, p2, p3][ri % 4];
    const doc = [d0, d1, d2, d3, d4, d5][ri % 6];
    const visitDate = new Date(dayPast.getTime() - ri * 43200000);
    const apptLink =
      ri % 3 === 0 && completedAppts.length
        ? completedAppts[ri % completedAppts.length]._id
        : null;
    const weight = 62 + (ri % 25);
    const height = 162 + (ri % 18);
    const row = {
      patientId: pt,
      doctorId: doc,
      appointmentId: apptLink,
      visitDate,
      chiefComplaint: `Follow-up visit ${ri + 1}`,
      symptoms: [symptomsPool[ri % symptomsPool.length]],
      diagnosis: diagnosesList[ri % diagnosesList.length],
      treatmentPlan: "Medication as directed; lifestyle counseling.",
      clinicalNotes: "Patient examined; plan discussed.",
      vitalSigns: {
        bloodPressure: { systolic: 112 + (ri % 28), diastolic: 72 + (ri % 12) },
        heartRate: 70 + (ri % 18),
        temperature: 36.4 + (ri % 4) * 0.1,
        respiratoryRate: 15 + (ri % 4),
        oxygenSaturation: 97 + (ri % 3),
        weight,
        height,
      },
      followUpRequired: ri % 5 === 0,
      followUpDate: ri % 5 === 0 ? day1 : null,
      isConfidential: ri % 11 === 0,
    };
    if (ri % 4 === 0) {
      row.labResults = [
        {
          testName: "HbA1c",
          result: `${(5.2 + (ri % 8) * 0.1).toFixed(1)}%`,
          normalRange: "<5.7%",
          date: visitDate,
          status: "normal",
        },
      ];
    }
    if (ri % 9 === 0) {
      row.attachments = [
        {
          fileName: `scan-${ri}.pdf`,
          fileUrl: "/uploads/seed/placeholder.pdf",
          fileType: "application/pdf",
          uploadedAt: visitDate,
        },
      ];
    }
    recordPayloads.push(row);
  }
  const createdRecords = await MedicalRecord.insertMany(recordPayloads);
  for (let ui = 0; ui < recordPayloads.length; ui += 1) {
    const apptId = recordPayloads[ui].appointmentId;
    if (apptId) {
      await Appointment.updateOne(
        { _id: apptId },
        { $set: { medicalRecordId: createdRecords[ui]._id } }
      );
    }
  }
  const medTemplates = [
    {
      medicationName: "Amoxicillin",
      genericName: "Amoxicillin",
      dosage: "500 mg",
      frequency: "Three times daily",
      duration: "7 days",
      route: "oral",
    },
    {
      medicationName: "Ibuprofen",
      genericName: "Ibuprofen",
      dosage: "400 mg",
      frequency: "As needed",
      duration: "5 days",
      route: "oral",
    },
    {
      medicationName: "Lisinopril",
      genericName: "Lisinopril",
      dosage: "10 mg",
      frequency: "Once daily",
      duration: "90 days",
      route: "oral",
    },
    {
      medicationName: "Metformin",
      genericName: "Metformin HCl",
      dosage: "500 mg",
      frequency: "Twice daily",
      duration: "90 days",
      route: "oral",
    },
    {
      medicationName: "Salbutamol inhaler",
      genericName: "Albuterol",
      dosage: "100 mcg",
      frequency: "Two puffs as needed",
      duration: "30 days",
      route: "inhalation",
    },
  ];
  const rxPayloads = [];
  for (let xi = 0; xi < 18; xi += 1) {
    const pt = [p0, p1, p2, p3][xi % 4];
    const doc = [d0, d1, d2, d3, d4, d5][(xi + 1) % 6];
    const rec = createdRecords[xi % createdRecords.length];
    const ap = completedAppts[xi % completedAppts.length];
    const pdate = new Date(dayPast.getTime() - xi * 86400000);
    const status = xi % 7 === 0 ? "completed" : xi % 13 === 0 ? "cancelled" : "active";
    const medications = [
      { ...medTemplates[xi % medTemplates.length] },
    ];
    if (xi % 3 === 0) {
      medications.push({ ...medTemplates[(xi + 2) % medTemplates.length] });
    }
    const diagnosis = diagnosesList[xi % diagnosesList.length];
    const plain = {
      patientId: pt,
      doctorId: doc,
      medications,
      diagnosis,
      prescriptionDate: pdate,
    };
    const digitalSignature = generateDigitalSignature(plain);
    const validUntil =
      status === "active" ? calculateValidUntil(pdate, 90) : null;
    rxPayloads.push({
      patientId: pt,
      doctorId: doc,
      medicalRecordId: rec._id,
      appointmentId: ap._id,
      prescriptionDate: pdate,
      medications,
      diagnosis,
      notes: xi % 4 === 0 ? "Take with food." : "",
      status,
      validUntil,
      digitalSignature,
    });
  }
  const createdRx = await Prescription.insertMany(rxPayloads);
  for (let pi = 0; pi < createdRx.length; pi += 1) {
    const rx = createdRx[pi];
    if (rx.appointmentId) {
      await Appointment.updateOne(
        { _id: rx.appointmentId },
        { $set: { prescriptionId: rx._id } }
      );
    }
  }
  const reviewCount = Math.min(14, completedAppts.length);
  for (let vi = 0; vi < reviewCount; vi += 1) {
    const ap = completedAppts[vi];
    await Review.create({
      patientId: ap.patientId,
      doctorId: ap.doctorId,
      appointmentId: ap._id,
      rating: 3 + (vi % 3),
      comment: vi % 2 === 0 ? "Professional and thorough." : "Good experience overall.",
      isAnonymous: vi % 6 === 0,
    });
  }
  for (let di = 0; di < doctorDocs.length; di += 1) {
    await Review.updateDoctorRating(doctorDocs[di]._id);
  }
  const doctor1User = await User.findOne({ email: "doctor1@medibook.com" }).select("_id");
  await Notification.create({
    userId: patientDocs[0].user._id,
    type: "appointment_reminder",
    title: "Reminder",
    message: "You have an upcoming visit.",
    relatedResource: {
      resourceType: "appointment",
      resourceId: createdAppts[0]._id,
    },
    priority: "normal",
    deliveryMethod: ["in-app"],
    sentAt: new Date(),
  });
  await Notification.create({
    userId: doctor1User._id,
    type: "system_announcement",
    title: "Welcome",
    message: "Welcome to MediBook.",
    priority: "low",
    deliveryMethod: ["in-app"],
    sentAt: new Date(),
  });
}

seed()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    process.stderr.write(`${err && err.stack ? err.stack : err}\n`);
    process.exit(1);
  });
