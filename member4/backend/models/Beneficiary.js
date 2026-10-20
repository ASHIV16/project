const mongoose = require("mongoose");

const BeneficiarySchema = new mongoose.Schema(
  {
    beneficiaryId: { type: String, required: true, unique: true },
    scheme: { type: String, enum: ["PMAY_G", "MGNREGS"], required: true },
    name: { type: String, required: true },
    village: { type: String, required: true },
    district: { type: String, required: true },
    gramPanchayat: { type: String },
    contactNumber: { type: String },
    jobCardHolderName: { type: String },
    recordVersion: { type: Number, default: 1 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Beneficiary", BeneficiarySchema);
