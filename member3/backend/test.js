/**
 * Gramin Seva — Member 3 API & State Machine Test Suite
 * Tests all checklist items from member_3_context_roadmap.md
 * Run: node test.js
 */

const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Beneficiary = require("./models/Beneficiary");
const CorrectionRequest = require("./models/CorrectionRequest");

const BASE_URL = "http://localhost:5002";
const JWT_SECRET = process.env.JWT_SECRET || "gramin_seva_super_secret_key_2024";
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/gramin_seva";

// Beneficiary A (Ramesh Kumar, DEMO-1001)
const tokenBeneficiaryA = jwt.sign(
  {
    _id: "65f000000000000000000001",
    email: "beneficiary@example.test",
    role: "beneficiary",
    beneficiaryId: "DEMO-1001",
    name: "Ramesh Kumar",
  },
  JWT_SECRET,
  { expiresIn: "1h" }
);

// Beneficiary B (Priya Sharma, DEMO-1002)
const tokenBeneficiaryB = jwt.sign(
  {
    _id: "65f000000000000000000002",
    email: "beneficiary2@example.test",
    role: "beneficiary",
    beneficiaryId: "DEMO-1002",
    name: "Priya Sharma",
  },
  JWT_SECRET,
  { expiresIn: "1h" }
);

// Reviewer (Suresh Verma)
const tokenReviewer = jwt.sign(
  {
    _id: "65f000000000000000000003",
    email: "reviewer@example.test",
    role: "reviewer",
    name: "Suresh Verma",
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

const runAll = async () => {
  console.log("═════════════════════════════════════════════════════════════");
  console.log("  Gramin Seva — Member 3 Workflow & State Machine Test Suite");
  console.log("═════════════════════════════════════════════════════════════");

  try {
    await mongoose.connect(MONGO_URI);

    // ── 1. Health check ───────────────────────────────────────
    console.log("\n📡 [Health Check]");
    const health = await get("/api/health");
    check("GET /api/health returns 200", health.status === 200);

    // ── 2. Create Draft ───────────────────────────────────────
    console.log("\n📝 [POST /api/requests — Create Draft]");
    const draftRes = await post(
      "/api/requests",
      {
        scheme: "PMAY_G",
        field: "village",
        proposedValue: "Adarsh Gram",
        reason: "Official village renaming notification",
      },
      tokenBeneficiaryA
    );
    check("Draft created with 201 Created", draftRes.status === 201, `status=${draftRes.status}`);
    check("Status is DRAFT", draftRes.body?.data?.status === "DRAFT");
    check("Has generated requestId starting with CR-", draftRes.body?.data?.requestId?.startsWith("CR-"));
    const reqAId = draftRes.body?.data?.requestId;

    // ── 3. Checklist Item 1: DRAFT directly to APPROVED returns 400 ──
    console.log("\n🛑 [Checklist 1: Illegal Transition DRAFT -> APPROVED]");
    const directApproveRes = await post(
      `/api/requests/${reqAId}/decision`,
      { action: "APPROVE", reason: "Direct approve test" },
      tokenReviewer
    );
    check("Transitioning from DRAFT directly to APPROVED returns 400 Bad Request", directApproveRes.status === 400, `status=${directApproveRes.status}`);
    check("Error code is INVALID_TRANSITION", directApproveRes.body?.error?.code === "INVALID_TRANSITION");

    // ── 4. Submit Draft -> SUBMITTED ─────────────────────────
    console.log("\n🚀 [POST /api/requests/:id/submit — Submit Draft]");
    const submitRes = await post(`/api/requests/${reqAId}/submit`, {}, tokenBeneficiaryA);
    check("Submitting draft returns 200", submitRes.status === 200, `status=${submitRes.status}`);
    check("Status transitioned to SUBMITTED", submitRes.body?.data?.status === "SUBMITTED");

    // ── 5. Checklist Item 3: Rejecting without reason returns 422 ──
    console.log("\n⚠️ [Checklist 3: Rejecting without Reason returns 422]");
    const rejectNoReasonRes = await post(
      `/api/requests/${reqAId}/decision`,
      { action: "REJECT", reason: "" },
      tokenReviewer
    );
    check("Rejecting without a reason returns 422 Unprocessable Entity", rejectNoReasonRes.status === 422, `status=${rejectNoReasonRes.status}`);
    check("Error code is REASON_REQUIRED", rejectNoReasonRes.body?.error?.code === "REASON_REQUIRED");

    // ── 6. Checklist Item 4: Beneficiary A vs Beneficiary B Isolation ──
    console.log("\n🔒 [Checklist 4: Cross-Tenant Authorization Boundaries]");
    // Beneficiary B attempts to view Beneficiary A's request
    const viewOtherRes = await get(`/api/requests/${reqAId}`, tokenBeneficiaryB);
    check("Beneficiary B cannot view Beneficiary A's request (403 Forbidden)", viewOtherRes.status === 403, `status=${viewOtherRes.status}`);

    // Beneficiary B attempts to decide on Beneficiary A's request
    const decideBeneficiaryRes = await post(
      `/api/requests/${reqAId}/decision`,
      { action: "APPROVE" },
      tokenBeneficiaryB
    );
    check("Beneficiary cannot decide on requests (403 Forbidden)", decideBeneficiaryRes.status === 403, `status=${decideBeneficiaryRes.status}`);

    // ── 7. Checklist Item 2: Approving mutates beneficiary record accurately ──
    console.log("\n✅ [Checklist 2: Official Approval & Atomic Record Sync]");
    const initialBeneficiary = await Beneficiary.findOne({ beneficiaryId: "DEMO-1001" });
    const initialVersion = initialBeneficiary.recordVersion || 1;

    const approveRes = await post(
      `/api/requests/${reqAId}/decision`,
      { action: "APPROVE", reason: "Verified with gram panchayat certificate" },
      tokenReviewer
    );
    check("Approving returns 200 OK", approveRes.status === 200, `status=${approveRes.status}`);
    check("Request status changed to APPROVED", approveRes.body?.data?.status === "APPROVED");

    const updatedBeneficiary = await Beneficiary.findOne({ beneficiaryId: "DEMO-1001" });
    check("Beneficiary village field accurately mutated to 'Adarsh Gram'", updatedBeneficiary.village === "Adarsh Gram", `val=${updatedBeneficiary.village}`);
    check("Beneficiary recordVersion incremented by 1", updatedBeneficiary.recordVersion === initialVersion + 1, `v=${updatedBeneficiary.recordVersion}`);

    // ── 8. Reviewer Queue & Query Filtering ───────────────────
    console.log("\n📋 [GET /api/reviewer/requests — Queue Filtering]");
    const queueRes = await get("/api/reviewer/requests?status=APPROVED", tokenReviewer);
    check("Reviewer queue returns 200", queueRes.status === 200);
    check("Returned requests match filter criteria", queueRes.body?.data?.some((r) => r.requestId === reqAId));

    // ── 9. Beneficiary Own Requests List ──────────────────────
    console.log("\n📂 [GET /api/requests/mine — Beneficiary List]");
    const mineRes = await get("/api/requests/mine", tokenBeneficiaryA);
    check("Beneficiary sees their own request in history", mineRes.body?.data?.some((r) => r.requestId === reqAId));

    await mongoose.disconnect();
  } catch (err) {
    console.error("\n💥 Test suite crashed:", err);
  }

  const total = testsPassed + testsFailed;
  console.log("\n═════════════════════════════════════════════════════════════");
  console.log(`  Results: ${testsPassed}/${total} passed`);
  if (testsFailed > 0) {
    console.log(`  ❌ ${testsFailed} test(s) FAILED`);
    process.exit(1);
  } else {
    console.log("  🎉 All Member 3 checklist tests passed!");
    process.exit(0);
  }
};

runAll();
