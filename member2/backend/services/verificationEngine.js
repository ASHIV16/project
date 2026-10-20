/**
 * verificationEngine.js — Member 2's core service.
 *
 * Exports:
 *  - evaluateRequest({ request, documents }) → checks[]  (pure, synchronous rules)
 *  - runVerification(requestId)              → saves & returns VerificationResult doc
 *
 * Member 3 calls runVerification(requestId) after a request is submitted.
 */

const Document           = require("../models/Document");
const VerificationResult = require("../models/VerificationResult");

// ── ALLOWED_FIELDS from interface contracts ───────
const ALLOWED_FIELDS = {
  PMAY_G:  ["name", "village", "district", "contactNumber"],
  MGNREGS: ["jobCardHolderName", "village", "gramPanchayat", "contactNumber"],
};

// ── Phone number format regex ─────────────────────
const PHONE_REGEX = /^[6-9]\d{9}$/;

/**
 * evaluateRequest — pure function, no DB calls.
 * @param {Object} request   - CorrectionRequest document
 * @param {Array}  documents - Array of Document documents for the request
 * @returns {Array} checks   - Array of { name, status, message }
 */
const evaluateRequest = ({ request, documents }) => {
  const checks = [];

  // ── Rule 1: required_fields ───────────────────
  const hasProposed = request.proposedValue && request.proposedValue.trim().length > 0;
  const hasReason   = request.reason && request.reason.trim().length > 0;
  checks.push({
    name:    "required_fields",
    status:  hasProposed && hasReason ? "PASS" : "FAIL",
    message: hasProposed && hasReason
      ? "All required fields are present."
      : `Missing: ${!hasProposed ? "proposedValue " : ""}${!hasReason ? "reason" : ""}`.trim(),
  });

  // ── Rule 2: field_whitelist ───────────────────
  const allowedFields = ALLOWED_FIELDS[request.scheme] || [];
  const fieldAllowed  = allowedFields.includes(request.field);
  checks.push({
    name:    "field_whitelist",
    status:  fieldAllowed ? "PASS" : "FAIL",
    message: fieldAllowed
      ? `Field '${request.field}' is editable under ${request.scheme}.`
      : `Field '${request.field}' is NOT allowed for scheme ${request.scheme}. Allowed: ${allowedFields.join(", ")}.`,
  });

  // ── Rule 3: value_delta & value_comparison ────────────────
  const isDifferent = request.proposedValue !== request.oldValue;
  checks.push({
    name:    "value_delta",
    status:  isDifferent ? "PASS" : "FAIL",
    message: isDifferent
      ? "Proposed value differs from the current record."
      : "Proposed value is identical to the current value — no change detected.",
  });

  checks.push({
    name:    "value_comparison",
    status:  isDifferent ? "FLAG" : "PASS",
    message: isDifferent
      ? "Proposed value differs from database record — flagged for reviewer inspection."
      : "Proposed value matches current record.",
  });

  // ── Rule 4: format_validation ─────────────────
  let formatStatus  = "PASS";
  let formatMessage = "Value format is acceptable.";
  if (request.field === "contactNumber") {
    if (!PHONE_REGEX.test(request.proposedValue)) {
      formatStatus  = "FLAG";
      formatMessage = "Contact number should be a valid 10-digit Indian mobile number starting with 6-9.";
    }
  } else if (request.proposedValue && request.proposedValue.trim().length < 2) {
    formatStatus  = "FLAG";
    formatMessage = "Proposed value appears too short.";
  }
  checks.push({ name: "format_validation", status: formatStatus, message: formatMessage });

  // ── Rule 5: document_presence ─────────────────
  const docCount = documents.length;
  checks.push({
    name:    "document_presence",
    status:  docCount > 0 ? "PASS" : "FAIL",
    message: docCount > 0
      ? `Supporting document found (${docCount} file${docCount > 1 ? "s" : ""}).`
      : "No supporting document attached. Please upload proof.",
  });

  return checks;
};

/**
 * deriveOverallStatus — FAIL > FLAG > PASS
 */
const deriveOverallStatus = (checks) => {
  if (checks.some((c) => c.status === "FAIL")) return "FAIL";
  if (checks.some((c) => c.status === "FLAG")) return "FLAG";
  return "PASS";
};

/**
 * runVerification — queries DB, runs rules, saves & returns VerificationResult.
 * Called by Member 3 upon request submission.
 *
 * @param {Object} requestDoc - Full CorrectionRequest mongoose document
 * @returns {Object} VerificationResult document
 */
const runVerification = async (requestDoc) => {
  // Fetch documents for this request
  const documents = await Document.find({ requestId: requestDoc.requestId });

  // Run pure rules engine
  const checks        = evaluateRequest({ request: requestDoc, documents });
  const overallStatus = deriveOverallStatus(checks);

  // Upsert result (re-run overwrites previous result)
  const result = await VerificationResult.findOneAndUpdate(
    { requestId: requestDoc.requestId },
    { requestId: requestDoc.requestId, overallStatus, checks, ocrExtractedText: null },
    { upsert: true, new: true }
  );

  return result;
};

module.exports = { evaluateRequest, runVerification, deriveOverallStatus };
