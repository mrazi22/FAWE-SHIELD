const bcrypt = require("bcryptjs");
const pool = require("../config/db");

async function authenticateIntegrationClient(req, res, next) {
  try {
    const apiKey =
      req.headers["x-api-key"] ||
      req.headers["x-fawe-api-key"] ||
      "";

    if (!apiKey) {
      return res.status(401).json({
        message: "Missing integration API key.",
      });
    }

    const [clients] = await pool.query(
      `
      SELECT
        id,
        client_name,
        client_type,
        api_key_hash,
        insurer_id,
        provider_id,
        is_active
      FROM integration_clients
      WHERE is_active = TRUE
      `
    );

    let matchedClient = null;

    for (const client of clients) {
      const matches = await bcrypt.compare(String(apiKey), client.api_key_hash);

      if (matches) {
        matchedClient = client;
        break;
      }
    }

    if (!matchedClient) {
      return res.status(401).json({
        message: "Invalid integration API key.",
      });
    }

    req.integrationClient = {
      id: matchedClient.id,
      clientName: matchedClient.client_name,
      clientType: matchedClient.client_type,
      insurerId: matchedClient.insurer_id,
      providerId: matchedClient.provider_id,
    };

    next();
  } catch (error) {
    console.error("Integration auth error:", error);

    return res.status(500).json({
      message: "Failed to authenticate integration client.",
    });
  }
}

module.exports = {
  authenticateIntegrationClient,
};
