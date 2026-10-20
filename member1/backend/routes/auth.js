const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

// ─────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Email and password are required.",
          details: [],
        },
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password.",
          details: [],
        },
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password.",
          details: [],
        },
      });
    }

    // Sign JWT — payload matches the standard in interface_contracts.md
    const payload = {
      _id: user._id.toString(),
      email: user.email,
      role: user.role,
      beneficiaryId: user.beneficiaryId,
      name: user.name,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "24h",
    });

    return res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          beneficiaryId: user.beneficiaryId,
        },
      },
      message: "Login successful.",
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Internal server error.",
        details: [],
      },
    });
  }
});

// ─────────────────────────────────────────────
// GET /api/auth/me  (protected)
// ─────────────────────────────────────────────
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-passwordHash");
    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found or inactive.",
          details: [],
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        beneficiaryId: user.beneficiaryId,
      },
      message: "Session active.",
    });
  } catch (err) {
    console.error("Auth/me error:", err);
    return res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Internal server error.",
        details: [],
      },
    });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────
router.post("/logout", verifyToken, (req, res) => {
  // JWT is stateless — client must discard the token.
  // If using cookies, they can be cleared here.
  return res.status(200).json({
    success: true,
    data: {},
    message: "Logged out successfully. Please discard your token.",
  });
});

module.exports = router;
