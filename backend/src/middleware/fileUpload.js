const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { validateFileType, MAX_BYTES } = require("../services/fileUploadService");

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = path.join(__dirname, "../../uploads");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname || "");
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  if (!validateFileType(file.originalname)) {
    return cb(new Error("INVALID_TYPE"));
  }
  cb(null, true);
}

const uploadSingle = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_BYTES },
});

function handleUploadError(err, req, res, next) {
  if (!err) return next();
  const { errorResponse } = require("../utils/responseHandler");
  const { HTTP_STATUS_CODES, ERROR_MESSAGES } = require("../config/constants");
  if (err.code === "LIMIT_FILE_SIZE" || err.message === "INVALID_TYPE") {
    return errorResponse(
      res,
      ERROR_MESSAGES.FILE_UPLOAD_INVALID,
      HTTP_STATUS_CODES.BAD_REQUEST
    );
  }
  return next(err);
}

module.exports = {
  uploadAttachment: uploadSingle.single("file"),
  handleUploadError,
};
