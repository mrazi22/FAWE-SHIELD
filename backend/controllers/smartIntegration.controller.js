const { insertClaim } = require("../services/claimInsert.service");
const { scoreClaimById } = require("../services/faweRisk.service");

async function receiveSmartClaim(req, res) {
  try {
    const client = req.integrationClient;
    const payload = req.body;

    // Tenant validation:
    // If integration client has insurer_id, force the claim to that insurer.
    // This prevents Smart/LCT payloads from spoofing insurer_id.
    const forceInsurerId = client.insurerId || payload.insurer_id;

    if (!forceInsurerId) {
      return res.status(400).json({
        message: "Integration client has no insurer scope and payload has no insurer_id.",
      });
    }

    const claimId = await insertClaim(payload, {
      forceInsurerId,
      forceProviderId: client.providerId || payload.kenya_provider_id,
    });

    const scoringResult = await scoreClaimById(claimId);

    let message = "Claim received, scored, and processed.";

    if (scoringResult.recommendation === "Investigate") {
      message = "Claim received, scored, and flagged for investigation.";
    } else if (scoringResult.recommendation === "Review") {
      message = "Claim received, scored, and sent for review.";
    } else if (scoringResult.claim_status === "Pending Documents") {
      message = "Claim received and pending required documents.";
    }

    return res.status(201).json({
      message,
      source: {
        client_name: client.clientName,
        client_type: client.clientType,
      },
      claim_id: claimId,
      recommendation: scoringResult.recommendation,
      total_risk_score: scoringResult.total_risk_score,
      primary_fawe_type: scoringResult.primary_fawe_type,
      claim_status: scoringResult.claim_status,
      risk_codes: scoringResult.risk_codes,
    });
  } catch (error) {
    console.error("POST /integrations/smart/claims error:", error);

    return res.status(error.statusCode || 500).json({
      message: error.message || "Failed to receive Smart/LCT claim.",
      code: error.code,
      sqlMessage: error.sqlMessage,
    });
  }
}

module.exports = {
  receiveSmartClaim,
};
