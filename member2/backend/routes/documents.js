const express = require("express");
const path    = require("path");
const fs      = require("fs");
const Document = require("../models/Document");
const { upload, handleUploadError, UPLOADS_DIR } = require("../middleware/upload");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");

const router = express.Router({ mergeParams: true }); // allows access to :id from parent router

// ─────────────────────────────────────────────────
// POST /api/requests/:id/documents
// Upload one or more documents for a correction request.
// Accessible by: beneficiary (owner) — in production would also check ownership
// ─────────────────────────────────────────────────
router.post(
  "/",
  verifyToken,
  requireRole(["beneficiary", "reviewer", "admin"]),
  (req, res, next) => upload.single("file")(req, res, (err) => handleUploadError(err, req, res, next)),
  async (req, res) => {
    try {
      const { id: requestId } = req.params;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: { code: "NO_FILE", message: "No file was uploaded. Send a 'file' field in the form-data.", details: [] },
        });
      }

      const doc = await Document.create({
        requestId,
        originalName: req.file.originalname,
        storageKey:   req.file.filename, // UUID filename on disk
        mimeType:     req.file.mimetype,
        size:         req.file.size,
        verificationStatus: "PENDING",
      });

      return res.status(201).json({
        success: true,
        data: {
          documentId:   doc._id.toString(),
          originalName: doc.originalName,
          mimeType:     doc.mimeType,
          size:         doc.size,
        },
        message: "Document uploaded successfully.",
      });
    } catch (err) {
      console.error("Document upload error:", err);
      return res.status(500).json({
        success: false,
        error: { code: "SERVER_ERROR", message: "Internal server error.", details: [] },
      });
    }
  }
);

// ─────────────────────────────────────────────────
// GET /api/requests/:id/documents
// List all documents for a request
// ─────────────────────────────────────────────────
router.get(
  "/",
  verifyToken,
  requireRole(["beneficiary", "reviewer", "admin"]),
  async (req, res) => {
    try {
      const docs = await Document.find({ requestId: req.params.id }).select("-storageKey");
      return res.status(200).json({
        success: true,
        data: docs,
        message: `Found ${docs.length} document(s).`,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: { code: "SERVER_ERROR", message: "Internal server error.", details: [] },
      });
    }
  }
);

// ─────────────────────────────────────────────────
// GET /api/requests/:id/documents/:docId/download
// Securely stream file to authorized users only.
// The uploads directory is NOT served as static — only through this endpoint.
// ─────────────────────────────────────────────────
router.get(
  "/:docId/download",
  verifyToken,
  requireRole(["beneficiary", "reviewer", "admin"]),
  async (req, res) => {
    try {
      const { id: requestId, docId } = req.params;

      const doc = await Document.findOne({ _id: docId, requestId });
      if (!doc) {
        return res.status(404).json({
          success: false,
          error: { code: "DOCUMENT_NOT_FOUND", message: "Document not found for this request.", details: [] },
        });
      }

      // Beneficiaries can only download their own docs — check via requestId prefix
      // Full ownership check would query CorrectionRequest, handled at integration
      if (req.user.role === "beneficiary" && !requestId.startsWith("CR-DEMO")) {
        // Allow in demo; production would verify req.user.beneficiaryId owns requestId
      }

      const filePath = path.resolve(UPLOADS_DIR, doc.storageKey);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          error: { code: "FILE_NOT_FOUND", message: "File no longer exists on server.", details: [] },
        });
      }

      // Set content-disposition so browser downloads with original name
      res.setHeader("Content-Disposition", `attachment; filename="${doc.originalName}"`);
      res.setHeader("Content-Type", doc.mimeType);
      fs.createReadStream(filePath).pipe(res);
    } catch (err) {
      console.error("Download error:", err);
      return res.status(500).json({
        success: false,
        error: { code: "SERVER_ERROR", message: "Internal server error.", details: [] },
      });
    }
  }
);

module.exports = router;
