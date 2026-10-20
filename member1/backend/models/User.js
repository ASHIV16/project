const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["beneficiary", "reviewer", "admin"],
      required: true,
    },
    beneficiaryId: { type: String, default: null }, // Linked demo ID for beneficiaries
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
