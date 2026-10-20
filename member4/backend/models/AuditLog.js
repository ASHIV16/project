const mongoose = require("mongoose");

// ── 4.6 Collection: auditlogs (Owner: Member 4) ──
const AuditLogSchema = new mongoose.Schema(
  {
    requestId: { type: String, required: true, index: true },
    actorId:   { type: String, required: true }, // ObjectId or user email
    actorRole: { type: String, required: true },
    action:    { type: String, required: true }, // e.g., "SUBMIT_REQUEST", "REQUEST_APPROVED"
    reason:    { type: String },
    meta:      { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AuditLog", AuditLogSchema);
