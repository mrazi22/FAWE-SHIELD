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

async function getProviderRiskDashboard(req, res) {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);

    const claimScope = getDashboardScope(req.user);
    const eventScope = getDashboardScope(req.user, "c");

    const [providerRows] = await pool.query(
      `
      SELECT
        kenya_provider_id,
        provider_name,
        county,
        provider_type,
        COUNT(*) AS total_claims,
        SUM(claim_amount) AS total_claim_amount,
        AVG(claim_amount) AS avg_claim_amount,
        AVG(provider_avg_claim) AS peer_avg_claim_amount,
        AVG(total_risk_score) AS avg_risk_score,
        SUM(CASE WHEN recommendation = 'Investigate' THEN 1 ELSE 0 END) AS investigate_count,
        SUM(estimated_savings) AS estimated_savings
      FROM fawe_claims
      WHERE ${claimScope.whereSql}
      GROUP BY
        kenya_provider_id,
        provider_name,
        county,
        provider_type
      ORDER BY avg_risk_score DESC, estimated_savings DESC
      LIMIT ?
      `,
      [...claimScope.params, limit]
    );

    const [eventRows] = await pool.query(
      `
      SELECT
        c.kenya_provider_id,
        e.category,
        COUNT(*) AS total_events
      FROM fawe_claim_events e
      JOIN fawe_claims c
        ON c.claim_id = e.claim_id
      WHERE ${eventScope.whereSql}
      GROUP BY c.kenya_provider_id, e.category
      `,
      eventScope.params
    );

    const eventMap = {};

    for (const row of eventRows) {
      if (!eventMap[row.kenya_provider_id]) {
        eventMap[row.kenya_provider_id] = {
          fraud_events: 0,
          abuse_events: 0,
          waste_events: 0,
          error_events: 0,
        };
      }

      if (row.category === "Fraud") {
        eventMap[row.kenya_provider_id].fraud_events = Number(row.total_events || 0);
      }

      if (row.category === "Abuse") {
        eventMap[row.kenya_provider_id].abuse_events = Number(row.total_events || 0);
      }

      if (row.category === "Waste") {
        eventMap[row.kenya_provider_id].waste_events = Number(row.total_events || 0);
      }

      if (row.category === "Error") {
        eventMap[row.kenya_provider_id].error_events = Number(row.total_events || 0);
      }
    }

    const providers = providerRows.map((provider) => {
      const events = eventMap[provider.kenya_provider_id] || {
        fraud_events: 0,
        abuse_events: 0,
        waste_events: 0,
        error_events: 0,
      };

      return {
        ...provider,
        total_claims: Number(provider.total_claims || 0),
        total_claim_amount: Number(provider.total_claim_amount || 0),
        avg_claim_amount: Number(provider.avg_claim_amount || 0),
        peer_avg_claim_amount: Number(provider.peer_avg_claim_amount || 0),
        avg_risk_score: Number(provider.avg_risk_score || 0),
        investigate_count: Number(provider.investigate_count || 0),
        estimated_savings: Number(provider.estimated_savings || 0),
        ...events,
      };
    });

    const [countyRows] = await pool.query(
      `
      SELECT
        county,
        COUNT(*) AS total_claims,
        SUM(claim_amount) AS total_claim_amount,
        AVG(total_risk_score) AS avg_risk_score,
        SUM(estimated_savings) AS estimated_savings
      FROM fawe_claims
      WHERE ${claimScope.whereSql}
      GROUP BY county
      ORDER BY avg_risk_score DESC, total_claim_amount DESC
      LIMIT 20
      `,
      claimScope.params
    );

    const [ruleRows] = await pool.query(
      `
      SELECT
        c.kenya_provider_id,
        c.provider_name,
        e.risk_code,
        e.category,
        COUNT(*) AS total_events
      FROM fawe_claim_events e
      JOIN fawe_claims c
        ON c.claim_id = e.claim_id
      WHERE ${eventScope.whereSql}
      GROUP BY
        c.kenya_provider_id,
        c.provider_name,
        e.risk_code,
        e.category
      ORDER BY total_events DESC
      LIMIT 30
      `,
      eventScope.params
    );

    return res.json({
      scope: {
        role: req.user.role,
        insurerId: req.user.insurerId || null,
        providerId: req.user.providerId || null,
      },
      providers,
      county_breakdown: countyRows.map((row) => ({
        county: row.county,
        total_claims: Number(row.total_claims || 0),
        total_claim_amount: Number(row.total_claim_amount || 0),
        avg_risk_score: Number(row.avg_risk_score || 0),
        estimated_savings: Number(row.estimated_savings || 0),
      })),
      fraud_rule_frequency: ruleRows.map((row) => ({
        kenya_provider_id: row.kenya_provider_id,
        provider_name: row.provider_name,
        risk_code: row.risk_code,
        category: row.category,
        total_events: Number(row.total_events || 0),
      })),
    });
  } catch (error) {
    console.error("GET /dashboard/provider-risk-dashboard error:", error);

    return res.status(500).json({
      message: "Failed to fetch provider risk dashboard.",
    });
  }
}
async function getFaweBreakdownPage(req, res) {
  try {
    const scope = getDashboardScope(req.user, "c");

    const [categoryRows] = await pool.query(
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

    const [ruleRows] = await pool.query(
      `
      SELECT
        e.category,
        e.risk_code,
        e.message,
        COUNT(*) AS total_events,
        COUNT(DISTINCT e.claim_id) AS affected_claims,
        SUM(e.points) AS total_points
      FROM fawe_claim_events e
      JOIN fawe_claims c
        ON c.claim_id = e.claim_id
      WHERE ${scope.whereSql}
      GROUP BY
        e.category,
        e.risk_code,
        e.message
      ORDER BY e.category ASC, total_events DESC
      `,
      scope.params
    );

    const categories = ["Fraud", "Abuse", "Waste", "Error"];

    const exampleClaimsByCategory = {};

    for (const category of categories) {
      const [exampleRows] = await pool.query(
        `
        SELECT
          c.claim_id,
          c.member_id,
          c.member_name,
          c.provider_name,
          c.kenya_provider_id,
          c.claim_amount,
          c.total_risk_score,
          c.recommendation,
          c.claim_status,
          c.primary_fawe_type,
          c.claim_start_date,
          e.risk_code,
          e.message
        FROM fawe_claim_events e
        JOIN fawe_claims c
          ON c.claim_id = e.claim_id
        WHERE ${scope.whereSql}
          AND e.category = ?
        ORDER BY c.total_risk_score DESC, c.claim_amount DESC
        LIMIT 5
        `,
        [...scope.params, category]
      );

      exampleClaimsByCategory[category] = exampleRows.map((row) => ({
        claim_id: row.claim_id,
        member_id: row.member_id,
        member_name: row.member_name,
        provider_name: row.provider_name,
        kenya_provider_id: row.kenya_provider_id,
        claim_amount: Number(row.claim_amount || 0),
        total_risk_score: Number(row.total_risk_score || 0),
        recommendation: row.recommendation,
        claim_status: row.claim_status,
        primary_fawe_type: row.primary_fawe_type,
        claim_start_date: row.claim_start_date,
        risk_code: row.risk_code,
        message: row.message,
      }));
    }

    const categoryMap = {};

    for (const category of categories) {
      const totals = categoryRows.find((row) => row.category === category);

      categoryMap[category] = {
        category,
        total_events: Number(totals?.total_events || 0),
        affected_claims: Number(totals?.affected_claims || 0),
        total_points: Number(totals?.total_points || 0),
        top_rules: ruleRows
          .filter((row) => row.category === category)
          .slice(0, 6)
          .map((row) => ({
            risk_code: row.risk_code,
            message: row.message,
            total_events: Number(row.total_events || 0),
            affected_claims: Number(row.affected_claims || 0),
            total_points: Number(row.total_points || 0),
          })),
        example_claims: exampleClaimsByCategory[category] || [],
      };
    }

    return res.json({
      scope: {
        role: req.user.role,
        insurerId: req.user.insurerId || null,
        providerId: req.user.providerId || null,
      },
      categories: {
        Fraud: categoryMap.Fraud,
        Abuse: categoryMap.Abuse,
        Waste: categoryMap.Waste,
        Error: categoryMap.Error,
      },
    });
  } catch (error) {
    console.error("GET /dashboard/fawe-breakdown-page error:", error);

    return res.status(500).json({
      message: "Failed to fetch FAWE breakdown page.",
    });
  }
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

async function getLossRatioReportPage(req, res) {
  try {
    const scope = getDashboardScope(req.user);

    const [summaryRows] = await pool.query(
      `
      SELECT
        COUNT(*) AS total_claims,

        SUM(claim_amount) AS total_claims_value,

        SUM(
          CASE
            WHEN recommendation IN ('Approve', 'Approve with Notes')
            THEN claim_amount
            ELSE 0
          END
        ) AS approved_value,

        SUM(
          CASE
            WHEN recommendation = 'Review'
            THEN claim_amount
            ELSE 0
          END
        ) AS review_value,

        SUM(
          CASE
            WHEN recommendation = 'Investigate'
            THEN claim_amount
            ELSE 0
          END
        ) AS investigate_value,

        SUM(
          CASE
            WHEN total_risk_score >= 70
            THEN claim_amount
            ELSE 0
          END
        ) AS high_risk_claims_value,

        SUM(estimated_savings) AS estimated_savings,

        AVG(total_risk_score) AS avg_risk_score,

        SUM(CASE WHEN recommendation = 'Investigate' THEN 1 ELSE 0 END) AS investigate_claims,
        SUM(CASE WHEN recommendation = 'Review' THEN 1 ELSE 0 END) AS review_claims,
        SUM(CASE WHEN recommendation IN ('Approve', 'Approve with Notes') THEN 1 ELSE 0 END) AS approved_claims
      FROM fawe_claims
      WHERE ${scope.whereSql}
      `,
      scope.params
    );

    const summary = summaryRows[0] || {};

    const totalClaimsValue = Number(summary.total_claims_value || 0);
    const estimatedSavings = Number(summary.estimated_savings || 0);
    const netClaimsCostAfterFawe = totalClaimsValue - estimatedSavings;

    /*
      For MVP/demo:
      If premium_base is not provided, estimate it as total claims value * 1.25.
      In production, premium_base should come from policy/premium tables.
    */
    const premiumBase = Number(
      req.query.premium_base || totalClaimsValue * 1.25 || 1
    );

    const lossRatioBeforeFawe =
      premiumBase > 0 ? totalClaimsValue / premiumBase : 0;

    const lossRatioAfterFawe =
      premiumBase > 0 ? netClaimsCostAfterFawe / premiumBase : 0;

    const [providerExposureRows] = await pool.query(
      `
      SELECT
        kenya_provider_id,
        provider_name,
        county,
        provider_type,
        COUNT(*) AS total_claims,
        SUM(claim_amount) AS total_claims_value,
        AVG(total_risk_score) AS avg_risk_score,
        SUM(CASE WHEN recommendation = 'Investigate' THEN 1 ELSE 0 END) AS investigate_count,
        SUM(estimated_savings) AS estimated_savings
      FROM fawe_claims
      WHERE ${scope.whereSql}
        AND (
          recommendation = 'Investigate'
          OR total_risk_score >= 70
        )
      GROUP BY
        kenya_provider_id,
        provider_name,
        county,
        provider_type
      ORDER BY total_claims_value DESC, avg_risk_score DESC
      LIMIT 10
      `,
      scope.params
    );

    return res.json({
      scope: {
        role: req.user.role,
        insurerId: req.user.insurerId || null,
        providerId: req.user.providerId || null,
      },
      summary: {
        total_claims: Number(summary.total_claims || 0),
        total_claims_value: totalClaimsValue,
        approved_value: Number(summary.approved_value || 0),
        review_value: Number(summary.review_value || 0),
        investigate_value: Number(summary.investigate_value || 0),
        high_risk_claims_value: Number(summary.high_risk_claims_value || 0),
        estimated_savings: estimatedSavings,
        net_claims_cost_after_fawe: netClaimsCostAfterFawe,
        premium_base: premiumBase,
        loss_ratio_before_fawe: Number(lossRatioBeforeFawe.toFixed(4)),
        loss_ratio_after_fawe: Number(lossRatioAfterFawe.toFixed(4)),
        loss_ratio_improvement: Number(
          (lossRatioBeforeFawe - lossRatioAfterFawe).toFixed(4)
        ),
        avg_risk_score: Number(summary.avg_risk_score || 0),
        investigate_claims: Number(summary.investigate_claims || 0),
        review_claims: Number(summary.review_claims || 0),
        approved_claims: Number(summary.approved_claims || 0),
      },
      high_risk_provider_exposure: providerExposureRows.map((provider) => ({
        kenya_provider_id: provider.kenya_provider_id,
        provider_name: provider.provider_name,
        county: provider.county,
        provider_type: provider.provider_type,
        total_claims: Number(provider.total_claims || 0),
        total_claims_value: Number(provider.total_claims_value || 0),
        avg_risk_score: Number(provider.avg_risk_score || 0),
        investigate_count: Number(provider.investigate_count || 0),
        estimated_savings: Number(provider.estimated_savings || 0),
      })),
      note: "premium_base is required for a real loss ratio. If not provided, this endpoint uses total_claims_value * 1.25 as a demo estimate.",
    });
  } catch (error) {
    console.error("GET /dashboard/loss-ratio-page error:", error);

    return res.status(500).json({
      message: "Failed to fetch loss ratio report page.",
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
  getProviderRiskDashboard,
  getFaweBreakdownPage,
  getLossRatioReportPage,
};
