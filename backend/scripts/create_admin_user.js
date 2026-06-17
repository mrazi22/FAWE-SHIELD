require("dotenv").config();

const bcrypt = require("bcryptjs");
const pool = require("../config/db");

async function createAdminUser() {
  try {
    const name = "Simon Admin";
    const email = "simon@gmail.com";
    const password = "Admin@12345";

    const role = "system_admin";

    const passwordHash = await bcrypt.hash(password, 12);

    const [existing] = await pool.query(
      `
      SELECT id
      FROM app_users
      WHERE email = ?
      LIMIT 1
      `,
      [email.toLowerCase()]
    );

    if (existing.length > 0) {
      console.log("User already exists:", email);
      process.exit(0);
    }

    await pool.query(
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
        name,
        email.toLowerCase(),
        passwordHash,
        role,
        null,
        null,
        null,
      ]
    );

    console.log("Admin user created successfully.");
    console.log("Email:", email);
    console.log("Password:", password);
    console.log("Role:", role);

    process.exit(0);
  } catch (error) {
    console.error("Failed to create admin user:", error);
    process.exit(1);
  }
}

createAdminUser();