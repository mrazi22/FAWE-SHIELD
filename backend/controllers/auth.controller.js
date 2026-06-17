const bcrypt = require("bcryptjs");
const pool = require("../config/db");
const generateToken = require("../utils/generateToken");

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TIME_MINUTES = 15;

// Used to reduce timing difference when email does not exist.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("dummy_password_for_timing", 12);

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    insurerId: user.insurer_id,
    providerId: user.provider_id,
    memberId: user.member_id,
  };
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (
      !email ||
      !password ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        message: "Invalid email or password.",
      });
    }

    const [rows] = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        password_hash,
        role,
        insurer_id,
        provider_id,
        member_id,
        is_active,
        failed_login_attempts,
        locked_until,
        token_version
      FROM app_users
      WHERE email = ?
      LIMIT 1
      `,
      [normalizedEmail]
    );

    const user = rows[0];

    const passwordHash = user ? user.password_hash : DUMMY_PASSWORD_HASH;

    const passwordMatches = await bcrypt.compare(password, passwordHash);

    // If user does not exist, return generic error.
    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    // Check if account is disabled.
    // Keep message generic to avoid leaking account status.
    if (!user.is_active) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    // Check account lock.
    if (user.locked_until) {
      const lockedUntil = new Date(user.locked_until);
      const now = new Date();

      if (lockedUntil > now) {
        return res.status(429).json({
          message: "Too many failed login attempts. Try again later.",
        });
      }
    }

    // Wrong password.
    if (!passwordMatches) {
      const failedAttempts = Number(user.failed_login_attempts || 0) + 1;

      let lockedUntil = null;

      if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        lockedUntil = new Date(
          Date.now() + LOCK_TIME_MINUTES * 60 * 1000
        );
      }

      await pool.query(
        `
        UPDATE app_users
        SET
          failed_login_attempts = ?,
          locked_until = ?
        WHERE id = ?
        `,
        [
          failedAttempts,
          lockedUntil,
          user.id,
        ]
      );

      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    // Successful login: reset failed attempts.
    await pool.query(
      `
      UPDATE app_users
      SET
        failed_login_attempts = 0,
        locked_until = NULL,
        last_login_at = NOW()
      WHERE id = ?
      `,
      [user.id]
    );

    const token = generateToken(user);

    return res.json({
      message: "Login successful.",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Login failed.",
    });
  }
}

async function me(req, res) {
  return res.json({
    user: req.user,
  });
}

async function logout(req, res) {
  // JWT logout is mostly handled client-side by deleting the token.
  // This endpoint is still useful for Postman/frontend consistency.
  return res.json({
    message: "Logout successful. Remove the token from the client.",
  });
}

async function logoutAllDevices(req, res) {
  try {
    await pool.query(
      `
      UPDATE app_users
      SET token_version = token_version + 1
      WHERE id = ?
      `,
      [req.user.id]
    );

    return res.json({
      message: "Logged out from all devices.",
    });
  } catch (error) {
    console.error("Logout all devices error:", error);

    return res.status(500).json({
      message: "Failed to logout from all devices.",
    });
  }
}

module.exports = {
  login,
  me,
  logout,
  logoutAllDevices,
};