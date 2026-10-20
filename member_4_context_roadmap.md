# Context: Member 4 — Admin Dashboard, Audit & Integration

## Role & Mission
You are the **system integrator, analytics lead, and operations administrator**. You build the administrative dashboard, the immutable audit trail, provide database seed scripts for demo reliability, and lead the cross-module integration.

## Non-Interference Boundary
- **Owns**: `auditlogs` collection, Audit service, Admin metrics endpoints (`/api/admin/stats`), DB seeds, Docker/Deployment configuration, and Admin UI pages.
- **Dependencies**: Imports route files from Members 1, 2, and 3 into `server.js`. Provides the seed script so everyone has consistent local test accounts.

---

## Deliverables & API Ownership

### 1. Database Seed Script (`seed.js`)
Create a one-command seed script (`npm run seed`) creating:
- 3 Users:
  - `beneficiary@example.test` (password: `password123`, linked to `DEMO-1001`)
  - `reviewer@example.test` (password: `password123`, role: `reviewer`)
  - `admin@example.test` (password: `password123`, role: `admin`)
- 2 Beneficiary records:
  - `DEMO-1001` (PMAY_G, Ramesh Kumar, Demo Village)
  - `DEMO-1002` (MGNREGS, Sunita Devi, Demo Panchayat)
- 3 Sample requests representing each stage (`SUBMITTED`, `APPROVED`, `NEEDS_INFO`).

### 2. Audit Logging Service (`auditLogger.js`)
- Export a helper function for Members 1, 2, and 3:
  ```javascript
  export async function logEvent({ requestId, actorId, actorRole, action, reason, meta }) {
    return await AuditLog.create({ requestId, actorId, actorRole, action, reason, meta });
  }
  ```

### 3. `GET /api/admin/stats`
- Aggregation query calculating:
  - Total requests submitted.
  - Count by status (`pending`, `approved`, `rejected`, `needs_info`).
  - Breakdown by scheme (`PMAY_G` vs `MGNREGS`).

### 4. `GET /api/admin/audit-logs`
- Filterable and paginated endpoint to inspect actions by date, requestId, or actor.

### 5. Frontend Admin Console (`/admin`)
- Metric summary cards (Total Requests, Pending Review, Approval Rate).
- Bar / Pie charts (using Recharts or Lucide icons) showing scheme breakdown.
- Audit Log stream showing actor, timestamp, action taken, and associated request ID.

---

## Step-by-Step Implementation Roadmap

1. **Step 1: Environment Setup & Seed Scripts (Day 1)**
   - Initialize Git repo and project layout (`/client`, `/server`).
   - Write `seed.js` using `bcrypt` to populate ready-to-test synthetic users and beneficiaries.
   - Distribute instructions to team members.

2. **Step 2: Audit Engine & Middleware (Day 2)**
   - Create `AuditLog` model and `auditLogger.js`.
   - Build `GET /api/admin/audit-logs` with role checking (`role === 'admin'`).

3. **Step 3: Analytics & Aggregate Endpoints (Day 3)**
   - Build `GET /api/admin/stats` using MongoDB `$facet` or parallel `countDocuments` queries.

4. **Step 4: Admin Dashboard UI (Day 4)**
   - Build dashboard view with 4 stat widgets and filterable audit log table.
   - Add demo quick-action buttons to re-seed demo data if the state gets messy during tests.

5. **Step 5: Master Integration & Demo Script (Day 5)**
   - Connect all Express router files in `server.js`:
     ```javascript
     app.use("/api/auth", authRoutes);
     app.use("/api/beneficiaries", beneficiaryRoutes);
     app.use("/api/requests", requestRoutes);
     app.use("/api/documents", documentRoutes);
     app.use("/api/admin", adminRoutes);
     ```
   - Walk through the final presentation scenario end-to-end.

---

## Unit Testing & Verification Checklist
- [ ] `npm run seed` executes without duplicate key errors and clears previous test state.
- [ ] Aggregation metrics accurately reflect database records.
- [ ] Non-admin accounts receive 403 Forbidden when accessing `/api/admin/*`.
- [ ] Audit logs cannot be deleted or modified via any API endpoint.