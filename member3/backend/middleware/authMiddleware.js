const jwt = require("jsonwebtoken");

/**
 * verifyToken — extracts JWT, validates, binds req.user
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: "NO_TOKEN", message: "Access denied. No token provided.", details: [] },
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: { code: "INVALID_TOKEN", message: "Invalid or expired token.", details: [] },
    });
  }
};

/**
 * requireRole — ensures req.user.role is inside allowed roles
 */
const requireRole = (roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required.", details: [] },
    });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: {
        code: "FORBIDDEN",
        message: `Access denied. Required: ${roles.join(", ")}. Your role: ${req.user.role}`,
        details: [],
      },
    });
  }
  next();
};

module.exports = { verifyToken, requireRole };
