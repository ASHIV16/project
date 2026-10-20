const express = require("express");
const CorrectionRequest = require("../models/CorrectionRequest");
const Beneficiary = require("../models/Beneficiary");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");
const {
  RequestStatus,
  ALLOWED_FIELDS,
  isValidTransition,
} = require("../services/workflowGuard");

const router = express.Router();
const MEMBER2_API_URL = process.env.MEMBER2_API_URL || "http://localhost:5001/api";

// ─────────────────────────────────────────────────────────────
// POST /api/requests (Create Draft)
// ─────────────────────────────────────────────────────────────
router.post("/", verifyToken, requireRole(["beneficiary"]), async (req, res) => {
  try {
    const { scheme, field, proposedValue, reason } = req.body;
    const { beneficiaryId } = req.user;

    if (!beneficiaryId) {
      return res.status(403).json({
        success: false,
        error: { code: "NO_BENEFICIARY_ID", message: "User is not linked to a beneficiary profile.", details: [] },
      });
    }

    if (!scheme || !field || !proposedValue || !reason) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "scheme, field, proposedValue, and reason are required.",
          details: [],
        },
      });
    }

    // Check allowed fields for scheme
    const allowed = ALLOWED_FIELDS[scheme] || [];
    if (!allowed.includes(field)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_FIELD",
          message: `Field '${field}' cannot be corrected under scheme ${scheme}. Allowed: ${allowed.join(", ")}`,
          details: [],
        },
      });
    }

    // Fetch current value from beneficiary record
    const beneficiary = await Beneficiary.findOne({ beneficiaryId });
    if (!beneficiary) {
      return res.status(404).json({
        success: false,
        error: { code: "BENEFICIARY_NOT_FOUND", message: "Beneficiary record does not exist.", details: [] },
      });
    }

    const oldValue = beneficiary[field] !== undefined ? String(beneficiary[field]) : "";

    // Generate custom ID e.g. CR-123456
    const customId = `CR-${Date.now().toString().slice(-6)}`;

    const newRequest = await CorrectionRequest.create({
      requestId: customId,
      beneficiaryId,
      scheme,
      field,
      oldValue,
      proposedValue: String(proposedValue),
      reason,
      status: RequestStatus.DRAFT,
    });

    return res.status(201).json({
      success: true,
      data: newRequest,
      message: "Draft correction request created successfully.",
    });
  } catch (err) {
    console.error("Create request error:", err);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error.", details: [] },
    });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/requests/mine (Beneficiary lists their own requests)
// ─────────────────────────────────────────────────────────────
router.get("/mine", verifyToken, requireRole(["beneficiary"]), async (req, res) => {
  try {
    const { beneficiaryId } = req.user;
    const requests = await CorrectionRequest.find({ beneficiaryId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: requests,
      message: `Fetched ${requests.length} request(s).`,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error.", details: [] },
    });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/requests/:id (Fetch specific request details)
// ─────────────────────────────────────────────────────────────
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const request = await CorrectionRequest.findOne({ requestId: req.params.id });

    if (!request) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: `Request ${req.params.id} not found.`, details: [] },
      });
    }

    // Authorization: Beneficiary can only view their OWN request
    if (req.user.role === "beneficiary" && request.beneficiaryId !== req.user.beneficiaryId) {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "You are not authorized to view another beneficiary's request.", details: [] },
      });
    }

    return res.status(200).json({
      success: true,
      data: request,
      message: "Request details fetched.",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error.", details: [] },
    });
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/requests/:id (Update Draft or Needs Info request)
// ─────────────────────────────────────────────────────────────
router.patch("/:id", verifyToken, requireRole(["beneficiary"]), async (req, res) => {
  try {
    const request = await CorrectionRequest.findOne({ requestId: req.params.id });
    if (!request) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Request not found.", details: [] },
      });
    }

    if (request.beneficiaryId !== req.user.beneficiaryId) {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "You cannot edit another beneficiary's request.", details: [] },
      });
    }

    if (![RequestStatus.DRAFT, RequestStatus.NEEDS_INFO].includes(request.status)) {
      return res.status(400).json({
        success: false,
        error: { code: "CANNOT_EDIT", message: `Cannot edit request in '${request.status}' status.`, details: [] },
      });
    }

    const { proposedValue, reason } = req.body;
    if (proposedValue !== undefined) request.proposedValue = String(proposedValue);
    if (reason !== undefined) request.reason = reason;

    await request.save();

    return res.status(200).json({
      success: true,
      data: request,
      message: "Request updated successfully.",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error.", details: [] },
    });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/requests/:id/submit (Final Submission)
// ─────────────────────────────────────────────────────────────
router.post("/:id/submit", verifyToken, requireRole(["beneficiary"]), async (req, res) => {
  try {
    const request = await CorrectionRequest.findOne({ requestId: req.params.id });
    if (!request) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Request not found.", details: [] },
      });
    }

    if (request.beneficiaryId !== req.user.beneficiaryId) {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Cannot submit another user's request.", details: [] },
      });
    }

    // Verify valid transition to SUBMITTED
    if (!isValidTransition(request.status, RequestStatus.SUBMITTED)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_TRANSITION",
          message: `Cannot transition request from '${request.status}' to '${RequestStatus.SUBMITTED}'.`,
          details: [],
        },
      });
    }

    // Check duplicate active requests for the same field
    const duplicate = await CorrectionRequest.findOne({
      beneficiaryId: request.beneficiaryId,
      field: request.field,
      status: { $in: [RequestStatus.SUBMITTED, RequestStatus.UNDER_REVIEW] },
      requestId: { $ne: request.requestId },
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        error: {
          code: "DUPLICATE_ACTIVE_REQUEST",
          message: `An active request (${duplicate.requestId}) for field '${request.field}' is already pending review.`,
          details: [],
        },
      });
    }

    // Update status to SUBMITTED
    request.status = RequestStatus.SUBMITTED;
    await request.save();

    // Trigger Member 2's verification engine asynchronously / best effort
    try {
      await fetch(`${MEMBER2_API_URL}/requests/${request.requestId}/verification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: req.headers["authorization"],
        },
        body: JSON.stringify({ requestDoc: request.toObject() }),
      });
    } catch (verErr) {
      console.warn("Notice: Member 2 verification trigger skipped or offline:", verErr.message);
    }

    return res.status(200).json({
      success: true,
      data: request,
      message: "Correction request submitted successfully and queued for review.",
    });
  } catch (err) {
    console.error("Submit error:", err);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error.", details: [] },
    });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/requests/:id/decision (Reviewer Decision)
// ─────────────────────────────────────────────────────────────
router.post("/:id/decision", verifyToken, requireRole(["reviewer", "admin"]), async (req, res) => {
  try {
    const { action, reason } = req.body;
    const request = await CorrectionRequest.findOne({ requestId: req.params.id });

    if (!request) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Request not found.", details: [] },
      });
    }

    // Map action to target status
    let targetStatus;
    if (action === "APPROVE") targetStatus = RequestStatus.APPROVED;
    else if (action === "REJECT") targetStatus = RequestStatus.REJECTED;
    else if (action === "REQUEST_INFO") targetStatus = RequestStatus.NEEDS_INFO;
    else {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_ACTION",
          message: "Action must be one of: APPROVE, REJECT, REQUEST_INFO.",
          details: [],
        },
      });
    }

    // Checklist check: Transitioning from DRAFT directly to APPROVED returns 400 Bad Request
    if (request.status === RequestStatus.DRAFT && targetStatus === RequestStatus.APPROVED) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_TRANSITION",
          message: "Cannot move request directly from DRAFT to APPROVED",
          details: [],
        },
      });
    }

    // State machine guard
    if (!isValidTransition(request.status, targetStatus)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_TRANSITION",
          message: `Cannot transition request from '${request.status}' to '${targetStatus}'.`,
          details: [],
        },
      });
    }

    // Checklist check: Rejecting (or Requesting Info) without a reason returns 422 Unprocessable Entity
    if ((action === "REJECT" || action === "REQUEST_INFO") && (!reason || !reason.trim())) {
      return res.status(422).json({
        success: false,
        error: {
          code: "REASON_REQUIRED",
          message: "A decision reason is mandatory when rejecting or requesting information.",
          details: [],
        },
      });
    }

    // If APPROVE: Atomically update beneficiary record
    if (action === "APPROVE") {
      const updateResult = await Beneficiary.updateOne(
        { beneficiaryId: request.beneficiaryId },
        {
          [request.field]: request.proposedValue,
          $inc: { recordVersion: 1 },
        }
      );

      if (updateResult.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: "BENEFICIARY_RECORD_MISSING",
            message: "Target beneficiary record not found for atomic update.",
            details: [],
          },
        });
      }
    }

    // Update request state
    request.status = targetStatus;
    request.decisionReason = reason || (action === "APPROVE" ? "Approved by reviewer." : null);
    request.assignedReviewer = req.user._id;
    await request.save();

    return res.status(200).json({
      success: true,
      data: request,
      message: `Request ${action === "APPROVE" ? "approved and record updated" : action === "REJECT" ? "rejected" : "returned for info"}.`,
    });
  } catch (err) {
    console.error("Decision error:", err);
    return res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: "Internal server error.", details: [] },
    });
  }
});

module.exports = router;
