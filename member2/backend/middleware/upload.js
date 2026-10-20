const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

// Ensure uploads directory exists
const UPLOADS_DIR = process.env.UPLOADS_DIR || "uploads/private";
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ── Allowed MIME types & extensions ──────────────
const ALLOWED_MIMES = ["image/jpeg", "image/png", "application/pdf"];
const ALLOWED_EXTS  = [".jpg", ".jpeg", ".png", ".pdf"];

// ── Disk storage with UUID renaming ──────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

// ── MIME + extension filter ───────────────────────
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_MIMES.includes(file.mimetype) || !ALLOWED_EXTS.includes(ext)) {
    return cb(
      Object.assign(new Error("Only PDF, JPEG, and PNG files are allowed."), {
        code: "INVALID_FILE_TYPE",
        status: 400,
      }),
      false
    );
  }
  cb(null, true);
};

// ── Multer instance: max 5MB per file ────────────
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

/**
 * handleUploadError — converts Multer-specific errors into the global
 * API error envelope before sending to the client.
 */
const handleUploadError = (err, req, res, next) => {
  if (err) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        success: false,
        error: {
          code: "FILE_TOO_LARGE",
          message: "File exceeds the 5MB size limit.",
          details: [],
        },
      });
    }
    if (err.code === "INVALID_FILE_TYPE") {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_FILE_TYPE",
          message: err.message,
          details: [],
        },
      });
    }
    return res.status(400).json({
      success: false,
      error: { code: "UPLOAD_ERROR", message: err.message, details: [] },
    });
  }
  next();
};

module.exports = { upload, handleUploadError, UPLOADS_DIR };
