const pool = require("../config/db");
const { sendEmail } = require("./email.service");
const {
  getManagerRecipients,
} = require("./claimEmail.service");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatKES(value) {
  const amount = Number(value || 0);
  return `KES ${Math.round(amount).toLocaleString()}`;
}

function percent(value) {
  const numberValue = Number(value || 0);
  return `${numberValue.toFixed(2)}%`;
}

async function getLossRatioData(insurerId) {
  const [summaryRows] = await pool.query(
    `
    SELECT
      COUNT(*) AS claims_processed,
      COALESCE(SUM(claim_amount), 0) AS gross_claims_cost,
      COALESCE(SUM(estimated_savings), 0) AS estimated_savings,
      COALESCE(SUM(CASE WHEN recommendation IN ('Review', 'Investigate') THEN 1 ELSE 0 END), 0) AS flagged_claims,
      COALESCE(SUM(CASE WHEN claim_status = 'Pending Documents' THEN 1 ELSE 0 END), 0) AS pending_documents
    FROM fawe_claims
    WHERE insurer_id = ?
    `,
    [insurerId]
  );

  const summary = summaryRows[0];

  const grossClaimsCost = Number(summary.gross_claims_cost || 0);
  const estimatedSavings = Number(summary.estimated_savings || 0);
  const netClaimsCost = Math.max(grossClaimsCost - estimatedSavings, 0);

  /*
    If you later have premium/contribution data, replace this placeholder.
    For now, we assume premiums are gross claims / 0.82 to estimate a before ratio.
  */
  const estimatedPremiums = grossClaimsCost > 0 ? grossClaimsCost / 0.82 : 0;

  const lossRatioBefore =
    estimatedPremiums > 0 ? (grossClaimsCost / estimatedPremiums) * 100 : 0;

  const lossRatioAfter =
    estimatedPremiums > 0 ? (netClaimsCost / estimatedPremiums) * 100 : 0;

  const [categoryRows] = await pool.query(
    `
    SELECT
      e.category,
      COUNT(*) AS total_events,
      COUNT(DISTINCT e.claim_id) AS affected_claims,
      COALESCE(SUM(e.points), 0) AS total_points
    FROM fawe_claim_events e
    JOIN fawe_claims c
      ON c.claim_id = e.claim_id
    WHERE c.insurer_id = ?
    GROUP BY e.category
    ORDER BY affected_claims DESC
    `,
    [insurerId]
  );

  const [providerRows] = await pool.query(
    `
    SELECT
      kenya_provider_id,
      provider_name,
      COUNT(*) AS claims_count,
      ROUND(AVG(total_risk_score), 2) AS avg_risk_score,
      COALESCE(SUM(estimated_savings), 0) AS estimated_savings
    FROM fawe_claims
    WHERE insurer_id = ?
    GROUP BY kenya_provider_id, provider_name
    ORDER BY avg_risk_score DESC, estimated_savings DESC
    LIMIT 10
    `,
    [insurerId]
  );

  return {
    summary: {
      ...summary,
      gross_claims_cost: grossClaimsCost,
      estimated_savings: estimatedSavings,
      net_claims_cost: netClaimsCost,
      estimated_premiums: estimatedPremiums,
      loss_ratio_before: lossRatioBefore,
      loss_ratio_after: lossRatioAfter,
      loss_ratio_improvement: Math.max(lossRatioBefore - lossRatioAfter, 0),
    },
    categories: categoryRows,
    providers: providerRows,
  };
}

function buildCategoryRows(categories) {
  if (!categories.length) {
    return `<tr><td colspan="4">No FAWE findings recorded.</td></tr>`;
  }

  return categories
    .map(
      (row) => `
      <tr>
        <td>${escapeHtml(row.category)}</td>
        <td>${escapeHtml(row.total_events)}</td>
        <td>${escapeHtml(row.affected_claims)}</td>
        <td>${escapeHtml(row.total_points)}</td>
      </tr>`
    )
    .join("");
}

function buildProviderRows(providers) {
  if (!providers.length) {
    return `<tr><td colspan="5">No provider risk data available.</td></tr>`;
  }

  return providers
    .map(
      (row) => `
      <tr>
        <td>${escapeHtml(row.kenya_provider_id)}</td>
        <td>${escapeHtml(row.provider_name)}</td>
        <td>${escapeHtml(row.claims_count)}</td>
        <td>${escapeHtml(row.avg_risk_score)}</td>
        <td>${escapeHtml(formatKES(row.estimated_savings))}</td>
      </tr>`
    )
    .join("");
}

function buildLossRatioHtml(insurerId, data) {
  const { summary, categories, providers } = data;

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>FAWE Shield Loss Ratio Summary</h2>

      <p>Insurer ID: <strong>${escapeHtml(insurerId)}</strong></p>

      <h3>Summary</h3>
      <table cellpadding="6" cellspacing="0">
        <tr><td><strong>Claims Processed</strong></td><td>${escapeHtml(summary.claims_processed)}</td></tr>
        <tr><td><strong>Gross Claims Cost</strong></td><td>${escapeHtml(formatKES(summary.gross_claims_cost))}</td></tr>
        <tr><td><strong>Estimated FAWE Savings</strong></td><td>${escapeHtml(formatKES(summary.estimated_savings))}</td></tr>
        <tr><td><strong>Net Claims Cost After FAWE</strong></td><td>${escapeHtml(formatKES(summary.net_claims_cost))}</td></tr>
        <tr><td><strong>Loss Ratio Before FAWE</strong></td><td>${escapeHtml(percent(summary.loss_ratio_before))}</td></tr>
        <tr><td><strong>Loss Ratio After FAWE</strong></td><td>${escapeHtml(percent(summary.loss_ratio_after))}</td></tr>
        <tr><td><strong>Improvement</strong></td><td>${escapeHtml(percent(summary.loss_ratio_improvement))}</td></tr>
        <tr><td><strong>Flagged Claims</strong></td><td>${escapeHtml(summary.flagged_claims)}</td></tr>
        <tr><td><strong>Pending Documents</strong></td><td>${escapeHtml(summary.pending_documents)}</td></tr>
      </table>

      <h3>FAWE Breakdown</h3>
      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr>
            <th align="left">Category</th>
            <th align="left">Events</th>
            <th align="left">Affected Claims</th>
            <th align="left">Total Points</th>
          </tr>
        </thead>
        <tbody>${buildCategoryRows(categories)}</tbody>
      </table>

      <h3>Top Risk Providers</h3>
      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr>
            <th align="left">Provider ID</th>
            <th align="left">Provider</th>
            <th align="left">Claims</th>
            <th align="left">Avg Risk Score</th>
            <th align="left">Estimated Savings</th>
          </tr>
        </thead>
        <tbody>${buildProviderRows(providers)}</tbody>
      </table>

      <p style="margin-top: 20px;">
        Regards,<br/>
        <strong>FAWE Shield</strong>
      </p>
    </div>
  `;
}

function buildLossRatioText(insurerId, data) {
  const { summary } = data;

  return `
FAWE Shield Loss Ratio Summary

Insurer ID: ${insurerId}

Claims Processed: ${summary.claims_processed}
Gross Claims Cost: ${formatKES(summary.gross_claims_cost)}
Estimated FAWE Savings: ${formatKES(summary.estimated_savings)}
Net Claims Cost After FAWE: ${formatKES(summary.net_claims_cost)}
Loss Ratio Before FAWE: ${percent(summary.loss_ratio_before)}
Loss Ratio After FAWE: ${percent(summary.loss_ratio_after)}
Improvement: ${percent(summary.loss_ratio_improvement)}
Flagged Claims: ${summary.flagged_claims}
Pending Documents: ${summary.pending_documents}

Regards,
FAWE Shield
`;
}

async function sendLossRatioReport({ insurerId, toEmails = [], sentByUserId = null }) {
  if (!insurerId) {
    const error = new Error("insurerId is required.");
    error.statusCode = 400;
    throw error;
  }

  const recipients = [];

  if (Array.isArray(toEmails) && toEmails.length) {
    recipients.push(
      ...toEmails.map((email) => ({
        email,
        name: null,
        role: "manual_recipient",
      }))
    );
  } else {
    recipients.push(
      ...(await getManagerRecipients(insurerId, [
        "insurer_admin",
        "claims_officer",
        "fraud_investigator",
      ]))
    );
  }

  if (!recipients.length) {
    return {
      sent: 0,
      message: "No report recipients found.",
    };
  }

  const data = await getLossRatioData(insurerId);

  const subject = `[FAWE Shield] Loss Ratio Summary - ${insurerId}`;
  const html = buildLossRatioHtml(insurerId, data);
  const text = buildLossRatioText(insurerId, data);

  const results = [];

  for (const recipient of recipients) {
    const info = await sendEmail({
      to: recipient.email,
      subject,
      html,
      text,
      claimId: null,
      messageType: "loss_ratio_report",
      recipientName: recipient.name,
      recipientRole: recipient.role,
      sentByUserId,
    });

    results.push({
      email: recipient.email,
      messageId: info.messageId,
    });
  }

  return {
    sent: results.length,
    recipients: results,
    data,
  };
}

module.exports = {
  getLossRatioData,
  sendLossRatioReport,
};
