const express = require("express");
const Beneficiary = require("../models/Beneficiary");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

// ─────────────────────────────────────────────
// GET /api/beneficiaries/me  (beneficiary only)
// ─────────────────────────────────────────────
// Beneficiaries must NEVER be allowed to pass an arbitrary ID parameter
// to view someone else's record. We always use req.user.beneficiaryId.
router.get("/me", verifyToken, requireRole(["beneficiary"]), async (req, res) => {
  try {
    const { beneficiaryId } = req.user;

    if (!beneficiaryId) {
      return res.status(403).json({
        success: false,
        error: {
          code: "NO_BENEFICIARY_LINKED",
          message: "This account is not linked to any beneficiary record.",
          details: [],
        },
      });
    }

    const beneficiary = await Beneficiary.findOne({ beneficiaryId });

    if (!beneficiary) {
      return res.status(404).json({
        success: false,
        error: {
          code: "BENEFICIARY_NOT_FOUND",
          message: `No beneficiary record found for ID: ${beneficiaryId}`,
          details: [],
        },
      });
    }

    // Never expose internal _id or __v to the client
    const {
      beneficiaryId: bId,
      scheme,
      name,
      village,
      district,
      gramPanchayat,
      contactNumber,
      jobCardHolderName,
      recordVersion,
      createdAt,
      updatedAt,
    } = beneficiary;

    return res.status(200).json({
      success: true,
      data: {
        beneficiaryId: bId,
        scheme,
        name,
        village,
        district,
        gramPanchayat,
        contactNumber,
        jobCardHolderName,
        recordVersion,
        createdAt,
        updatedAt,
      },
      message: "Beneficiary profile fetched successfully.",
    });
  } catch (err) {
    console.error("Beneficiary/me error:", err);
    return res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Internal server error.",
        details: [],
      },
    });
  }
});

module.exports = router;
