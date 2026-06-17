const bcrypt = require("bcryptjs");
const pool = require("../config/db");

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

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitizeUser(user) {
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

  if (role === "system_admin") {
    return null;
  }

  return null;
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

    if (!email || typeof email !== "string" || !isValidEmail(email)) {
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

    /**
     * Important:
     * If logged-in user is insurer_admin,
     * force new users to belong to the same insurer.
     */
    if (req.user.role === "insurer_admin") {
      finalInsurerId = req.user.insurerId;
      finalProviderId = null;
    }

    /**
     * Clean up scopes based on role.
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

    const normalizedEmail = email.trim().toLowerCase();

    const [existing] = await pool.query(
      `
      SELECT id
      FROM app_users
      WHERE email = ?
      LIMIT 1
      `,
      [normalizedEmail]
    );

    if (existing.length > 0) {
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
        password_changed_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, NOW())
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
      user: sanitizeUser(rows[0]),
    });
  } catch (error) {
    console.error("Create user error:", error);

    return res.status(500).json({
      message: "Failed to create user.",
    });
  }
}

async function getUsers(req, res) {
  try {
    let sql = `
      SELECT
        id,
        name,
        email,
        role,
        insurer_id,
        provider_id,
        member_id,
        is_active,
        last_login_at,
        created_at
      FROM app_users
    `;

    const params = [];

    if (req.user.role === "insurer_admin") {
      sql += `
        WHERE insurer_id = ?
        AND role IN ('claims_officer', 'fraud_investigator', 'member')
      `;

      params.push(req.user.insurerId);
    }

    sql += `
      ORDER BY created_at DESC
    `;

    const [rows] = await pool.query(sql, params);

    return res.json({
      count: rows.length,
      data: rows.map(sanitizeUser),
    });
  } catch (error) {
    console.error("Get users error:", error);

    return res.status(500).json({
      message: "Failed to fetch users.",
    });
  }
}

module.exports = {
  createUser,
  getUsers,
};