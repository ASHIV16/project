const express = require("express");
const CorrectionRequest = require("../models/CorrectionRequest");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// GET /api/reviewer/requests
// Reviewer views all pending requests (supports query filters: ?status=SUBMITTED&scheme=PMAY_G)
// ─────────────────────────────────────────────────────────────
router.get("/requests", verifyToken, requireRole(["reviewer", "admin"]), async (req, res) => {
  try {
    const { status, scheme, search } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    }
    if (scheme) {
      filter.scheme = scheme;
    }
    if (search) {
      filter.$or = [
        { requestId: { $regex: search, $options: "i" } },
        { beneficiaryId: { $regex: search, $options: "i" } },
        { field: { $regex: search, $options: "i" } },
      ];
    }

    const requests = await CorrectionRequest.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: requests,
      message: `Found ${requests.length} request(s) matching criteria.`,
    });
  } catch (err) {
    console.error("Reviewer list error:", err);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error.", details: [] },
    });
  }
});

module.exports = router;
