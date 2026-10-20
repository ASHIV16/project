const mongoose = require("mongoose");

const CorrectionRequestSchema = new mongoose.Schema(
  {
    requestId: { type: String, required: true, unique: true },
    beneficiaryId: { type: String, required: true, index: true },
    scheme: { type: String, enum: ["PMAY_G", "MGNREGS"], required: true },
    field: { type: String, required: true },
    oldValue: { type: String, required: true },
    proposedValue: { type: String, required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "NEEDS_INFO", "APPROVED", "REJECTED"],
      default: "DRAFT",
      index: true,
    },
    assignedReviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    decisionReason: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CorrectionRequest", CorrectionRequestSchema);
