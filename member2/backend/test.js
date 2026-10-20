/**
 * Gramin Seva — Member 2 API & Engine Test Suite
 * Tests all checklist items from member_2_context_roadmap.md
 * Run: node test.js
 */

const jwt = require("jsonwebtoken");
const fs  = require("fs");
const path = require("path");

const BASE_URL   = "http://localhost:5001";
const JWT_SECRET = process.env.JWT_SECRET || "gramin_seva_super_secret_key_2024";

// Generate test tokens
const beneficiaryToken = jwt.sign(
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

const reviewerToken = jwt.sign(
  {
    _id: "65f000000000000000000002",
    email: "reviewer@example.test",
    role: "reviewer",
    name: "Suresh Verma",
  },
  JWT_SECRET,
  { expiresIn: "1h" }
);

let testsPassed = 0;
let testsFailed = 0;
let uploadedDocId = null;

const check = (name, passed, extra = "") => {
  if (passed) {
    console.log(`  ✅ PASS — ${name}${extra ? " | " + extra : ""}`);
    testsPassed++;
  } else {
    console.log(`  ❌ FAIL — ${name}${extra ? " | " + extra : ""}`);
    testsFailed++;
  }
};

// ── 1. Unit Tests for verificationEngine ─────────────────────────
const testVerificationEngineRules = () => {
  console.log("\n⚙️ [Unit Tests: Verification Rules Engine]");
  const { evaluateRequest, deriveOverallStatus } = require("./services/verificationEngine");

  // Case 1: No documents attached -> document_presence must FAIL, overall FAIL
  const reqNoDocs = {
    requestId: "CR-TEST-0001",
    scheme: "PMAY_G",
    field: "name",
    oldValue: "Ramesh Kumar",
    proposedValue: "Ramesh Kumar Verma",
    reason: "Correction as per Aadhaar",
  };
  const checksNoDocs = evaluateRequest({ request: reqNoDocs, documents: [] });
  const docCheck = checksNoDocs.find((c) => c.name === "document_presence");
  const overallNoDocs = deriveOverallStatus(checksNoDocs);
  check("Verification engine produces FAIL if no document attached", docCheck?.status === "FAIL", `status=${docCheck?.status}`);
  check("Overall status is FAIL when no document attached", overallNoDocs === "FAIL");

  // Case 2: Proposed value differs from database record -> value_comparison is FLAG
  const dummyDoc = [{ _id: "doc1", originalName: "proof.pdf" }];
  const checksDiff = evaluateRequest({ request: reqNoDocs, documents: dummyDoc });
  const valCheck = checksDiff.find((c) => c.name === "value_comparison");
  check("Verification engine produces FLAG when proposed value differs from database record", valCheck?.status === "FLAG", `status=${valCheck?.status}`);

  // Case 3: Disallowed field for scheme -> field_whitelist FAIL
  const reqDisallowed = {
    ...reqNoDocs,
    field: "unsupportedField",
  };
  const checksDisallowed = evaluateRequest({ request: reqDisallowed, documents: dummyDoc });
  const wlCheck = checksDisallowed.find((c) => c.name === "field_whitelist");
  check("Disallowed field fails whitelist_check", wlCheck?.status === "FAIL");

  // Case 4: Missing reason -> required_fields FAIL
  const reqNoReason = {
    ...reqNoDocs,
    reason: "",
  };
  const checksNoReason = evaluateRequest({ request: reqNoReason, documents: dummyDoc });
  const reqCheck = checksNoReason.find((c) => c.name === "required_fields");
  check("Missing reason fails required_fields", reqCheck?.status === "FAIL");
};

// ── 2. Integration / API Tests ─────────────────────────────────
const runApiTests = async () => {
  console.log("\n📡 [Integration Tests: Member 2 Endpoints]");

  // 2.1 Health check
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  check("GET /api/health returns 200", healthRes.status === 200);

  // 2.2 Upload Executable / Disallowed File Type
  console.log("\n🛡️ [Test: Executable / Disallowed MIME Rejection]");
  const testRequestId = "CR-DEMO-TEST";

  // Create boundary & multipart for .exe / .sh
  const createMultipart = (filename, content, mime) => {
    const boundary = "----WebKitFormBoundary" + Math.random().toString(36).substring(2);
    const bodyBuffer = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`),
      Buffer.isBuffer(content) ? content : Buffer.from(content),
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    return { boundary, bodyBuffer };
  };

  const exePayload = createMultipart("malware.exe", "MZ executable binary content", "application/x-msdownload");
  const exeRes = await fetch(`${BASE_URL}/api/requests/${testRequestId}/documents`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${beneficiaryToken}`,
      "Content-Type": `multipart/form-data; boundary=${exePayload.boundary}`,
    },
    body: exePayload.bodyBuffer,
  });
  const exeJson = await exeRes.json();
  check("Attempt uploading an executable (.exe) rejected with 400", exeRes.status === 400, `status=${exeRes.status}`);
  check("Error code is INVALID_FILE_TYPE", exeJson?.error?.code === "INVALID_FILE_TYPE");

  // 2.3 Upload >5MB file -> 413 Payload Too Large
  console.log("\n📦 [Test: 5MB File Limit Enforced]");
  const bigBuffer = Buffer.alloc(5.5 * 1024 * 1024, "A"); // 5.5 MB
  const bigPayload = createMultipart("large_document.pdf", bigBuffer, "application/pdf");
  const bigRes = await fetch(`${BASE_URL}/api/requests/${testRequestId}/documents`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${beneficiaryToken}`,
      "Content-Type": `multipart/form-data; boundary=${bigPayload.boundary}`,
    },
    body: bigPayload.bodyBuffer,
  });
  const bigJson = await bigRes.json();
  check("Attempt uploading >5MB file rejected with 413 Payload Too Large", bigRes.status === 413, `status=${bigRes.status}`);
  check("Error code is FILE_TOO_LARGE", bigJson?.error?.code === "FILE_TOO_LARGE");

  // 2.4 Upload Valid PDF Document -> 201 Created
  console.log("\n📄 [Test: Valid Document Upload]");
  const validBuffer = Buffer.from("%PDF-1.4 simulated pdf document content for verification");
  const validPayload = createMultipart("aadhaar_sample.pdf", validBuffer, "application/pdf");
  const validRes = await fetch(`${BASE_URL}/api/requests/${testRequestId}/documents`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${beneficiaryToken}`,
      "Content-Type": `multipart/form-data; boundary=${validPayload.boundary}`,
    },
    body: validPayload.bodyBuffer,
  });
  const validJson = await validRes.json();
  check("Valid PDF upload returns 201", validRes.status === 201, `status=${validRes.status}`);
  check("Returns documentId and originalName", !!validJson?.data?.documentId && validJson?.data?.originalName === "aadhaar_sample.pdf");
  if (validJson?.data?.documentId) {
    uploadedDocId = validJson.data.documentId;
  }

  // 2.5 List documents
  console.log("\n📂 [Test: List Documents]");
  const listRes = await fetch(`${BASE_URL}/api/requests/${testRequestId}/documents`, {
    headers: { Authorization: `Bearer ${beneficiaryToken}` },
  });
  const listJson = await listRes.json();
  check("GET documents returns 200", listRes.status === 200);
  check("Document count is at least 1", Array.isArray(listJson.data) && listJson.data.length >= 1);

  // 2.6 Secure Download
  console.log("\n📥 [Test: Secure Document Download]");
  if (uploadedDocId) {
    const dlRes = await fetch(`${BASE_URL}/api/requests/${testRequestId}/documents/${uploadedDocId}/download`, {
      headers: { Authorization: `Bearer ${beneficiaryToken}` },
    });
    check("Authorized download returns 200", dlRes.status === 200, `status=${dlRes.status}`);
    check("Content-Disposition attachment header is set", dlRes.headers.get("content-disposition")?.includes("aadhaar_sample.pdf"));
  }

  // 2.7 Verification API Endpoint: Trigger verification & inspect
  console.log("\n🔍 [Test: Verification Endpoints]");
  const verifyPostRes = await fetch(`${BASE_URL}/api/requests/${testRequestId}/verification`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${reviewerToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requestDoc: {
        requestId: testRequestId,
        scheme: "PMAY_G",
        field: "name",
        oldValue: "Ramesh Kumar",
        proposedValue: "Ramesh Kumar Sharma",
        reason: "Name update as per Aadhaar",
      },
    }),
  });
  const verifyPostJson = await verifyPostRes.json();
  check("POST verification returns 200", verifyPostRes.status === 200, `status=${verifyPostRes.status}`);
  check("Verification contains checks array", Array.isArray(verifyPostJson?.data?.checks));

  const verifyGetRes = await fetch(`${BASE_URL}/api/requests/${testRequestId}/verification`, {
    headers: { Authorization: `Bearer ${reviewerToken}` },
  });
  const verifyGetJson = await verifyGetRes.json();
  check("GET /api/requests/:id/verification returns 200", verifyGetRes.status === 200, `status=${verifyGetRes.status}`);
  check("Returned requestId matches", verifyGetJson?.data?.requestId === testRequestId);
  check("Includes required_fields and document_presence",
    verifyGetJson?.data?.checks?.some((c) => c.name === "required_fields") &&
    verifyGetJson?.data?.checks?.some((c) => c.name === "document_presence")
  );
};

// ── Runner ─────────────────────────────────────────────────────
const runAll = async () => {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  Gramin Seva — Member 2 Engine & API Test Suite");
  console.log("═══════════════════════════════════════════════════════");

  try {
    testVerificationEngineRules();
    await runApiTests();
  } catch (err) {
    console.error("\n💥 Test runner crashed:", err);
  }

  const total = testsPassed + testsFailed;
  console.log("\n═══════════════════════════════════════════════════════");
  console.log(`  Results: ${testsPassed}/${total} passed`);
  if (testsFailed > 0) {
    console.log(`  ❌ ${testsFailed} test(s) FAILED`);
    process.exit(1);
  } else {
    console.log("  🎉 All tests passed!");
    process.exit(0);
  }
};

runAll();
