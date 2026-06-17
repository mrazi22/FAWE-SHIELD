const jwt = require("jsonwebtoken");
const pool = require("../config/db");

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Unauthorized. Missing token.",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: process.env.JWT_ISSUER || "fawe-shield-api",
      audience: process.env.JWT_AUDIENCE || "fawe-shield-client",
    });

    const [rows] = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        role,
        insurer_id,
        provider_id,
        member_id,
        is_active,
        token_version
      FROM app_users
      WHERE id = ?
      LIMIT 1
      `,
      [decoded.userId]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        message: "Unauthorized. User not found.",
      });
    }

    const user = rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        message: "Account is disabled.",
      });
    }

    if (Number(user.token_version || 0) !== Number(decoded.tokenVersion || 0)) {
      return res.status(401).json({
        message: "Token is no longer valid. Please login again.",
      });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      insurerId: user.insurer_id,
      providerId: user.provider_id,
      memberId: user.member_id,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token.",
    });
  }
}

function requireRole(allowedRoles) {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        message: "Unauthorized.",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Forbidden. You do not have permission.",
      });
    }

    next();
  };
}

function requireInsurerScope(req, res, next) {
  if (req.user.role === "system_admin") {
    return next();
  }

  if (!req.user.insurerId) {
    return res.status(403).json({
      message: "Forbidden. Missing insurer scope.",
    });
  }

  next();
}

function requireProviderScope(req, res, next) {
  if (!req.user.providerId) {
    return res.status(403).json({
      message: "Forbidden. Missing provider scope.",
    });
  }

  next();
}

function requireMemberScope(req, res, next) {
  if (!req.user.memberId) {
    return res.status(403).json({
      message: "Forbidden. Missing member scope.",
    });
  }

  next();
}

module.exports = {
  authenticate,
  requireRole,
  requireInsurerScope,
  requireProviderScope,
  requireMemberScope,
};