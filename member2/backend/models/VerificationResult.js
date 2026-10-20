const mongoose = require("mongoose");

// ── 4.5 Collection: verificationresults (Owner: Member 2) ──
const VerificationResultSchema = new mongoose.Schema(
  {
    requestId: { type: String, required: true, unique: true },
    overallStatus: {
      type: String,
      enum: ["PASS", "FLAG", "FAIL"],
      required: true,
    },
    checks: [
      {
        name:    { type: String, required: true }, // e.g. "required_fields", "document_attached"
        status:  { type: String, enum: ["PASS", "FLAG", "FAIL"], required: true },
        message: { type: String, required: true },
      },
    ],
    ocrExtractedText: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("VerificationResult", VerificationResultSchema);
