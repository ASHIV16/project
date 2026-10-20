# Context: Member 2 — Data Verification & Document Engine

## Role & Mission
You are the **gatekeeper of data integrity and evidence**. You build the verification engine that inspects requested changes, flags discrepancies, and safely manages file uploads. You also provide automated consistency checks using deterministic rules and local OCR.

## Non-Interference Boundary
- **Owns**: File upload infrastructure, `documents` collection, `verificationresults` collection, automated verification logic, and the UI component that displays check breakdowns.
- **Dependencies**: Receives `requestId` and proposed values from Member 3's request module. You expose a standalone engine function `runVerification(requestId)` that Member 3 can invoke upon submission.

---

## Deliverables & API Ownership

### 1. `POST /api/requests/:id/documents`
- **Form Data**: `file` (single or multiple, PDF/PNG/JPEG, max 5MB).
- Validates mime type and file signature.
- Stores file in a local private directory (`/uploads/private/`) with a randomized UUID filename.
- Stores metadata in MongoDB `documents` collection.
- Returns:
  ```json
  {
    "success": true,
    "data": {
      "documentId": "65f000000000000000000099",
      "originalName": "aadhaar_sample.pdf",
      "mimeType": "application/pdf",
      "size": 182400
    }
  }
  ```

### 2. `GET /api/requests/:id/documents/:docId/download`
- Stream the document securely to authorized users only (the request owner or reviewers/admins).

### 3. `GET /api/requests/:id/verification`
- Returns the breakdown of automated verification checks for the UI:
  ```json
  {
    "success": true,
    "data": {
      "requestId": "CR-DEMO-0001",
      "overallStatus": "FLAG",
      "checks": [
        { "name": "required_fields", "status": "PASS", "message": "All fields filled" },
        { "name": "format_validation", "status": "PASS", "message": "Valid format" },
        { "name": "whitelist_check", "status": "PASS", "message": "Field is editable under PMAY_G" },
        { "name": "document_presence", "status": "PASS", "message": "Supporting document found" },
        { "name": "value_comparison", "status": "FLAG", "message": "Proposed value differs from database record" }
      ]
    }
  }
  ```

### 4. Verification Rules Engine Service (`verificationEngine.js`)
Implement deterministic checks:
1. `required_fields`: Verify proposedValue and reason are non-empty.
2. `field_whitelist`: Verify the field is inside `ALLOWED_FIELDS[scheme]`.
3. `value_delta`: Verify `proposedValue !== oldValue`.
4. `document_presence`: Query `documents` collection for the `requestId`. If count == 0, mark `FAIL`.
5. *(P1 Optional)* `ocr_text_match`: If document is an image, run `Tesseract.js` to extract text. Check if `proposedValue` is a substring of the OCR text. If yes -> `PASS`; if not found -> `FLAG` (never auto-fail a user on OCR).

---

## Step-by-Step Implementation Roadmap

1. **Step 1: Document Upload Middleware (Day 1)**
   - Configure Multer with local disk storage and UUID renaming.
   - Enforce file limits: max 5MB, accepted types: `image/jpeg`, `image/png`, `application/pdf`.
   - Build `POST /api/requests/:id/documents`.

2. **Step 2: Secure File Access (Day 2)**
   - Build `GET /api/requests/:id/documents/:docId/download`.
   - Prevent public access to `/uploads/` directly through static Express routing.

3. **Step 3: Verification Engine (Day 3-4)**
   - Write pure function `evaluateRequest({ request, documents })`.
   - Create `POST /api/requests/:id/verify` (or internal function called on submit).
   - Test rule execution with mock payload data.

4. **Step 4: Frontend Verification Inspector Component (Day 5)**
   - Build `<VerificationBadge status="PASS|FLAG|FAIL" />`.
   - Build `<VerificationReport checks={checks} />` showing green checkmarks for PASS, yellow alerts for FLAG, and red icons for FAIL with clear descriptions.
   - Give this component to Member 3 for inclusion in the reviewer interface.

---

## Unit Testing & Verification Checklist
- [ ] Attempt uploading an executable or `.exe`/`.sh` file -> rejected with 400.
- [ ] Attempt uploading >5MB file -> rejected with 413 Payload Too Large.
- [ ] Verification engine produces `FAIL` if no document is attached.
- [ ] Verification engine produces `FLAG` when proposed value differs from database record.