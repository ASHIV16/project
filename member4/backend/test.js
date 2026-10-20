/**
 * Gramin Seva — Member 4 Admin, Audit & Analytics Test Suite
 * Tests all checklist items from member_4_context_roadmap.md
 * Run: node test.js
 */

const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { seedDatabase } = require("./seed");
const CorrectionRequest = require("./models/CorrectionRequest");

const BASE_URL = "http://localhost:5003";
const JWT_SECRET = process.env.JWT_SECRET || "gramin_seva_super_secret_key_2024";
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/gramin_seva";

// Beneficiary Token (Non-admin)
const tokenBeneficiary = jwt.sign(
  {
    _id: "65f000000000000000000001",
    email: "beneficiary@example.test",
    role: "beneficiary",
    name: "Ramesh Kumar",
  },
  JWT_SECRET,
  { expiresIn: "1h" }
);

// Reviewer Token (Non-admin)
const tokenReviewer = jwt.sign(
  {
    _id: "65f000000000000000000002",
    email: "reviewer@example.test",
    role: "reviewer",
    name: "Suresh Verma",
  },
  JWT_SECRET,
  { expiresIn: "1h" }
);

// Admin Token
const tokenAdmin = jwt.sign(
  {
    _id: "65f000000000000000000003",
    email: "admin@example.test",
    role: "admin",
    name: "System Administrator",
  },
  JWT_SECRET,
  { expiresIn: "1h" }
);

let testsPassed = 0;
let testsFailed = 0;

const check = (name, passed, extra = "") => {
  if (passed) {
    console.log(`  ✅ PASS — ${name}${extra ? " | " + extra : ""}`);
    testsPassed++;
  } else {
    console.log(`  ❌ FAIL — ${name}${extra ? " | " + extra : ""}`);
    testsFailed++;
  }
};

const get = async (path, token) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  return { status: res.status, body: await res.json() };
};

const post = async (path, body, token) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
};

const del = async (path, token) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  return { status: res.status, body: await res.json() };
};

const runAll = async () => {
  console.log("═════════════════════════════════════════════════════════════");
  console.log("  Gramin Seva — Member 4 Admin & Audit Test Suite");
  console.log("═════════════════════════════════════════════════════════════");

  try {
    await mongoose.connect(MONGO_URI);

    // ── Checklist 1: Seed script idempotency ───────────────────
    console.log("\n🌱 [Checklist 1: Seed Script Idempotency]");
    let seed1Ok = false;
    let seed2Ok = false;
    try {
      await seedDatabase();
      seed1Ok = true;
      // Run a 2nd time immediately to verify zero duplicate key exceptions
      await seedDatabase();
      seed2Ok = true;
    } catch (e) {
      console.error("Seed failed:", e);
    }
    check("Seed executes cleanly without duplicate key errors", seed1Ok && seed2Ok);

    // ── Health check ──────────────────────────────────────────
    console.log("\n📡 [Health Check]");
    const health = await get("/api/health");
    check("GET /api/health returns 200", health.status === 200);

    // ── Checklist 3: Role-based Access Control (403 for Non-Admins) ──
    console.log("\n🔒 [Checklist 3: Non-Admin Access Rejection (403 Forbidden)]");
    const noTokenRes = await get("/api/admin/stats");
    check("Request without token returns 401 Unauthorized", noTokenRes.status === 401, `status=${noTokenRes.status}`);

    const benRes = await get("/api/admin/stats", tokenBeneficiary);
    check("Beneficiary accessing /api/admin/stats receives 403 Forbidden", benRes.status === 403, `status=${benRes.status}`);
    check("Error code is FORBIDDEN", benRes.body?.error?.code === "FORBIDDEN");

    const revRes = await get("/api/admin/stats", tokenReviewer);
    check("Reviewer accessing /api/admin/stats receives 403 Forbidden", revRes.status === 403, `status=${revRes.status}`);

    const revLogsRes = await get("/api/admin/audit-logs", tokenReviewer);
    check("Reviewer accessing /api/admin/audit-logs receives 403 Forbidden", revLogsRes.status === 403, `status=${revLogsRes.status}`);

    // ── Checklist 2: Aggregation Metrics Accuracy ─────────────
    console.log("\n📊 [Checklist 2: Aggregation Metrics Accuracy]");
    const statsRes = await get("/api/admin/stats", tokenAdmin);
    check("Admin successfully fetches stats (200 OK)", statsRes.status === 200, `status=${statsRes.status}`);

    const dbTotal = await CorrectionRequest.countDocuments();
    const dbSubmitted = await CorrectionRequest.countDocuments({ status: "SUBMITTED" });
    const dbApproved = await CorrectionRequest.countDocuments({ status: "APPROVED" });

    check("totalRequests matches actual DB count", statsRes.body?.data?.totalRequests === dbTotal, `val=${statsRes.body?.data?.totalRequests}`);
    check("SUBMITTED count matches DB", statsRes.body?.data?.byStatus?.SUBMITTED === dbSubmitted);
    check("APPROVED count matches DB", statsRes.body?.data?.byStatus?.APPROVED === dbApproved);
    check("Calculated approvalRate is present and valid number", typeof statsRes.body?.data?.approvalRate === "number");
    check("totalBeneficiaries matches DB count (2)", statsRes.body?.data?.totalBeneficiaries === 2);

    // ── Audit Logs Querying & Filtering ───────────────────────
    console.log("\n📜 [Test: Filterable & Paginated Audit Logs]");
    const logsRes = await get("/api/admin/audit-logs?limit=10", tokenAdmin);
    check("Admin gets audit logs array (200 OK)", logsRes.status === 200, `status=${logsRes.status}`);
    check("Returned logs array has records", Array.isArray(logsRes.body?.data?.logs) && logsRes.body?.data?.logs.length > 0);
    check("Has pagination metadata (total, totalPages)", logsRes.body?.data?.total > 0 && logsRes.body?.data?.totalPages >= 1);

    const filterRes = await get("/api/admin/audit-logs?action=SUBMIT_REQUEST", tokenAdmin);
    check("Filter by action works accurately", filterRes.body?.data?.logs?.every((l) => l.action === "SUBMIT_REQUEST"));

    // ── Checklist 4: Audit Log Immutability ────────────────────
    console.log("\n🛡️ [Checklist 4: Audit Log Immutability (No DELETE or Mutation)]");
    const sampleLogId = logsRes.body?.data?.logs[0]?._id;
    const deleteAttempt = await del(`/api/admin/audit-logs/${sampleLogId}`, tokenAdmin);
    check("Attempt to DELETE an audit log is blocked with 405 Method Not Allowed", deleteAttempt.status === 405, `status=${deleteAttempt.status}`);
    check("Error code specifies AUDIT_IMMUTABLE", deleteAttempt.body?.error?.code === "AUDIT_IMMUTABLE");

    // ── Test Reseed API ───────────────────────────────────────
    console.log("\n🔄 [Test: Admin Reseed Trigger]");
    const reseedRes = await post("/api/admin/reseed", {}, tokenAdmin);
    check("Admin reseed endpoint returns 200 OK", reseedRes.status === 200, `status=${reseedRes.status}`);
    check("Response status is RESEEDED", reseedRes.body?.data?.status === "RESEEDED");

    await mongoose.disconnect();
  } catch (err) {
    console.error("\n💥 Member 4 test runner crashed:", err);
  }

  const total = testsPassed + testsFailed;
  console.log("\n═════════════════════════════════════════════════════════════");
  console.log(`  Results: ${testsPassed}/${total} passed`);
  if (testsFailed > 0) {
    console.log(`  ❌ ${testsFailed} test(s) FAILED`);
    process.exit(1);
  } else {
    console.log("  🎉 All Member 4 checklist tests passed!");
    process.exit(0);
  }
};

runAll();
