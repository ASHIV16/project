const express = require("express");
const AuditLog = require("../models/AuditLog");
const CorrectionRequest = require("../models/CorrectionRequest");
const Beneficiary = require("../models/Beneficiary");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");
const { seedDatabase } = require("../seed");

const router = express.Router();

// All routes in this router are restricted to role === 'admin'
router.use(verifyToken, requireRole(["admin"]));

// ─────────────────────────────────────────────────────────────
// GET /api/admin/stats (Aggregated Metrics)
// ─────────────────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const [
      totalRequests,
      statusCounts,
      schemeCounts,
      totalBeneficiaries,
      recentActivity,
    ] = await Promise.all([
      CorrectionRequest.countDocuments(),
      CorrectionRequest.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      CorrectionRequest.aggregate([
        { $group: { _id: "$scheme", count: { $sum: 1 } } },
      ]),
      Beneficiary.countDocuments(),
      AuditLog.find().sort({ createdAt: -1 }).limit(5),
    ]);

    // Map status counts to an easy lookup dictionary
    const byStatus = {
      DRAFT: 0,
      SUBMITTED: 0,
      UNDER_REVIEW: 0,
      NEEDS_INFO: 0,
      APPROVED: 0,
      REJECTED: 0,
    };
    statusCounts.forEach((s) => {
      if (s._id) byStatus[s._id] = s.count;
    });

    // Map scheme counts
    const byScheme = {
      PMAY_G: 0,
      MGNREGS: 0,
    };
    schemeCounts.forEach((s) => {
      if (s._id) byScheme[s._id] = s.count;
    });

    const pendingReview = (byStatus.SUBMITTED || 0) + (byStatus.UNDER_REVIEW || 0);
    const decided = (byStatus.APPROVED || 0) + (byStatus.REJECTED || 0);
    const approvalRate = decided > 0 ? Math.round(((byStatus.APPROVED || 0) / decided) * 100) : 0;

    return res.status(200).json({
      success: true,
      data: {
        totalRequests,
        pendingReview,
        approvalRate,
        totalBeneficiaries,
        byStatus,
        byScheme,
        recentActivity,
      },
      message: "Admin statistics calculated successfully.",
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Failed to compile admin analytics.", details: [] },
    });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/admin/audit-logs (Filterable & Paginated Audit Trail)
// ─────────────────────────────────────────────────────────────
router.get("/audit-logs", async (req, res) => {
  try {
    const { requestId, actorId, action, search, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (requestId) filter.requestId = requestId;
    if (actorId) filter.actorId = actorId;
    if (action) filter.action = action;
    if (search) {
      filter.$or = [
        { requestId: { $regex: search, $options: "i" } },
        { actorId: { $regex: search, $options: "i" } },
        { action: { $regex: search, $options: "i" } },
        { reason: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [total, logs] = await Promise.all([
      AuditLog.countDocuments(filter),
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit, 10)),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / parseInt(limit, 10)) || 1,
        logs,
      },
      message: `Retrieved ${logs.length} audit trail record(s).`,
    });
  } catch (err) {
    console.error("Audit logs fetch error:", err);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Failed to fetch audit records.", details: [] },
    });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/admin/reseed (One-click demo re-seed)
// ─────────────────────────────────────────────────────────────
router.post("/reseed", async (req, res) => {
  try {
    await seedDatabase();
    return res.status(200).json({
      success: true,
      data: { status: "RESEEDED" },
      message: "Database has been freshly reseeded with standard test fixtures.",
    });
  } catch (err) {
    console.error("Reseed error:", err);
    return res.status(500).json({
      success: false,
      error: { code: "RESEED_FAILED", message: "Failed to reseed database.", details: [] },
    });
  }
});

// ─────────────────────────────────────────────────────────────
// IMMUTABILITY ENFORCEMENT: Block any DELETE or PUT/PATCH on audit logs
// ─────────────────────────────────────────────────────────────
router.all(["/audit-logs", "/audit-logs/:id"], (req, res, next) => {
  if (["DELETE", "PUT", "PATCH"].includes(req.method)) {
    return res.status(405).json({
      success: false,
      error: {
        code: "AUDIT_IMMUTABLE",
        message: "Audit logs are strictly append-only and cannot be altered or removed.",
        details: [],
      },
    });
  }
  next();
});

module.exports = router;
