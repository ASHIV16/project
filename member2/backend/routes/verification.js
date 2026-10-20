const express = require("express");
const VerificationResult   = require("../models/VerificationResult");
const { runVerification }  = require("../services/verificationEngine");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");

const router = express.Router({ mergeParams: true });

// ─────────────────────────────────────────────────
// GET /api/requests/:id/verification
// Returns the stored verification result for display in reviewer UI.
// ─────────────────────────────────────────────────
router.get(
  "/",
  verifyToken,
  requireRole(["beneficiary", "reviewer", "admin"]),
  async (req, res) => {
    try {
      const result = await VerificationResult.findOne({ requestId: req.params.id });

      if (!result) {
        return res.status(404).json({
          success: false,
          error: {
            code: "VERIFICATION_NOT_FOUND",
            message: "No verification result found for this request. Has it been submitted?",
            details: [],
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          requestId:       result.requestId,
          overallStatus:   result.overallStatus,
          checks:          result.checks,
          ocrExtractedText: result.ocrExtractedText,
        },
        message: "Verification result fetched.",
      });
    } catch (err) {
      console.error("Verification GET error:", err);
      return res.status(500).json({
        success: false,
        error: { code: "SERVER_ERROR", message: "Internal server error.", details: [] },
      });
    }
  }
);

// ─────────────────────────────────────────────────
// POST /api/requests/:id/verify
// Trigger verification manually (or called internally by Member 3 on submit).
// Accepts the request payload in the body for standalone testing.
// ─────────────────────────────────────────────────
router.post(
  "/",
  verifyToken,
  requireRole(["beneficiary", "reviewer", "admin"]),
  async (req, res) => {
    try {
      // In integration, Member 3 passes the full request object.
      // For standalone mode, accept it from the request body.
      const requestDoc = req.body.requestDoc;

      if (!requestDoc || !requestDoc.requestId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "requestDoc with requestId is required in the request body.",
            details: [],
          },
        });
      }

      const result = await runVerification(requestDoc);

      return res.status(200).json({
        success: true,
        data: {
          requestId:     result.requestId,
          overallStatus: result.overallStatus,
          checks:        result.checks,
        },
        message: "Verification completed.",
      });
    } catch (err) {
      console.error("Verification POST error:", err);
      return res.status(500).json({
        success: false,
        error: { code: "SERVER_ERROR", message: "Internal server error.", details: [] },
      });
    }
  }
);

module.exports = router;
