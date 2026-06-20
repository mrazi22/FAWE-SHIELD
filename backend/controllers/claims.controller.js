const crypto = require("crypto");
const pool = require("../config/db");
const { scoreClaimById } = require("../services/faweRisk.service");

const VALID_STATUSES = [
  "Submitted",
  "Pending Documents",
  "Under Review",
  "Investigate",
  "Approved",
  "Rejected",
  "Paid",
];

function generateClaimId() {
  return `CLM${crypto.randomInt(100000, 999999)}`;
}

function normalizeBoolean(value) {
  if (value === true || value === 1) return 1;
  if (String(value).toLowerCase() === "true") return 1;
  return 0;
}

function getClaimAccessWhere(user, tableAlias = "") {
  const prefix = tableAlias ? `${tableAlias}.` : "";

  if (user.role === "system_admin") {
    return {
      whereSql: "1 = 1",
      params: [],
    };
  }

  if (
    ["insurer_admin", "claims_officer", "fraud_investigator"].includes(user.role)
  ) {
    return {
      whereSql: `${prefix}insurer_id = ?`,
      params: [user.insurerId],
    };
  }

  if (user.role === "provider_user") {
    return {
      whereSql: `${prefix}kenya_provider_id = ?`,
      params: [user.providerId],
    };
  }

  if (user.role === "member") {
    return {
      whereSql: `${prefix}member_id = ?`,
      params: [user.memberId],
    };
  }

  return {
    whereSql: "1 = 0",
    params: [],
  };
}

async function userCanAccessClaim(claimId, user) {
  const access = getClaimAccessWhere(user);

  const [rows] = await pool.query(
    `
    SELECT claim_id
    FROM fawe_claims
    WHERE claim_id = ?
      AND ${access.whereSql}
    LIMIT 1
    `,
    [claimId, ...access.params]
  );

  return rows.length > 0;
}

async function getClaims(req, res) {
  try {
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 200);
    const offset = (page - 1) * limit;

    const access = getClaimAccessWhere(req.user);

    const filters = [`${access.whereSql}`];
    const params = [...access.params];

    if (req.query.recommendation) {
      filters.push("recommendation = ?");
      params.push(req.query.recommendation);
    }

    if (req.query.claim_status) {
      filters.push("claim_status = ?");
      params.push(req.query.claim_status);
    }

    if (req.query.claim_type) {
      filters.push("claim_type = ?");
      params.push(req.query.claim_type);
    }

    if (req.query.primary_fawe_type) {
      filters.push("primary_fawe_type = ?");
      params.push(req.query.primary_fawe_type);
    }

    if (req.query.provider) {
      filters.push("(kenya_provider_id LIKE ? OR provider_name LIKE ?)");
      const providerValue = `%${req.query.provider}%`;
      params.push(providerValue, providerValue);
    }

    if (req.query.insurer) {
      filters.push("(insurer_id LIKE ? OR insurer_name LIKE ?)");
      const insurerValue = `%${req.query.insurer}%`;
      params.push(insurerValue, insurerValue);
    }

    if (req.query.search) {
      filters.push(
        `(claim_id LIKE ? OR member_id LIKE ? OR provider_name LIKE ? OR diagnosis LIKE ?)`
      );

      const searchValue = `%${req.query.search}%`;

      params.push(searchValue, searchValue, searchValue, searchValue);
    }

    const whereSql = filters.join(" AND ");

    const [countRows] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM fawe_claims
      WHERE ${whereSql}
      `,
      params
    );

    const [rows] = await pool.query(
      `
      SELECT
        claim_id,
        insurer_id,
        insurer_name,
        scheme_name,
        member_id,
        member_card_no,
        member_name,
        member_mobile,
        kenya_provider_id,
        provider_name,
        county,
        provider_type,
        claim_type,
        claim_start_date,
        claim_end_date,
        diagnosis,
        plan_type,
        claim_amount,
        uploaded_documents,
        missing_documents,
        invoice_no,
        etims_receipt_no,
        etims_invoice_reference,
        etims_verified,
        fraud_score,
        abuse_score,
        waste_score,
        error_score,
        total_risk_score,
        primary_fawe_type,
        recommendation,
        claim_status,
        risk_reasons,
        recommended_action,
        estimated_savings
      FROM fawe_claims
      WHERE ${whereSql}
      ORDER BY total_risk_score DESC, claim_start_date DESC
      LIMIT ? OFFSET ?
      `,
      [...params, limit, offset]
    );

    return res.json({
      page,
      limit,
      total: Number(countRows[0].total || 0),
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error("GET /claims error:", error);

    return res.status(500).json({
      message: "Failed to fetch claims.",
    });
  }
}
async function getClaimFilterOptions(req, res) {
  try {
    const access = getClaimAccessWhere(req.user);

    const [providerRows] = await pool.query(
      `
      SELECT DISTINCT
        kenya_provider_id,
        provider_name
      FROM fawe_claims
      WHERE ${access.whereSql}
        AND kenya_provider_id IS NOT NULL
        AND kenya_provider_id <> ''
      ORDER BY provider_name ASC
      LIMIT 500
      `,
      access.params
    );

    const [insurerRows] = await pool.query(
      `
      SELECT DISTINCT
        insurer_id,
        insurer_name
      FROM fawe_claims
      WHERE ${access.whereSql}
        AND insurer_id IS NOT NULL
        AND insurer_id <> ''
      ORDER BY insurer_name ASC
      LIMIT 200
      `,
      access.params
    );

    return res.json({
      providers: providerRows.map((provider) => ({
        id: provider.kenya_provider_id,
        name: provider.provider_name,
      })),
      insurers: insurerRows.map((insurer) => ({
        id: insurer.insurer_id,
        name: insurer.insurer_name,
      })),
    });
  } catch (error) {
    console.error("GET /claims/filter-options error:", error);

    return res.status(500).json({
      message: "Failed to fetch claim filter options.",
    });
  }
}

async function getClaimById(req, res) {
  try {
    const { claimId } = req.params;

    const access = getClaimAccessWhere(req.user, "c");

    const [claimRows] = await pool.query(
      `
      SELECT c.*
      FROM fawe_claims c
      WHERE c.claim_id = ?
        AND ${access.whereSql}
      LIMIT 1
      `,
      [claimId, ...access.params]
    );

    if (claimRows.length === 0) {
      return res.status(404).json({
        message: "Claim not found or access denied.",
      });
    }

    const [eventRows] = await pool.query(
      `
      SELECT
        id,
        claim_id,
        risk_code,
        category,
        points,
        message,
        recommended_action
      FROM fawe_claim_events
      WHERE claim_id = ?
      ORDER BY points DESC, id ASC
      `,
      [claimId]
    );

    return res.json({
      claim: claimRows[0],
      risk_codes: eventRows.map((event) => ({
        id: event.id,
        code: event.risk_code,
        category: event.category,
        message: event.message,
        points: event.points,
        recommended_action: event.recommended_action,
      })),
    });
  } catch (error) {
    console.error("GET /claims/:claimId error:", error);

    return res.status(500).json({
      message: "Failed to fetch claim.",
    });
  }
}

async function createClaim(req, res) {
  try {
    const body = req.body;

    const requiredFields = [
      "member_id",
      "kenya_provider_id",
      "provider_name",
      "claim_type",
      "claim_start_date",
      "claim_end_date",
      "diagnosis",
      "claim_amount",
    ];

    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null || body[field] === "") {
        return res.status(400).json({
          message: `${field} is required.`,
        });
      }
    }

    const claimType = String(body.claim_type);

    if (!["Inpatient", "Outpatient"].includes(claimType)) {
      return res.status(400).json({
        message: "claim_type must be either Inpatient or Outpatient.",
      });
    }

    let insurerId = body.insurer_id || null;
    let providerId = body.kenya_provider_id;

    if (req.user.role === "system_admin") {
      if (!insurerId) {
        return res.status(400).json({
          message: "insurer_id is required for system_admin claim creation.",
        });
      }
    }

    if (
      ["insurer_admin", "claims_officer", "fraud_investigator"].includes(req.user.role)
    ) {
      insurerId = req.user.insurerId;
    }

    if (req.user.role === "provider_user") {
      providerId = req.user.providerId;

      // Provider users do not have insurer scope in the current design.
      // For the hackathon simulation, insurer_id is accepted here.
      // In production, validate this against a provider-insurer mapping table.
      if (!insurerId) {
        return res.status(400).json({
          message: "insurer_id is required when provider_user submits a claim.",
        });
      }
    }

    const claimId = body.claim_id || generateClaimId();

    const [existing] = await pool.query(
      `
      SELECT claim_id
      FROM fawe_claims
      WHERE claim_id = ?
      LIMIT 1
      `,
      [claimId]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        message: "Claim ID already exists.",
      });
    }

    await pool.query(
      `
      INSERT INTO fawe_claims (
        claim_id,
        insurer_id,
        insurer_name,
        scheme_name,
        member_id,
        member_card_no,
        member_name,
        member_mobile,
        member_email,
        sms_opt_in,
        kenya_provider_id,
        provider_name,
        provider_mobile,
        county,
        provider_type,
        claim_type,
        claim_start_date,
        claim_end_date,
        diagnosis,
        plan_type,
        claim_amount,
        uploaded_documents,
        missing_documents,
        claim_form_no,
        authorization_no,
        invoice_no,
        etims_receipt_no,
        etims_invoice_reference,
        etims_verified,
        provider_avg_claim,
        member_claims_last_30_days,
        same_diagnosis_recent_count,
        provider_claims_same_day,
        possible_duplicate_claim,
        invoice_reused,
        fraud_label,
        fraud_score,
        abuse_score,
        waste_score,
        error_score,
        total_risk_score,
        primary_fawe_type,
        fraud_flag,
        abuse_flag,
        waste_flag,
        error_flag,
        recommendation,
        claim_status,
        risk_reasons,
        recommended_action,
        estimated_savings,
        created_at,
        updated_at
      )
      VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, NOW(), NOW()
      )
      `,
      [
        claimId,
        insurerId,
        body.insurer_name || "",
        body.scheme_name || "",
        body.member_id,
        body.member_card_no || "",
        body.member_name || "",
        body.member_mobile || "",
        body.member_email || "",
        normalizeBoolean(body.sms_opt_in),
        providerId,
        body.provider_name,
        body.provider_mobile || "",
        body.county || "",
        body.provider_type || "",
        claimType,
        body.claim_start_date,
        body.claim_end_date,
        body.diagnosis,
        body.plan_type || "",
        Number(body.claim_amount),
        body.uploaded_documents || "",
        body.missing_documents || "",
        body.claim_form_no || "",
        body.authorization_no || "",
        body.invoice_no || "",
        body.etims_receipt_no || "",
        body.etims_invoice_reference || "",
        normalizeBoolean(body.etims_verified),
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        "Clean",
        0,
        0,
        0,
        0,
        "Approve",
        "Submitted",
        "",
        "",
        0,
      ]
    );

    const scoringResult = await scoreClaimById(claimId);

    return res.status(201).json({
      message: "Claim created and scored successfully.",
      claim_id: claimId,
      scoring: scoringResult,
    });
  } catch (error) {
    console.error("POST /claims error:", error);

    return res.status(500).json({
      message: "Failed to create claim.",
    });
  }
}

async function updateClaimStatus(req, res) {
  try {
    const { claimId } = req.params;
    const { claim_status } = req.body;

    if (!VALID_STATUSES.includes(claim_status)) {
      return res.status(400).json({
        message: "Invalid claim_status.",
        allowed_statuses: VALID_STATUSES,
      });
    }

    const canAccess = await userCanAccessClaim(claimId, req.user);

    if (!canAccess) {
      return res.status(404).json({
        message: "Claim not found or access denied.",
      });
    }

    await pool.query(
      `
      UPDATE fawe_claims
      SET
        claim_status = ?,
        updated_at = NOW()
      WHERE claim_id = ?
      `,
      [claim_status, claimId]
    );

    return res.json({
      message: "Claim status updated successfully.",
      claim_id: claimId,
      claim_status,
    });
  } catch (error) {
    console.error("PATCH /claims/:claimId/status error:", error);

    return res.status(500).json({
      message: "Failed to update claim status.",
    });
  }
}

async function scoreClaim(req, res) {
  try {
    const { claimId } = req.params;

    const canAccess = await userCanAccessClaim(claimId, req.user);

    if (!canAccess) {
      return res.status(404).json({
        message: "Claim not found or access denied.",
      });
    }

    const result = await scoreClaimById(claimId);

    return res.json(result);
  } catch (error) {
    console.error("POST /claims/:claimId/score error:", error);

    return res.status(error.statusCode || 500).json({
      message: error.message || "Failed to score claim.",
    });
  }
}

module.exports = {
  getClaims,
  getClaimById,
  getClaimFilterOptions,
  createClaim,
  updateClaimStatus,
  scoreClaim,
};
