/**
 * Gramin Seva — Member 1 API Test Suite
 * Tests all checklist items from the member_1_context_roadmap.md
 * Run: node test.js
 */

const BASE_URL = "http://localhost:5000";

let testsPassed = 0;
let testsFailed = 0;
let beneficiaryToken = null;
let reviewerToken = null;

// ── Helpers ───────────────────────────────────
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

const check = (name, passed, extra = "") => {
  if (passed) {
    console.log(`  ✅ PASS — ${name}${extra ? " | " + extra : ""}`);
    testsPassed++;
  } else {
    console.log(`  ❌ FAIL — ${name}${extra ? " | " + extra : ""}`);
    testsFailed++;
  }
};

// ── Test Suites ───────────────────────────────

const testHealth = async () => {
  console.log("\n📡 [Health Check]");
  const r = await get("/api/health");
  check("GET /api/health returns 200", r.status === 200, `status=${r.status}`);
  check("Response has success:true", r.body.success === true);
};

const testLogin = async () => {
  console.log("\n🔐 [POST /api/auth/login]");

  // ✅ Correct credentials — beneficiary
  const r1 = await post("/api/auth/login", { email: "beneficiary@example.test", password: "password123" });
  check("Login with correct credentials returns 200", r1.status === 200, `status=${r1.status}`);
  check("Response has token", !!r1.body?.data?.token);
  check("Response has user object", !!r1.body?.data?.user);
  check("User role is beneficiary", r1.body?.data?.user?.role === "beneficiary");
  check("User beneficiaryId is DEMO-1001", r1.body?.data?.user?.beneficiaryId === "DEMO-1001");
  check("No passwordHash in response", !JSON.stringify(r1.body).includes("passwordHash"));
  if (r1.body?.data?.token) beneficiaryToken = r1.body.data.token;

  // ✅ Correct credentials — reviewer
  const r2 = await post("/api/auth/login", { email: "reviewer@example.test", password: "password123" });
  check("Reviewer login returns 200", r2.status === 200);
  check("Reviewer role is reviewer", r2.body?.data?.user?.role === "reviewer");
  if (r2.body?.data?.token) reviewerToken = r2.body.data.token;

  // ❌ Wrong password
  const r3 = await post("/api/auth/login", { email: "beneficiary@example.test", password: "wrongpassword" });
  check("Wrong password returns 401", r3.status === 401, `status=${r3.status}`);
  check("Error code is INVALID_CREDENTIALS", r3.body?.error?.code === "INVALID_CREDENTIALS");

  // ❌ Non-existent email
  const r4 = await post("/api/auth/login", { email: "nobody@example.test", password: "password123" });
  check("Non-existent user returns 401", r4.status === 401, `status=${r4.status}`);

  // ❌ Missing fields
  const r5 = await post("/api/auth/login", { email: "" });
  check("Missing fields returns 400", r5.status === 400, `status=${r5.status}`);
};

const testAuthMe = async () => {
  console.log("\n👤 [GET /api/auth/me]");

  // ✅ Valid token
  const r1 = await get("/api/auth/me", beneficiaryToken);
  check("Valid token returns 200", r1.status === 200, `status=${r1.status}`);
  check("Returns user data", !!r1.body?.data?.email);
  check("No passwordHash in response", !JSON.stringify(r1.body).includes("passwordHash"));

  // ❌ No token
  const r2 = await get("/api/auth/me");
  check("No token returns 401", r2.status === 401, `status=${r2.status}`);
  check("Error code is NO_TOKEN", r2.body?.error?.code === "NO_TOKEN");

  // ❌ Invalid token
  const r3 = await get("/api/auth/me", "this.is.a.bad.token");
  check("Invalid token returns 401", r3.status === 401, `status=${r3.status}`);
  check("Error code is INVALID_TOKEN", r3.body?.error?.code === "INVALID_TOKEN");
};

const testBeneficiaryMe = async () => {
  console.log("\n🏡 [GET /api/beneficiaries/me]");

  // ✅ Beneficiary with valid token
  const r1 = await get("/api/beneficiaries/me", beneficiaryToken);
  check("Beneficiary token returns 200", r1.status === 200, `status=${r1.status}`);
  check("Returns correct beneficiaryId", r1.body?.data?.beneficiaryId === "DEMO-1001");
  check("Returns scheme field", !!r1.body?.data?.scheme);
  check("Returns village field", !!r1.body?.data?.village);
  check("No passwordHash leaked", !JSON.stringify(r1.body).includes("passwordHash"));

  // ❌ No token
  const r2 = await get("/api/beneficiaries/me");
  check("No token returns 401", r2.status === 401, `status=${r2.status}`);

  // ❌ Reviewer token (wrong role)
  const r3 = await get("/api/beneficiaries/me", reviewerToken);
  check("Reviewer token returns 403", r3.status === 403, `status=${r3.status}`);
  check("Error code is FORBIDDEN", r3.body?.error?.code === "FORBIDDEN");
};

const testLogout = async () => {
  console.log("\n🚪 [POST /api/auth/logout]");
  const r1 = await post("/api/auth/logout", {}, beneficiaryToken);
  check("Logout with valid token returns 200", r1.status === 200, `status=${r1.status}`);
  check("Response success is true", r1.body?.success === true);
};

// ── Runner ────────────────────────────────────
const runAll = async () => {
  console.log("═══════════════════════════════════════════");
  console.log("  Gramin Seva — Member 1 API Test Suite");
  console.log("═══════════════════════════════════════════");

  try {
    await testHealth();
    await testLogin();
    await testAuthMe();
    await testBeneficiaryMe();
    await testLogout();
  } catch (err) {
    console.error("\n💥 Test runner crashed:", err.message);
  }

  const total = testsPassed + testsFailed;
  console.log("\n═══════════════════════════════════════════");
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
