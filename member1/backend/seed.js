require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const Beneficiary = require("./models/Beneficiary");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/gramin_seva";

const seed = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Clear existing seed data
    await User.deleteMany({ email: { $regex: /example\.test$/ } });
    await Beneficiary.deleteMany({ beneficiaryId: { $regex: /^DEMO-/ } });
    console.log("🧹 Cleared previous seed data");

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash("password123", salt);

    // ── Seed Users ──────────────────────────────────
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
        name: "Priya Sharma",
        email: "beneficiary2@example.test",
        passwordHash,
        role: "beneficiary",
        beneficiaryId: "DEMO-1002",
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
        name: "Admin User",
        email: "admin@example.test",
        passwordHash,
        role: "admin",
        beneficiaryId: null,
        isActive: true,
      },
    ]);

    console.log(`👤 Seeded ${users.length} users`);

    // ── Seed Beneficiaries ───────────────────────────
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
        name: "Priya Sharma",
        village: "Sundar Nagar",
        district: "Prayagraj",
        gramPanchayat: "Sundar GP",
        contactNumber: "9123456789",
        jobCardHolderName: "Priya Sharma",
        recordVersion: 1,
      },
    ]);

    console.log(`🏡 Seeded ${beneficiaries.length} beneficiary records`);
    console.log("\n📋 Demo Credentials (all passwords: password123)");
    console.log("  Beneficiary 1 : beneficiary@example.test  → DEMO-1001 (PMAY_G)");
    console.log("  Beneficiary 2 : beneficiary2@example.test → DEMO-1002 (MGNREGS)");
    console.log("  Reviewer      : reviewer@example.test");
    console.log("  Admin         : admin@example.test");

    await mongoose.disconnect();
    console.log("\n✅ Seed complete. MongoDB disconnected.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  }
};

seed();
