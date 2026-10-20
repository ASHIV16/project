require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const Beneficiary = require("./models/Beneficiary");
const CorrectionRequest = require("./models/CorrectionRequest");
const AuditLog = require("./models/AuditLog");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/gramin_seva";

const seedDatabase = async () => {
  const isDirect = mongoose.connection.readyState === 0;
  if (isDirect) {
    await mongoose.connect(MONGO_URI);
  }

  console.log("🧹 Clearing previous test and demo collections...");
  await User.deleteMany({});
  await Beneficiary.deleteMany({});
  await CorrectionRequest.deleteMany({});
  await AuditLog.deleteMany({});

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash("password123", salt);

  console.log("👤 Seeding 3 demo accounts...");
  const users = await User.insertMany([
    {
      name: "Ramesh Kumar",
      email: "beneficiary@example.test",
      passwordHash,
      role: "beneficiary",
      beneficiaryId: "DEMO-1001",
      isActive: true,
    },
    {
      name: "Suresh Verma",
      email: "reviewer@example.test",
      passwordHash,
      role: "reviewer",
      beneficiaryId: null,
      isActive: true,
    },
    {
      name: "System Administrator",
      email: "admin@example.test",
      passwordHash,
      role: "admin",
      beneficiaryId: null,
      isActive: true,
    },
  ]);

  console.log("🏡 Seeding 2 beneficiary profiles...");
  const beneficiaries = await Beneficiary.insertMany([
    {
      beneficiaryId: "DEMO-1001",
      scheme: "PMAY_G",
      name: "Ramesh Kumar",
      village: "Demo Village",
      district: "Demo District",
      gramPanchayat: "Demo GP",
      contactNumber: "9876543210",
      jobCardHolderName: null,
      recordVersion: 1,
    },
    {
      beneficiaryId: "DEMO-1002",
      scheme: "MGNREGS",
      name: "Sunita Devi",
      village: "Kisan Nagar",
      district: "Varanasi",
      gramPanchayat: "Demo Panchayat",
      contactNumber: "9123456789",
      jobCardHolderName: "Sunita Devi",
      recordVersion: 1,
    },
  ]);

  console.log("📋 Seeding 3 sample requests (SUBMITTED, APPROVED, NEEDS_INFO)...");
  const requests = await CorrectionRequest.insertMany([
    {
      requestId: "CR-DEMO-0001",
      beneficiaryId: "DEMO-1001",
      scheme: "PMAY_G",
      field: "name",
      oldValue: "Ramesh Kumar",
      proposedValue: "Ramesh Kumar Verma",
      reason: "Spelling mismatch on scheme record vs Aadhaar card",
      status: "SUBMITTED",
      assignedReviewer: null,
      decisionReason: null,
    },
    {
      requestId: "CR-DEMO-0002",
      beneficiaryId: "DEMO-1001",
      scheme: "PMAY_G",
      field: "contactNumber",
      oldValue: "9876543210",
      proposedValue: "9876543299",
      reason: "Phone number updated after SIM replacement",
      status: "APPROVED",
      assignedReviewer: users[1]._id,
      decisionReason: "Verified with mobile OTP and Aadhaar linked statement.",
    },
    {
      requestId: "CR-DEMO-0003",
      beneficiaryId: "DEMO-1002",
      scheme: "MGNREGS",
      field: "village",
      oldValue: "Kisan Nagar",
      proposedValue: "Sundar Nagar",
      reason: "Panchayat reorganization relocation",
      status: "NEEDS_INFO",
      assignedReviewer: users[1]._id,
      decisionReason: "Please upload certificate of village demarcation from Block Development Officer.",
    },
  ]);

  console.log("📜 Seeding audit logs...");
  await AuditLog.insertMany([
    {
      requestId: "CR-DEMO-0001",
      actorId: "beneficiary@example.test",
      actorRole: "beneficiary",
      action: "SUBMIT_REQUEST",
      reason: "Initial submission for name correction",
      meta: { scheme: "PMAY_G", field: "name" },
    },
    {
      requestId: "CR-DEMO-0002",
      actorId: "beneficiary@example.test",
      actorRole: "beneficiary",
      action: "SUBMIT_REQUEST",
      reason: "Initial submission for phone update",
      meta: { scheme: "PMAY_G", field: "contactNumber" },
    },
    {
      requestId: "CR-DEMO-0002",
      actorId: "reviewer@example.test",
      actorRole: "reviewer",
      action: "REQUEST_APPROVED",
      reason: "Verified with mobile OTP and Aadhaar linked statement.",
      meta: { previousStatus: "SUBMITTED", newStatus: "APPROVED" },
    },
    {
      requestId: "CR-DEMO-0003",
      actorId: "beneficiary2@example.test",
      actorRole: "beneficiary",
      action: "SUBMIT_REQUEST",
      reason: "Initial submission for village update",
      meta: { scheme: "MGNREGS", field: "village" },
    },
    {
      requestId: "CR-DEMO-0003",
      actorId: "reviewer@example.test",
      actorRole: "reviewer",
      action: "REQUEST_INFO",
      reason: "Please upload certificate of village demarcation from Block Development Officer.",
      meta: { previousStatus: "SUBMITTED", newStatus: "NEEDS_INFO" },
    },
  ]);

  console.log("✅ Seed completed successfully!");
  console.log("   - Users: 3");
  console.log("   - Beneficiaries: 2");
  console.log("   - Requests: 3");
  console.log("   - Audit Logs: 5");

  if (isDirect) {
    await mongoose.disconnect();
    process.exit(0);
  }
};

if (require.main === module) {
  seedDatabase().catch((err) => {
    console.error("❌ Seed error:", err);
    process.exit(1);
  });
}

module.exports = { seedDatabase };
