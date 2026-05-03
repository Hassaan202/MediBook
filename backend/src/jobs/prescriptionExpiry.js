const Prescription = require("../models/Prescription");
const Patient = require("../models/Patient");
const { createNotification } = require("../services/notificationService");

async function runPrescriptionExpiry() {
  const now = new Date();
  const list = await Prescription.find({
    deletedAt: null,
    status: "active",
    validUntil: { $ne: null, $lt: now },
  })
    .select("patientId _id")
    .limit(200)
    .lean();
  for (let i = 0; i < list.length; i += 1) {
    const rx = list[i];
    await Prescription.updateOne(
      { _id: rx._id, status: "active" },
      { $set: { status: "completed" } }
    );
    const p = await Patient.findById(rx.patientId).select("userId").lean();
    if (!p) continue;
    await createNotification({
      userId: p.userId,
      type: "system_announcement",
      title: "Prescription update",
      message: "A prescription has reached its end date.",
      priority: "normal",
      relatedResource: {
        resourceType: "prescription",
        resourceId: rx._id,
      },
    });
  }
  return list.length;
}

module.exports = { runPrescriptionExpiry };
