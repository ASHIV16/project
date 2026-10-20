require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const beneficiaryRoutes = require("./routes/beneficiary");

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/gramin_seva";

// ── Middleware ────────────────────────────────
app.use(cors({ origin: "http://localhost:5173", credentials: true })); // Vite frontend
app.use(express.json());

// ── Routes ────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/beneficiaries", beneficiaryRoutes);

// ── Health Check ──────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ success: true, data: { status: "OK", service: "Gramin Seva API - Member 1" }, message: "Server is running." });
});

// ── 404 Handler ───────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: "NOT_FOUND", message: `Route ${req.method} ${req.path} not found.`, details: [] },
  });
});

// ── Global Error Handler ──────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: { code: "SERVER_ERROR", message: "Internal server error.", details: [] },
  });
});

// ── Connect DB & Start ────────────────────────
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected:", MONGO_URI);
    app.listen(PORT, () => {
      console.log(`🚀 Gramin Seva API running on http://localhost:${PORT}`);
      console.log(`   Health: http://localhost:${PORT}/api/health`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });

module.exports = app;
