const AuditLog = require("../models/AuditLog");

/**
 * logEvent — creates an immutable audit trail entry
 * Used across the system whenever key lifecycle actions take place
 * (e.g. SUBMIT_REQUEST, DECISION_APPROVED, DECISION_REJECTED, etc.)
 */
async function logEvent({ requestId, actorId, actorRole, action, reason, meta }) {
  try {
    const entry = await AuditLog.create({
      requestId,
      actorId: String(actorId),
      actorRole: String(actorRole),
      action: String(action),
      reason: reason || null,
      meta: meta || {},
    });
    return entry;
  } catch (err) {
    console.error("Audit logging error:", err.message);
    // Don't crash parent flow if audit log fails, but return null
    return null;
  }
}

module.exports = { logEvent };
