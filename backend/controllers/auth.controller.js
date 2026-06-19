const bcrypt = require("bcryptjs");
const pool = require("../config/db");
const generateToken = require("../utils/generateToken");

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TIME_MINUTES = 15;

// Used to reduce timing difference when email does not exist.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("dummy_password_for_timing", 12);

const VALID_ROLES = [
  "system_admin",
  "insurer_admin",
  "claims_officer",
  "fraud_investigator",
  "provider_user",
  "member",
];

const INSURER_SCOPED_ROLES = [
  "insurer_admin",
  "claims_officer",
  "fraud_investigator",
];


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

function sanitizeCreatedUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    insurerId: user.insurer_id,
    providerId: user.provider_id,
    memberId: user.member_id,
    isActive: Boolean(user.is_active),
    createdAt: user.created_at,
  };
}

function canCreateRole(currentUser, roleToCreate) {
  if (currentUser.role === "system_admin") {
    return true;
  }

  if (currentUser.role === "insurer_admin") {
    return [
      "claims_officer",
      "fraud_investigator",
      "member",
    ].includes(roleToCreate);
  }

  return false;
}

function validateUserScope(role, insurerId, providerId, memberId) {
  if (INSURER_SCOPED_ROLES.includes(role) && !insurerId) {
    return "insurer_id is required for insurer users.";
  }

  if (role === "provider_user" && !providerId) {
    return "provider_id is required for provider users.";
  }

  if (role === "member" && !memberId) {
    return "member_id is required for member users.";
  }

  return null;
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

async function createUser(req, res) {
  try {
    const {
      name,
      email,
      password,
      role,
      insurer_id,
      provider_id,
      member_id,
    } = req.body;

    if (!name || typeof name !== "string") {
      return res.status(400).json({
        message: "Name is required.",
      });
    }

    if (!email || typeof email !== "string") {
      return res.status(400).json({
        message: "Valid email is required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        message: "Valid email is required.",
      });
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters.",
      });
    }

    if (!role || !VALID_ROLES.includes(role)) {
      return res.status(400).json({
        message: "Invalid role.",
        allowed_roles: VALID_ROLES,
      });
    }

    if (!canCreateRole(req.user, role)) {
      return res.status(403).json({
        message: "You do not have permission to create this user type.",
      });
    }

    let finalInsurerId = insurer_id || null;
    let finalProviderId = provider_id || null;
    let finalMemberId = member_id || null;

    /*
      If insurer_admin creates a user,
      force the new user to belong to the same insurer.
    */
    if (req.user.role === "insurer_admin") {
      finalInsurerId = req.user.insurerId || req.user.insurer_id;
      finalProviderId = null;
    }

    /*
      Clean scope based on selected role.
    */
    if (role === "system_admin") {
      finalInsurerId = null;
      finalProviderId = null;
      finalMemberId = null;
    }

    if (INSURER_SCOPED_ROLES.includes(role)) {
      finalProviderId = null;
      finalMemberId = null;
    }

    if (role === "provider_user") {
      finalInsurerId = null;
      finalMemberId = null;
    }

    if (role === "member") {
      finalProviderId = null;
    }

    const scopeError = validateUserScope(
      role,
      finalInsurerId,
      finalProviderId,
      finalMemberId
    );

    if (scopeError) {
      return res.status(400).json({
        message: scopeError,
      });
    }

    const [existingUsers] = await pool.query(
      `
      SELECT id
      FROM app_users
      WHERE email = ?
      LIMIT 1
      `,
      [normalizedEmail]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        message: "A user with this email already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await pool.query(
      `
      INSERT INTO app_users (
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
        token_version,
        password_changed_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, 0, NULL, 0, NOW())
      `,
      [
        name.trim(),
        normalizedEmail,
        passwordHash,
        role,
        finalInsurerId,
        finalProviderId,
        finalMemberId,
      ]
    );

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
        created_at
      FROM app_users
      WHERE id = ?
      LIMIT 1
      `,
      [result.insertId]
    );

    return res.status(201).json({
      message: "User created successfully.",
      user: sanitizeCreatedUser(rows[0]),
    });
  } catch (error) {
    console.error("Create user error:", error);

    return res.status(500).json({
      message: "Failed to create user.",
      error: error.message,
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
  createUser,
  me,
  logout,
  logoutAllDevices,
};