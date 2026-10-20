# Gramin Seva: Team Workflow & Step-by-Step Execution Guide

This document establishes the collaboration rules, shared folder layout, Git strategy, and integration milestones to ensure team members work concurrently without blocking each other.

---

## 1. Project Directory Structure

```text
gramin-seva/
├── contracts.md                  # Shared API and Schema specification
├── client/                       # React + Vite frontend
│   ├── src/
│   │   ├── api/                  # Modular API clients (auth.js, requests.js, etc.)
│   │   ├── components/           # Reusable UI (Navbar, Badges, Modals)
│   │   ├── context/              # AuthContext, NotificationContext
│   │   ├── pages/
│   │   │   ├── beneficiary/      # Member 1 screens
│   │   │   ├── reviewer/         # Member 3 screens
│   │   │   └── admin/            # Member 4 screens
│   │   └── App.jsx
├── server/                       # Node.js + Express backend
│   ├── config/                   # db.js, environment checks
│   ├── middleware/               # authMiddleware.js, uploadMiddleware.js
│   ├── models/                   # Mongoose schemas (User, Request, Document, etc.)
│   ├── routes/
│   │   ├── authRoutes.js         # Member 1
│   │   ├── beneficiaryRoutes.js  # Member 1
│   │   ├── documentRoutes.js     # Member 2
│   │   ├── requestRoutes.js      # Member 3
│   │   └── adminRoutes.js        # Member 4
│   ├── services/
│   │   ├── verificationEngine.js # Member 2
│   │   └── auditService.js       # Member 4
│   ├── seed.js                   # Member 4 synthetic seeder
│   └── server.js                 # App entrypoint
└── uploads/
    └── private/                  # Local storage for sample documents
```

---

## 2. Git Branching Strategy

- **`main`**: Only stable, demonstrated code. Protected branch.
- **`develop`**: Integration target for pull requests.
- **Feature Branches**:
  - `feat/m1-auth-beneficiary` (Member 1)
  - `feat/m2-verification-documents` (Member 2)
  - `feat/m3-requests-approval` (Member 3)
  - `feat/m4-admin-audit-integration` (Member 4)

---

## 3. Daily Implementation Checklist

| Day | Focus | Milestone Target |
| :--- | :--- | :--- |
| **Day 1** | Foundation | Member 4 sets up repo & seeds; Member 1 finishes auth; Member 2 sets up Multer; Member 3 designs models. |
| **Day 2** | Modules | Member 1 builds Profile API; Member 2 builds Document upload; Member 3 builds Request Draft/Submit; Member 4 builds Audit logger. |
| **Day 3** | Logic & Rules | Member 2 completes Verification Engine; Member 3 implements Approve/Reject transitions and beneficiary updates. |
| **Day 4** | Interfaces | Members 1, 3, 4 construct their respective UI dashboards; Member 2 supplies verification preview components. |
| **Day 5** | Integration | Merge into `develop`; execute the 8-step demo scenario; patch UI edge cases. |

---

## 4. End-to-End Demo Script (Rehearsal Checklist)

1. **Seed**: Run `node server/seed.js` to ensure a clean state.
2. **Beneficiary Login**: Sign in as `beneficiary@example.test`.
3. **Inspect Profile**: Show current name "Ramesh Kumar" under PMAY-G.
4. **Initiate Correction**: Submit a correction for `name` to "Ramesh Kumarr", select reason, and attach sample proof `aadhaar_sample.png`.
5. **Observe Verification**: Show automated flags indicating the value changed and awaits human inspection.
6. **Reviewer Login**: Log in as `reviewer@example.test`. Open Reviewer Queue.
7. **Inspect & Approve**: View old vs. new values side by side, inspect document preview, verify checks, click **Approve**.
8. **Verify Reflection**:
   - Re-open Beneficiary Profile: Name is now updated to "Ramesh Kumarr" with `recordVersion: 2`.
   - Log in as Admin (`admin@example.test`): Check total approvals incremented on charts and review the immutable entry in the Audit Log.