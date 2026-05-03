const path = require("path");
const fs = require("fs/promises");

const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "pdf", "doc", "docx"]);
const MAX_BYTES = 5 * 1024 * 1024;

function validateFileType(originalname) {
  const ext = path.extname(originalname || "").toLowerCase().slice(1);
  return ALLOWED_EXT.has(ext);
}

function validateFileSize(size) {
  return typeof size === "number" && size > 0 && size <= MAX_BYTES;
}

function generateFileUrl(filename) {
  return `/uploads/${filename}`;
}

async function uploadFile(file, directory) {
  const dir = directory || path.join(__dirname, "../../uploads");
  await fs.mkdir(dir, { recursive: true });
  const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${path.extname(file.originalname || "")}`;
  const dest = path.join(dir, safe);
  if (file.path) {
    await fs.rename(file.path, dest).catch(async () => {
      const buf = await fs.readFile(file.path);
      await fs.writeFile(dest, buf);
    });
  } else if (file.buffer) {
    await fs.writeFile(dest, file.buffer);
  } else {
    throw new Error("Invalid file");
  }
  return { fileName: safe, fileUrl: generateFileUrl(safe), absolutePath: dest };
}

async function deleteFile(fileUrl) {
  if (!fileUrl || typeof fileUrl !== "string") return;
  const base = "/uploads/";
  if (!fileUrl.startsWith(base)) return;
  const name = fileUrl.slice(base.length);
  const dest = path.join(__dirname, "../../uploads", path.basename(name));
  await fs.unlink(dest).catch(() => {});
}

module.exports = {
  uploadFile,
  deleteFile,
  generateFileUrl,
  validateFileType,
  validateFileSize,
  MAX_BYTES,
};
