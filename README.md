# 🏛️ Gramin Seva: Rural Scheme Correction Portal

A full-stack, multi-service government scheme correction platform designed for rural welfare programs (**PMAY-G** and **MGNREGS**). Beneficiaries can request corrections with evidence upload, an automated deterministic verification engine flags discrepancies, reviewers evaluate cases side-by-side with automated assistance, and administrators monitor throughput and immutable governance audit trails.

---

## 🏗️ Architecture & Module Breakdown

| Module | Service | Port | Description |
|---|---|---|---|
| **Member 1** | Auth & Beneficiary Portal | `5000` | JWT authentication, session profile, and beneficiary scheme view. |
| **Member 2** | Verification & Document Engine | `5001` | Uploads, secure streaming, and 5-rule automated verification engine. |
| **Member 3** | Workflow & Reviewer Portal | `5002` | Correction request lifecycle (`DRAFT` $\to$ `APPROVED`), reviewer console, atomic updates. |
| **Member 4** | Admin Analytics & Audit Trail | `5003` | Metrics aggregation, append-only immutable audit trail, demo database seeder. |
| **Frontend** | React + Vite Single-Page App | `5173` | Unified portal for Beneficiaries, Reviewers, and Administrators. |

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+)
- MongoDB running locally on `mongodb://127.0.0.1:27017`

### 1. Database Setup & Seed
Populate the initial test accounts, beneficiaries, and audit logs:
```bash
cd member4/backend
npm install
npm run seed
```

### 2. Start the Backend Microservices
Run each backend in its own terminal tab:

```bash
# Member 1 (Auth & Beneficiaries)
cd member1/backend && npm install && npm run dev

# Member 2 (Verification & Documents)
cd member2/backend && npm install && npm run dev

# Member 3 (Workflow & Reviewer)
cd member3/backend && npm install && npm run dev

# Member 4 (Admin Analytics & Audit)
cd member4/backend && npm install && npm run dev
```

### 3. Start the Web Portal
```bash
cd member1/frontend
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 🔑 Demo Credentials (Password: `password123`)

| Role | Email | Direct Portal Link |
|---|---|---|
| **Beneficiary (PMAY-G)** | `beneficiary@example.test` | [Profile & Requests](http://localhost:5173/portal/profile) |
| **Beneficiary (MGNREGS)** | `beneficiary2@example.test` | [Profile & Requests](http://localhost:5173/portal/profile) |
| **Reviewer** | `reviewer@example.test` | [Reviewer Queue](http://localhost:5173/reviewer/queue) |
| **Admin** | `admin@example.test` | [Admin Console](http://localhost:5173/admin) |

---

## 🧪 Testing Suites
Each backend service includes standalone automated test suites:
```bash
cd member1/backend && npm test   # 31/31 passed
cd member2/backend && npm test   # 21/21 passed
cd member3/backend && npm test   # 19/19 passed
cd member4/backend && npm test   # 21/21 passed
```

---

## 📄 License
MIT License — Developed for Gramin Seva initiative.
