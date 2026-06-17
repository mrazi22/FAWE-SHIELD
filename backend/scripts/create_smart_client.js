require("dotenv").config();

const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const pool = require("../config/db");

async function createSmartClient() {
  try {
    const clientName = process.env.SMART_CLIENT_NAME || "Smart/LCT Demo Client";
    const clientType = process.env.SMART_CLIENT_TYPE || "smart";
    const insurerId = process.env.SMART_CLIENT_INSURER_ID || "INS001";
    const providerId = process.env.SMART_CLIENT_PROVIDER_ID || null;

    const apiKey = `fawe_${crypto.randomBytes(32).toString("hex")}`;
    const apiKeyHash = await bcrypt.hash(apiKey, 12);

    await pool.query(
      `
      INSERT INTO integration_clients (
        client_name,
        client_type,
        api_key_hash,
        insurer_id,
        provider_id,
        is_active
      )
      VALUES (?, ?, ?, ?, ?, TRUE)
      `,
      [
        clientName,
        clientType,
        apiKeyHash,
        insurerId,
        providerId,
      ]
    );

    console.log("Smart/LCT integration client created.");
    console.log("Client name:", clientName);
    console.log("Client type:", clientType);
    console.log("Insurer ID:", insurerId);
    console.log("Provider ID:", providerId || "none");
    console.log("");
    console.log("IMPORTANT: Copy this API key now. It will not be shown again.");
    console.log("API Key:", apiKey);

    process.exit(0);
  } catch (error) {
    console.error("Failed to create Smart/LCT integration client:", error);
    process.exit(1);
  }
}

createSmartClient();
