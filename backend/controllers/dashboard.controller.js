const pool = require("../config/db");

function getDashboardScope(user, tableAlias = "") {
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

  return {
    whereSql: "1 = 0",
    params: [],
  };
}

async function getSummary(req, res) {
  try {
    const scope = getDashboardScope(req.user);

    const [summaryRows] = await pool.query(
      `
      SELECT
        COUNT(*) AS claims_processed,
        SUM(claim_amount) AS total_claim_amount,
        AVG(total_risk_score) AS avg_risk_score,
        SUM(CASE WHEN total_risk_score >= 70 THEN 1 ELSE 0 END) AS high_risk_claims,
        SUM(CASE WHEN recommendation = 'Approve' THEN 1 ELSE 0 END) AS approve_claims,
        SUM(CASE WHEN recommendation = 'Approve with Notes' THEN 1 ELSE 0 END) AS approve_with_notes_claims,
        SUM(CASE WHEN recommendation = 'Review' THEN 1 ELSE 0 END) AS review_claims,
        SUM(CASE WHEN recommendation = 'Investigate' THEN 1 ELSE 0 END) AS investigate_claims,
        SUM(CASE WHEN claim_status = 'Paid' THEN 1 ELSE 0 END) AS paid_claims,
        SUM(CASE WHEN claim_status = 'Rejected' THEN 1 ELSE 0 END) AS rejected_claims,
        SUM(estimated_savings) AS potential_savings
      FROM fawe_claims
      WHERE ${scope.whereSql}
      `,
      scope.params
    );

    const [recommendationRows] = await pool.query(
      `
      SELECT
        recommendation,
        COUNT(*) AS total
      FROM fawe_claims
      WHERE ${scope.whereSql}
      GROUP BY recommendation
      ORDER BY total DESC
      `,
      scope.params
    );

    const [statusRows] = await pool.query(
      `
      SELECT
        claim_status,
        COUNT(*) AS total
      FROM fawe_claims
      WHERE ${scope.whereSql}
      GROUP BY claim_status
      ORDER BY total DESC
      `,
      scope.params
    );

    const summary = summaryRows[0] || {};

    return res.json({
      scope: {
        role: req.user.role,
        insurerId: req.user.insurerId || null,
        providerId: req.user.providerId || null,
      },
      summary: {
        claims_processed: Number(summary.claims_processed || 0),
        total_claim_amount: Number(summary.total_claim_amount || 0),
        avg_risk_score: Number(summary.avg_risk_score || 0),
        high_risk_claims: Number(summary.high_risk_claims || 0),
        approve_claims: Number(summary.approve_claims || 0),
        approve_with_notes_claims: Number(summary.approve_with_notes_claims || 0),
        review_claims: Number(summary.review_claims || 0),
        investigate_claims: Number(summary.investigate_claims || 0),
        paid_claims: Number(summary.paid_claims || 0),
        rejected_claims: Number(summary.rejected_claims || 0),
        potential_savings: Number(summary.potential_savings || 0),
      },
      recommendation_breakdown: recommendationRows,
      status_breakdown: statusRows,
    });
  } catch (error) {
    console.error("GET /dashboard/summary error:", error);

    return res.status(500).json({
      message: "Failed to fetch dashboard summary.",
    });
  }
}

async function getFaweBreakdown(req, res) {
   
  try {

    console.time("fawe-breakdown");

    // existing queries here

    console.timeEnd("fawe-breakdown");
    const scope = getDashboardScope(req.user, "c");

    const [rows] = await pool.query(
      `
      SELECT
        e.category,
        COUNT(*) AS total_events,
        COUNT(DISTINCT e.claim_id) AS affected_claims,
        SUM(e.points) AS total_points
      FROM fawe_claim_events e
      JOIN fawe_claims c
        ON c.claim_id = e.claim_id
      WHERE ${scope.whereSql}
      GROUP BY e.category
      ORDER BY total_events DESC
      `,
      scope.params
    );

    const [riskCodeRows] = await pool.query(
      `
      SELECT
        e.risk_code,
        e.category,
        COUNT(*) AS total_events,
        COUNT(DISTINCT e.claim_id) AS affected_claims,
        AVG(e.points) AS avg_points
      FROM fawe_claim_events e
      JOIN fawe_claims c
        ON c.claim_id = e.claim_id
      WHERE ${scope.whereSql}
      GROUP BY e.risk_code, e.category
      ORDER BY total_events DESC
      LIMIT 20
      `,
      scope.params
    );

    return res.json({
      scope: {
        role: req.user.role,
        insurerId: req.user.insurerId || null,
        providerId: req.user.providerId || null,
      },
      category_breakdown: rows,
      top_risk_codes: riskCodeRows,
    });
  } catch (error) {
    console.error("GET /dashboard/fawe-breakdown error:", error);

    return res.status(500).json({
      message: "Failed to fetch FAWE breakdown.",
    });
  }
}

async function getProviderRisk(req, res) {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 100);

    const scope = getDashboardScope(req.user);

    const [rows] = await pool.query(
      `
      SELECT
        provider_name,
        kenya_provider_id,
        county,
        provider_type,
        COUNT(*) AS total_claims,
        SUM(claim_amount) AS total_claim_amount,
        AVG(total_risk_score) AS avg_risk_score,
        SUM(CASE WHEN recommendation = 'Investigate' THEN 1 ELSE 0 END) AS investigate_claims,
        SUM(CASE WHEN recommendation = 'Review' THEN 1 ELSE 0 END) AS review_claims,
        SUM(estimated_savings) AS estimated_savings
      FROM fawe_claims
      WHERE ${scope.whereSql}
      GROUP BY
        provider_name,
        kenya_provider_id,
        county,
        provider_type
      ORDER BY avg_risk_score DESC, estimated_savings DESC
      LIMIT ?
      `,
      [...scope.params, limit]
    );

    return res.json({
      scope: {
        role: req.user.role,
        insurerId: req.user.insurerId || null,
        providerId: req.user.providerId || null,
      },
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error("GET /dashboard/provider-risk error:", error);

    return res.status(500).json({
      message: "Failed to fetch provider risk.",
    });
  }
}

async function getLossRatio(req, res) {
  try {
    const scope = getDashboardScope(req.user);

    const [rows] = await pool.query(
      `
      SELECT
        COUNT(*) AS claims_processed,
        SUM(claim_amount) AS gross_claims_cost,
        SUM(estimated_savings) AS estimated_savings,
        SUM(claim_amount) - SUM(estimated_savings) AS net_claims_cost_after_fawe
      FROM fawe_claims
      WHERE ${scope.whereSql}
      `,
      scope.params
    );

    const data = rows[0] || {};

    const grossClaimsCost = Number(data.gross_claims_cost || 0);
    const estimatedSavings = Number(data.estimated_savings || 0);
    const netClaimsCostAfterFawe = Number(data.net_claims_cost_after_fawe || 0);

    // For hackathon/demo use.
    // In a real insurer setup, premium_base should come from policy/premium data.
    const premiumBase = Number(req.query.premium_base || grossClaimsCost * 1.25 || 1);

    const lossRatioBeforeFawe = premiumBase > 0
      ? grossClaimsCost / premiumBase
      : 0;

    const lossRatioAfterFawe = premiumBase > 0
      ? netClaimsCostAfterFawe / premiumBase
      : 0;

    return res.json({
      scope: {
        role: req.user.role,
        insurerId: req.user.insurerId || null,
        providerId: req.user.providerId || null,
      },
      claims_processed: Number(data.claims_processed || 0),
      premium_base: premiumBase,
      gross_claims_cost: grossClaimsCost,
      estimated_savings: estimatedSavings,
      net_claims_cost_after_fawe: netClaimsCostAfterFawe,
      loss_ratio_before_fawe: Number(lossRatioBeforeFawe.toFixed(4)),
      loss_ratio_after_fawe: Number(lossRatioAfterFawe.toFixed(4)),
      loss_ratio_improvement: Number(
        (lossRatioBeforeFawe - lossRatioAfterFawe).toFixed(4)
      ),
      note: "premium_base is required for real loss ratio. If not provided, this endpoint uses gross_claims_cost * 1.25 as a demo estimate.",
    });
  } catch (error) {
    console.error("GET /dashboard/loss-ratio error:", error);

    return res.status(500).json({
      message: "Failed to fetch loss ratio.",
    });
  }
}

module.exports = {
  getSummary,
  getFaweBreakdown,
  getProviderRisk,
  getLossRatio,
};
