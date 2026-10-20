require("dotenv").config();
const express  = require("express");
const mongoose = require("mongoose");
const cors     = require("cors");
const path     = require("path");

const documentRoutes     = require("./routes/documents");
const verificationRoutes = require("./routes/verification");

const app      = express();
const PORT     = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/gramin_seva";

// ── Middleware ─────────────────────────────────────
app.use(cors({ origin: ["http://localhost:5173", "http://localhost:5000"], credentials: true }));
app.use(express.json());

// NOTE: We do NOT serve /uploads as static — all file access goes through the
// authenticated download endpoint to enforce access control.

// ── Routes ─────────────────────────────────────────
// mergeParams: true on routers allows :id to flow through
app.use("/api/requests/:id/documents",    documentRoutes);
app.use("/api/requests/:id/verification", verificationRoutes);

// ── Health ──────────────────────────────────────────
app.get("/api/health", (req, res) =>
  res.json({ success: true, data: { status: "OK", service: "Gramin Seva API - Member 2 (Document & Verification Engine)" }, message: "Server is running." })
);

// ── 404 ─────────────────────────────────────────────
app.use((req, res) =>
  res.status(404).json({
    success: false,
    error: { code: "NOT_FOUND", message: `Route ${req.method} ${req.path} not found.`, details: [] },
  })
);

// ── Global Error ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: { code: "SERVER_ERROR", message: "Internal server error.", details: [] },
  });
});

// ── Connect & Start ──────────────────────────────────
mongoose.connect(MONGO_URI).then(() => {
  console.log("✅ MongoDB connected:", MONGO_URI);
  app.listen(PORT, () => {
    console.log(`🚀 Member 2 API running on http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
  });
}).catch((err) => {
  console.error("❌ MongoDB connection failed:", err.message);
  process.exit(1);
});

module.exports = app;
