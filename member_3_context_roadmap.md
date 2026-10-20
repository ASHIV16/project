# Context: Member 3 — Correction Request & Approval Workflow

## Role & Mission
You are the **orchestrator of business operations and decision lifecycles**. You handle request drafting, validation triggering, status transitions (`DRAFT` $\to$ `SUBMITTED` $\to$ `UNDER_REVIEW` $\to$ `APPROVED`/`REJECTED`/`NEEDS_INFO`), and atomic database updates upon official approval.

## Non-Interference Boundary
- **Owns**: `correctionrequests` collection, workflow transition endpoints, reviewer case details interface, and final database write to `beneficiaries`.
- **Dependencies**: Calls Member 2's verification engine upon request submission; renders Member 2's `<VerificationReport />` component in the Reviewer UI.

---

## Deliverables & API Ownership

### 1. `POST /api/requests` (Create Draft)
- **Body**:
  ```json
  {
    "scheme": "PMAY_G",
    "field": "name",
    "proposedValue": "Ramesh Kumarr",
    "reason": "Spelling error on card"
  }
  ```
- Automatically fetch current value from `beneficiaries` collection using `req.user.beneficiaryId`.
- Generate custom ID: `CR-${Date.now().toString().slice(-6)}`.
- Save with status `DRAFT`.

### 2. `POST /api/requests/:id/submit` (Final Submission)
- Checks duplicate active requests for the same field.
- Calls Member 2's verification logic.
- Updates status to `SUBMITTED` (or `UNDER_REVIEW`).
- Emits audit event (calls Member 4's logger).

### 3. `GET /api/requests/mine`
- Beneficiary lists their own requests with latest statuses.

### 4. `GET /api/reviewer/requests`
- Reviewer views all pending requests (supports query filters: `?status=SUBMITTED&scheme=PMAY_G`).

### 5. `POST /api/requests/:id/decision`
- Restricted to role: `reviewer` or `admin`.
- **Body**:
  ```json
  {
    "action": "APPROVE", // "APPROVE" | "REJECT" | "REQUEST_INFO"
    "reason": "Verified against attached Aadhaar copy"
  }
  ```
- **State Machine Rules**:
  - `SUBMITTED` / `UNDER_REVIEW` $\to$ `APPROVED`:
    - **CRITICAL**: Atomically update `beneficiaries` record:
      ```javascript
      await Beneficiary.updateOne(
        { beneficiaryId: request.beneficiaryId },
        { [request.field]: request.proposedValue, $inc: { recordVersion: 1 } }
      );
      ```
    - Mark request status `APPROVED`.
  - `SUBMITTED` / `UNDER_REVIEW` $\to$ `REJECTED`: requires non-empty `reason`.
  - `SUBMITTED` / `UNDER_REVIEW` $\to$ `NEEDS_INFO`: allows beneficiary to re-upload evidence or edit.

---

## Step-by-Step Implementation Roadmap

1. **Step 1: Mongoose Models & State Transition Guard (Day 1)**
   - Define `CorrectionRequest` schema.
   - Write a status transition validator function `isValidTransition(currentStatus, nextStatus)`.

2. **Step 2: Request CRUD & Submit APIs (Day 2)**
   - Implement `POST /api/requests`, `PATCH /api/requests/:id`, and `POST /api/requests/:id/submit`.
   - Prevent submissions if an open request for that field already exists.

3. **Step 3: Approval Logic & Record Sync (Day 3)**
   - Implement `POST /api/requests/:id/decision`.
   - Ensure the original beneficiary record is *never* mutated prior to approval.
   - Use Mongoose session or safe update to increment `recordVersion`.

4. **Step 4: Reviewer Case UI (Day 4-5)**
   - Build `/reviewer/queue`: Table showing ID, beneficiary, field, submitted date, and status pill.
   - Build `/reviewer/requests/:id`:
     - Side-by-side comparison: **Original Value** vs. **Proposed Value** (highlight differences in red/green).
     - Document viewer pane (integrate Member 2's document link).
     - Embedded Verification checks panel (Member 2's component).
     - Decision Action Bar: [Approve], [Reject], [Request Info] with modal for mandatory remarks.

---

## Unit Testing & Verification Checklist
- [ ] Transitioning from `DRAFT` directly to `APPROVED` returns 400 Bad Request.
- [ ] Approving a request mutates the beneficiary record accurately.
- [ ] Rejecting without a reason returns 422 Unprocessable Entity.
- [ ] Beneficiary A cannot view or decide on Beneficiary B's request.