const mongoose = require("mongoose");

// ── 4.4 Collection: documents (Owner: Member 2) ──
const DocumentSchema = new mongoose.Schema(
  {
    requestId:    { type: String, required: true, index: true },
    originalName: { type: String, required: true },
    storageKey:   { type: String, required: true }, // Local path or UUID
    mimeType:     { type: String, required: true },
    size:         { type: Number, required: true },
    verificationStatus: {
      type: String,
      enum: ["PENDING", "VERIFIED", "FLAGGED"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Document", DocumentSchema);
