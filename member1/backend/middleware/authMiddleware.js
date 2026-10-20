const jwt = require("jsonwebtoken");

/**
 * verifyToken — Extracts & validates JWT from Authorization header.
 * Populates req.user with decoded payload.
 * Exported for use by Members 2, 3, and 4.
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: "NO_TOKEN",
        message: "Access denied. No token provided.",
        details: [],
      },
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid or expired token.",
        details: [],
      },
    });
  }
};

/**
 * requireRole — Ensures the authenticated user has one of the allowed roles.
 * Usage: router.get('/route', verifyToken, requireRole(['admin', 'reviewer']), handler)
 * Exported for use by Members 2, 3, and 4.
 *
 * @param {string[]} roles - Array of allowed roles
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required.",
          details: [],
        },
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: `Access denied. Required role(s): ${roles.join(", ")}. Your role: ${req.user.role}`,
          details: [],
        },
      });
    }

    next();
  };
};

module.exports = { verifyToken, requireRole };
