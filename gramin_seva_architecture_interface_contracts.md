# Gramin Seva: Interface Contracts & Shared Specifications

To allow all 4 members to develop simultaneously without blocker dependencies, strict adherence to these shared contracts (data shapes, status codes, JWT claims, and endpoint specifications) is required.

---

## 1. Shared Enums & Constants

```typescript
export enum SchemeType {
  PMAY_G = "PMAY_G",
  MGNREGS = "MGNREGS"
}

export enum UserRole {
  BENEFICIARY = "beneficiary",
  REVIEWER = "reviewer",
  ADMIN = "admin"
}

export enum RequestStatus {
  DRAFT = "DRAFT",
  SUBMITTED = "SUBMITTED",
  UNDER_REVIEW = "UNDER_REVIEW",
  NEEDS_INFO = "NEEDS_INFO",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED"
}

export enum CheckStatus {
  PASS = "PASS",
  FLAG = "FLAG",
  FAIL = "FAIL"
}

export const ALLOWED_FIELDS: Record<SchemeType, string[]> = {
  [SchemeType.PMAY_G]: ["name", "village", "district", "contactNumber"],
  [SchemeType.MGNREGS]: ["jobCardHolderName", "village", "gramPanchayat", "contactNumber"]
};
```

---

## 2. Global API Response & Error Wrapper

All endpoints must return JSON conforming to this envelope:

### Success Response Envelope
```json
{
  "success": true,
  "data": {},
  "message": "Optional user-friendly message"
}
```

### Error Response Envelope
```json
{
  "success": false,
  "error": {
    "code": "INVALID_TRANSITION",
    "message": "Cannot move request directly from DRAFT to APPROVED",
    "details": []
  }
}
```

---

## 3. JWT Token Payload Standard (Managed by Member 1)

Every request to a protected route will supply `Authorization: Bearer <token>`. Member 1 provides an Express middleware (`authenticateUser`) that populates `req.user`:

```json
{
  "_id": "65f000000000000000000001",
  "email": "beneficiary@example.test",
  "role": "beneficiary",
  "beneficiaryId": "DEMO-1001",
  "name": "Ramesh Kumar",
  "iat": 1710000000,
  "exp": 1710086400
}
```

---

## 4. Database Schema Specifications (Mongoose)

### 4.1 Collection: `users` (Owner: Member 1)
```javascript
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["beneficiary", "reviewer", "admin"], required: true },
  beneficiaryId: { type: String, default: null }, // Linked demo ID for beneficiaries
  isActive: { type: Boolean, default: true }
}, { timestamps: true });
```

### 4.2 Collection: `beneficiaries` (Owner: Member 1 & Seed)
```javascript
const BeneficiarySchema = new mongoose.Schema({
  beneficiaryId: { type: String, required: true, unique: true },
  scheme: { type: String, enum: ["PMAY_G", "MGNREGS"], required: true },
  // Common & Scheme specific fields
  name: { type: String, required: true },
  village: { type: String, required: true },
  district: { type: String, required: true },
  gramPanchayat: { type: String },
  contactNumber: { type: String },
  jobCardHolderName: { type: String },
  recordVersion: { type: Number, default: 1 }
}, { timestamps: true });
```

### 4.3 Collection: `correctionrequests` (Owner: Member 3)
```javascript
const CorrectionRequestSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true }, // e.g. "CR-DEMO-0001"
  beneficiaryId: { type: String, required: true, index: true },
  scheme: { type: String, enum: ["PMAY_G", "MGNREGS"], required: true },
  field: { type: String, required: true },
  oldValue: { type: String, required: true },
  proposedValue: { type: String, required: true },
  reason: { type: String, required: true },
  status: { 
    type: String, 
    enum: ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "NEEDS_INFO", "APPROVED", "REJECTED"], 
    default: "DRAFT",
    index: true 
  },
  assignedReviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  decisionReason: { type: String, default: null }
}, { timestamps: true });
```

### 4.4 Collection: `documents` (Owner: Member 2)
```javascript
const DocumentSchema = new mongoose.Schema({
  requestId: { type: String, required: true, index: true },
  originalName: { type: String, required: true },
  storageKey: { type: String, required: true }, // Local path or UUID
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  verificationStatus: { type: String, enum: ["PENDING", "VERIFIED", "FLAGGED"], default: "PENDING" }
}, { timestamps: true });
```

### 4.5 Collection: `verificationresults` (Owner: Member 2)
```javascript
const VerificationResultSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true },
  overallStatus: { type: String, enum: ["PASS", "FLAG", "FAIL"], required: true },
  checks: [{
    name: { type: String, required: true }, // e.g., "required_fields", "document_attached"
    status: { type: String, enum: ["PASS", "FLAG", "FAIL"], required: true },
    message: { type: String, required: true }
  }],
  ocrExtractedText: { type: String, default: null }
}, { timestamps: true });
```

### 4.6 Collection: `auditlogs` (Owner: Member 4)
```javascript
const AuditLogSchema = new mongoose.Schema({
  requestId: { type: String, required: true, index: true },
  actorId: { type: String, required: true }, // ObjectId or user email
  actorRole: { type: String, required: true },
  action: { type: String, required: true }, // e.g., "SUBMIT_REQUEST", "REQUEST_APPROVED"
  reason: { type: String },
  meta: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });
```

---

## 5. Mock Data Fixtures for Independent Development

Save these into a common mock folder (`/mock-data/`) so frontend and backend developers can mock dependent responses locally.

### Mock Beneficiary Profile (`GET /api/beneficiaries/me`)
```json
{
  "beneficiaryId": "DEMO-1001",
  "scheme": "PMAY_G",
  "name": "Ramesh Kumar",
  "village": "Demo Village",
  "district": "Demo District",
  "gramPanchayat": "Demo GP",
  "contactNumber": "9876543210",
  "recordVersion": 1
}
```

### Mock Verification Result (`GET /api/requests/:id/verification`)
```json
{
  "requestId": "CR-DEMO-0001",
  "overallStatus": "FLAG",
  "checks": [
    {
      "name": "mandatory_fields",
      "status": "PASS",
      "message": "All required fields are present"
    },
    {
      "name": "document_attached",
      "status": "PASS",
      "message": "Supporting document found (1 file)"
    },
    {
      "name": "ocr_consistency",
      "status": "FLAG",
      "message": "Extracted text 'Ramesh Kumar' does not match proposed 'Ramesh Kumarr' - needs reviewer inspection."
    }
  ],
  "ocrExtractedText": "GOVERNMENT OF INDIA - ID: DEMO-1001 - Name: Ramesh Kumar"
}
```