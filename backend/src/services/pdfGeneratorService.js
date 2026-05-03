const PDFDocument = require("pdfkit");
const { formatPrescriptionForPDF } = require("./prescriptionService");

function bufferPdf(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

async function generatePrescriptionPDF(prescription) {
  const doc = new PDFDocument({ margin: 50 });
  doc.fontSize(16).text("Prescription", { underline: true });
  doc.moveDown();
  doc.fontSize(11).text(formatPrescriptionForPDF(prescription));
  return bufferPdf(doc);
}

async function generateMedicalRecordPDF(record) {
  const doc = new PDFDocument({ margin: 50 });
  doc.fontSize(16).text("Medical record summary", { underline: true });
  doc.moveDown();
  doc
    .fontSize(11)
    .text(
      `Visit: ${record.visitDate}\nChief complaint: ${record.chiefComplaint}\nDiagnosis: ${record.diagnosis}\nNotes: ${record.clinicalNotes || ""}`
    );
  return bufferPdf(doc);
}

async function generateLabReportPDF(labResults) {
  const doc = new PDFDocument({ margin: 50 });
  doc.fontSize(16).text("Lab results", { underline: true });
  doc.moveDown();
  (labResults || []).forEach((row) => {
    doc
      .fontSize(10)
      .text(
        `${row.testName}: ${row.result} (${row.status}) ref ${row.normalRange || ""}`
      );
    doc.moveDown(0.25);
  });
  return bufferPdf(doc);
}

module.exports = {
  generatePrescriptionPDF,
  generateMedicalRecordPDF,
  generateLabReportPDF,
};
