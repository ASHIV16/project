# Context: Member 1 — Authentication & Beneficiary Portal

## Role & Mission
You are the primary guardian of **user identity, session control, and the beneficiary experience**. Your job is to enable beneficiaries to securely log in, inspect their simulated scheme profile (PMAY-G or MGNREGS), browse their correction history, and launch new requests.

## Non-Interference Boundary
- **Owns**: User schema, Auth routes, `/api/beneficiaries/me`, Beneficiary pages (`/login`, `/portal/profile`, `/portal/requests`).
- **Dependencies**: You do not write the core request submission engine or the document upload parser. You will trigger Member 3's `/api/requests` endpoint from your UI forms.

---

## Deliverables & API Ownership

### 1. `POST /api/auth/login`
- **Request Body**:
  ```json
  { "email": "beneficiary@example.test", "password": "password123" }
  ```
- **Response**: Set HTTP-only Cookie or return JSON token:
  ```json
  {
    "success": true,
    "data": {
      "token": "jwt_token_here",
      "user": {
        "id": "65f000000000000000000001",
        "name": "Ramesh Kumar",
        "email": "beneficiary@example.test",
        "role": "beneficiary",
        "beneficiaryId": "DEMO-1001"
      }
    }
  }
  ```

### 2. `GET /api/auth/me`
- Validate token and return current session profile.

### 3. `GET /api/beneficiaries/me`
- Enforce that `req.user.beneficiaryId` matches the query. Beneficiaries must never be allowed to pass an arbitrary ID parameter to view someone else's record.

### 4. Express Auth Middleware (`authMiddleware.js`)
- Write reusable middleware:
  - `verifyToken`: extracts JWT, validates, binds `req.user`.
  - `requireRole(roles)`: ensures `roles.includes(req.user.role)`.
  - Export this so Members 2, 3, and 4 can import and protect their routes immediately.

---

## Step-by-Step Implementation Roadmap

1. **Step 1: Auth & JWT Utility (Day 1)**
   - Setup `bcrypt` for password hashing and `jsonwebtoken` for signing.
   - Build `POST /api/auth/login` and `POST /api/auth/logout`.
   - Implement `authMiddleware.js` and test using Postman.

2. **Step 2: Beneficiary Profile API (Day 2)**
   - Build `GET /api/beneficiaries/me` querying the `beneficiaries` collection using `req.user.beneficiaryId`.
   - Ensure 403 Forbidden is returned if a user without a valid beneficiary profile attempts access.

3. **Step 3: Frontend Login & Route Guards (Day 3)**
   - Build `/login` in React with a role switcher or quick-fill buttons for demo efficiency (`[Demo Beneficiary]`, `[Demo Reviewer]`, `[Demo Admin]`).
   - Create React Context (`AuthContext`) handling token storage, login state, and role guards (`<ProtectedRoute role="beneficiary" />`).

4. **Step 4: Beneficiary Dashboard UI (Day 4-5)**
   - Build the profile view displaying PMAY-G / MGNREGS card: Name, Village, District, Scheme ID, and status badge.
   - Build the request list page fetching from `/api/requests/mine` (mocked until Member 3 integrates).
   - Display dynamic badges for status (`DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `NEEDS_INFO`, `APPROVED`, `REJECTED`).

---

## Unit Testing & Verification Checklist
- [ ] Attempt login with wrong password -> returns 401 Unauthorized.
- [ ] Attempt access to `GET /api/beneficiaries/me` without Bearer token -> returns 401.
- [ ] Attempt access to `GET /api/beneficiaries/me` with reviewer token -> returns 403 or handles accordingly.
- [ ] Beneficiary sees their exact record data without leaking raw password hashes.