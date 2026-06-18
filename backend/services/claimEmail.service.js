const crypto = require("crypto");
const pool = require("../config/db");
const { sendEmail } = require("./email.service");
const { scoreClaimById } = require("./faweRisk.service");

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

function getAppBaseUrl() {
  return (
    process.env.APP_BASE_URL ||
    process.env.BACKEND_PUBLIC_URL ||
    `http://localhost:${process.env.PORT || 5000}`
  );
}

async function getClaimById(claimId) {
  const [rows] = await pool.query(
    `
    SELECT
      c.*,
      p.provider_email AS provider_master_email
    FROM fawe_claims c
    LEFT JOIN providers p
      ON p.provider_id = c.kenya_provider_id
    WHERE c.claim_id = ?
    LIMIT 1
    `,
    [claimId]
  );

  if (rows.length === 0) {
    const error = new Error("Claim not found.");
    error.statusCode = 404;
    throw error;
  }

  return rows[0];
}

async function getClaimEvents(claimId) {
  const [rows] = await pool.query(
    `
    SELECT
      risk_code,
      category,
      points,
      message,
      recommended_action
    FROM fawe_claim_events
    WHERE claim_id = ?
    ORDER BY
      FIELD(category, 'Fraud', 'Abuse', 'Waste', 'Error'),
      points DESC,
      risk_code ASC
    `,
    [claimId]
  );

  return rows;
}

async function getManagerRecipients(insurerId, roles = []) {
  if (!insurerId) return [];

  const allowedRoles = roles.length
    ? roles
    : ["insurer_admin", "claims_officer", "fraud_investigator"];

  const [rows] = await pool.query(
    `
    SELECT
      name,
      email,
      role
    FROM app_users
    WHERE insurer_id = ?
      AND role IN (${allowedRoles.map(() => "?").join(",")})
      AND is_active = TRUE
      AND email IS NOT NULL
      AND email <> ''
    `,
    [insurerId, ...allowedRoles]
  );

  return rows;
}

async function getProviderRecipients(providerId) {
  if (!providerId) return [];

  const recipients = [];

  const [contactRows] = await pool.query(
    `
    SELECT
      email,
      contact_name AS name,
      contact_type AS role,
      is_primary
    FROM provider_contacts
    WHERE provider_id = ?
      AND contact_type IN ('claims', 'admin', 'medical_records')
      AND is_active = TRUE
      AND email IS NOT NULL
      AND email <> ''
    ORDER BY
      is_primary DESC,
      FIELD(contact_type, 'claims', 'medical_records', 'admin')
    `,
    [providerId]
  );

  recipients.push(...contactRows);

  const [providerRows] = await pool.query(
    `
    SELECT
      provider_email AS email,
      provider_name AS name,
      'provider_master' AS role
    FROM providers
    WHERE provider_id = ?
      AND provider_email IS NOT NULL
      AND provider_email <> ''
    `,
    [providerId]
  );

  recipients.push(...providerRows);

  const [userRows] = await pool.query(
    `
    SELECT
      email,
      name,
      role
    FROM app_users
    WHERE provider_id = ?
      AND role = 'provider_user'
      AND is_active = TRUE
      AND email IS NOT NULL
      AND email <> ''
    `,
    [providerId]
  );

  recipients.push(...userRows);

  const seen = new Set();

  return recipients.filter((recipient) => {
    const key = String(recipient.email || "").toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildEventsTable(events) {
  if (!events.length) {
    return "<p>No FAWE findings were recorded for this claim.</p>";
  }

  const rows = events
    .map(
      (event) => `
      <tr>
        <td>${escapeHtml(event.risk_code)}</td>
        <td>${escapeHtml(event.category)}</td>
        <td>${escapeHtml(event.points)}</td>
        <td>${escapeHtml(event.message)}</td>
        <td>${escapeHtml(event.recommended_action)}</td>
      </tr>`
    )
    .join("");

  return `
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; width: 100%;">
      <thead>
        <tr>
          <th align="left">Code</th>
          <th align="left">Category</th>
          <th align="left">Points</th>
          <th align="left">Finding</th>
          <th align="left">Recommended Action</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function buildClaimSummaryHtml(claim, events, title) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>${escapeHtml(title)}</h2>

      <p>FAWE Shield reviewed a claim received from Smart/LCT and generated the summary below.</p>

      <h3>Claim Summary</h3>
      <table cellpadding="6" cellspacing="0">
        <tr><td><strong>Claim ID</strong></td><td>${escapeHtml(claim.claim_id)}</td></tr>
        <tr><td><strong>Insurer</strong></td><td>${escapeHtml(claim.insurer_name || claim.insurer_id)}</td></tr>
        <tr><td><strong>Provider</strong></td><td>${escapeHtml(claim.provider_name)} (${escapeHtml(claim.kenya_provider_id)})</td></tr>
        <tr><td><strong>Member</strong></td><td>${escapeHtml(claim.member_name || claim.member_id)}</td></tr>
        <tr><td><strong>Claim Type</strong></td><td>${escapeHtml(claim.claim_type)}</td></tr>
        <tr><td><strong>Diagnosis</strong></td><td>${escapeHtml(claim.diagnosis)}</td></tr>
        <tr><td><strong>Claim Amount</strong></td><td>${escapeHtml(formatKES(claim.claim_amount))}</td></tr>
        <tr><td><strong>Risk Score</strong></td><td>${escapeHtml(claim.total_risk_score)}</td></tr>
        <tr><td><strong>Primary FAWE Type</strong></td><td>${escapeHtml(claim.primary_fawe_type)}</td></tr>
        <tr><td><strong>Recommendation</strong></td><td>${escapeHtml(claim.recommendation)}</td></tr>
        <tr><td><strong>Claim Status</strong></td><td>${escapeHtml(claim.claim_status)}</td></tr>
        <tr><td><strong>Estimated Savings</strong></td><td>${escapeHtml(formatKES(claim.estimated_savings))}</td></tr>
      </table>

      <h3>FAWE Findings</h3>
      ${buildEventsTable(events)}

      <p style="margin-top: 20px;">
        Regards,<br/>
        <strong>FAWE Shield</strong>
      </p>
    </div>
  `;
}

function buildClaimSummaryText(claim, events, title) {
  const findings = events.length
    ? events
        .map(
          (event) =>
            `- ${event.risk_code} [${event.category}] ${event.message} (${event.points} points)`
        )
        .join("\n")
    : "No FAWE findings were recorded.";

  return `
${title}

Claim ID: ${claim.claim_id}
Insurer: ${claim.insurer_name || claim.insurer_id}
Provider: ${claim.provider_name} (${claim.kenya_provider_id})
Member: ${claim.member_name || claim.member_id}
Claim Type: ${claim.claim_type}
Diagnosis: ${claim.diagnosis}
Claim Amount: ${formatKES(claim.claim_amount)}
Risk Score: ${claim.total_risk_score}
Primary FAWE Type: ${claim.primary_fawe_type}
Recommendation: ${claim.recommendation}
Claim Status: ${claim.claim_status}
Estimated Savings: ${formatKES(claim.estimated_savings)}

FAWE Findings:
${findings}

Regards,
FAWE Shield
`;
}

async function sendClaimManagerAlert(claimId, options = {}) {
  const claim = await getClaimById(claimId);
  const events = await getClaimEvents(claimId);

  const recipients = await getManagerRecipients(claim.insurer_id, [
    "insurer_admin",
    "claims_officer",
    "fraud_investigator",
  ]);

  if (!recipients.length) {
    return {
      sent: 0,
      message: "No claims/case manager recipients found for this insurer.",
    };
  }

  const subject = `[FAWE Shield] Claim ${claim.claim_id} ${claim.recommendation || "Processed"}`;
  const title = `Claim ${claim.claim_id} FAWE Review`;

  const html = buildClaimSummaryHtml(claim, events, title);
  const text = buildClaimSummaryText(claim, events, title);

  const results = [];

  for (const recipient of recipients) {
    const info = await sendEmail({
      to: recipient.email,
      subject,
      html,
      text,
      claimId,
      messageType: "claim_manager_alert",
      recipientName: recipient.name,
      recipientRole: recipient.role,
      sentByUserId: options.sentByUserId || null,
    });

    results.push({
      email: recipient.email,
      messageId: info.messageId,
    });
  }

  return {
    sent: results.length,
    recipients: results,
  };
}

async function sendHighRiskAlert(claimId, options = {}) {
  const claim = await getClaimById(claimId);
  const events = await getClaimEvents(claimId);

  const recipients = await getManagerRecipients(claim.insurer_id, [
    "insurer_admin",
    "claims_officer",
    "fraud_investigator",
  ]);

  if (!recipients.length) {
    return {
      sent: 0,
      message: "No high-risk recipients found for this insurer.",
    };
  }

  const subject = `[FAWE Shield HIGH RISK] Claim ${claim.claim_id} requires attention`;
  const title = `High Risk Claim Alert: ${claim.claim_id}`;

  const html = buildClaimSummaryHtml(claim, events, title);
  const text = buildClaimSummaryText(claim, events, title);

  const results = [];

  for (const recipient of recipients) {
    const info = await sendEmail({
      to: recipient.email,
      subject,
      html,
      text,
      claimId,
      messageType: "high_risk_alert",
      recipientName: recipient.name,
      recipientRole: recipient.role,
      sentByUserId: options.sentByUserId || null,
    });

    results.push({
      email: recipient.email,
      messageId: info.messageId,
    });
  }

  return {
    sent: results.length,
    recipients: results,
  };
}

async function sendMissingDocumentsAlert(claimId, options = {}) {
  const claim = await getClaimById(claimId);
  const events = await getClaimEvents(claimId);

  const missingDocEvents = events.filter((event) => {
    return (
      String(event.risk_code || "").startsWith("DOC") ||
      String(event.message || "").toLowerCase().includes("missing")
    );
  });

  const missingDocuments = claim.missing_documents
    ? String(claim.missing_documents)
        .split(";")
        .map((item) => item.trim())
        .filter(Boolean)
    : missingDocEvents.map((event) => event.message);

  if (!missingDocuments.length) {
    return {
      sent: 0,
      message: "This claim does not have missing documents.",
    };
  }

  const providerRecipients = await getProviderRecipients(claim.kenya_provider_id);
  const managerRecipients = await getManagerRecipients(claim.insurer_id, [
    "insurer_admin",
    "claims_officer",
  ]);

  const subject = `[FAWE Shield] Missing documents required for claim ${claim.claim_id}`;

  const missingList = missingDocuments
    .map((document) => `<li>${escapeHtml(document)}</li>`)
    .join("");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>Missing Documents Required</h2>

      <p>FAWE Shield reviewed claim <strong>${escapeHtml(
        claim.claim_id
      )}</strong> and found missing documents.</p>

      <h3>Provider</h3>
      <p>${escapeHtml(claim.provider_name)} (${escapeHtml(claim.kenya_provider_id)})</p>

      <h3>Claim Details</h3>
      <p>
        Claim Type: ${escapeHtml(claim.claim_type)}<br/>
        Invoice No: ${escapeHtml(claim.invoice_no)}<br/>
        Claim Amount: ${escapeHtml(formatKES(claim.claim_amount))}
      </p>

      <h3>Missing Documents</h3>
      <ul>${missingList}</ul>

      <p>Please upload or resubmit the missing documents so the claim can continue processing.</p>

      <p>
        Regards,<br/>
        <strong>FAWE Shield</strong>
      </p>
    </div>
  `;

  const text = `
Missing Documents Required

Claim ID: ${claim.claim_id}
Provider: ${claim.provider_name} (${claim.kenya_provider_id})
Claim Type: ${claim.claim_type}
Invoice No: ${claim.invoice_no}
Claim Amount: ${formatKES(claim.claim_amount)}

Missing Documents:
${missingDocuments.map((doc) => `- ${doc}`).join("\n")}

Please upload or resubmit the missing documents so the claim can continue processing.

Regards,
FAWE Shield
`;

  const results = [];

  for (const recipient of providerRecipients) {
    const info = await sendEmail({
      to: recipient.email,
      subject,
      html,
      text,
      claimId,
      messageType: "provider_missing_documents",
      recipientName: recipient.name,
      recipientRole: recipient.role,
      sentByUserId: options.sentByUserId || null,
    });

    results.push({
      type: "provider",
      email: recipient.email,
      messageId: info.messageId,
    });
  }

  for (const recipient of managerRecipients) {
    const info = await sendEmail({
      to: recipient.email,
      subject: `[FAWE Shield COPY] Provider notified: Claim ${claim.claim_id}`,
      html,
      text,
      claimId,
      messageType: "manager_missing_documents_copy",
      recipientName: recipient.name,
      recipientRole: recipient.role,
      sentByUserId: options.sentByUserId || null,
    });

    results.push({
      type: "manager",
      email: recipient.email,
      messageId: info.messageId,
    });
  }

  if (!results.length) {
    return {
      sent: 0,
      message:
        "No provider or manager recipients found. Check provider_contacts/providers/app_users.",
    };
  }

  return {
    sent: results.length,
    recipients: results,
  };
}

async function sendMemberClaimConfirmation(claimId, options = {}) {
  const claim = await getClaimById(claimId);

  if (!claim.member_email) {
    return {
      sent: 0,
      message: "Claim member has no email address.",
    };
  }

  const token = crypto.randomBytes(32).toString("hex");

  await pool.query(
    `
    INSERT INTO claim_confirmation_tokens (
      claim_id,
      member_id,
      member_email,
      token,
      response,
      expires_at
    )
    VALUES (?, ?, ?, ?, 'Pending', DATE_ADD(NOW(), INTERVAL 3 DAY))
    `,
    [claim.claim_id, claim.member_id, claim.member_email, token]
  );

  const baseUrl = getAppBaseUrl();

  const confirmUrl = `${baseUrl}/api/communications/confirm-claim?token=${token}&response=confirmed`;
  const denyUrl = `${baseUrl}/api/communications/confirm-claim?token=${token}&response=denied`;

  const subject = `[FAWE Shield] Please confirm your visit for claim ${claim.claim_id}`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>Confirm Your Hospital Visit</h2>

      <p>Dear ${escapeHtml(claim.member_name || "Member")},</p>

      <p>FAWE Shield received a claim linked to your visit.</p>

      <table cellpadding="6" cellspacing="0">
        <tr><td><strong>Claim ID</strong></td><td>${escapeHtml(claim.claim_id)}</td></tr>
        <tr><td><strong>Provider</strong></td><td>${escapeHtml(claim.provider_name)}</td></tr>
        <tr><td><strong>Visit Date</strong></td><td>${escapeHtml(claim.claim_start_date)}</td></tr>
        <tr><td><strong>Claim Type</strong></td><td>${escapeHtml(claim.claim_type)}</td></tr>
      </table>

      <p>Please confirm whether you attended this visit:</p>

      <p>
        <a href="${confirmUrl}" style="padding: 10px 16px; background: #0a7a32; color: white; text-decoration: none;">Confirm Visit</a>
        &nbsp;
        <a href="${denyUrl}" style="padding: 10px 16px; background: #b00020; color: white; text-decoration: none;">Deny Visit</a>
      </p>

      <p>If you did not request this or you are unsure, contact your insurer.</p>

      <p>
        Regards,<br/>
        <strong>FAWE Shield</strong>
      </p>
    </div>
  `;

  const text = `
Dear ${claim.member_name || "Member"},

FAWE Shield received a claim linked to your visit.

Claim ID: ${claim.claim_id}
Provider: ${claim.provider_name}
Visit Date: ${claim.claim_start_date}
Claim Type: ${claim.claim_type}

Confirm visit: ${confirmUrl}
Deny visit: ${denyUrl}

Regards,
FAWE Shield
`;

  const info = await sendEmail({
    to: claim.member_email,
    subject,
    html,
    text,
    claimId,
    messageType: "member_claim_confirmation",
    recipientName: claim.member_name,
    recipientRole: "member",
    sentByUserId: options.sentByUserId || null,
  });

  return {
    sent: 1,
    member_email: claim.member_email,
    token,
    messageId: info.messageId,
  };
}

async function confirmMemberClaimVisit({ token, response }) {
  const normalizedResponse = String(response || "").trim().toLowerCase();

  const mappedResponse =
    normalizedResponse === "confirmed" || normalizedResponse === "confirm"
      ? "Confirmed"
      : normalizedResponse === "denied" || normalizedResponse === "deny"
      ? "Denied"
      : null;

  if (!mappedResponse) {
    const error = new Error("Invalid response. Use confirmed or denied.");
    error.statusCode = 400;
    throw error;
  }

  const [rows] = await pool.query(
    `
    SELECT *
    FROM claim_confirmation_tokens
    WHERE token = ?
    LIMIT 1
    `,
    [token]
  );

  if (rows.length === 0) {
    const error = new Error("Confirmation token not found.");
    error.statusCode = 404;
    throw error;
  }

  const confirmation = rows[0];

  if (new Date(confirmation.expires_at) < new Date()) {
    const error = new Error("Confirmation link has expired.");
    error.statusCode = 400;
    throw error;
  }

  if (confirmation.response !== "Pending") {
    return {
      alreadyResponded: true,
      claim_id: confirmation.claim_id,
      response: confirmation.response,
    };
  }

  await pool.query(
    `
    UPDATE claim_confirmation_tokens
    SET response = ?,
        responded_at = NOW()
    WHERE token = ?
    `,
    [mappedResponse, token]
  );

  await pool.query(
    `
    UPDATE fawe_claims
    SET member_visit_confirmed = ?,
        updated_at = NOW()
    WHERE claim_id = ?
    `,
    [mappedResponse, confirmation.claim_id]
  );

  let scoringResult = null;

  try {
    scoringResult = await scoreClaimById(confirmation.claim_id);
  } catch (error) {
    scoringResult = {
      error: error.message,
    };
  }

  return {
    alreadyResponded: false,
    claim_id: confirmation.claim_id,
    response: mappedResponse,
    scoring_result: scoringResult,
  };
}

module.exports = {
  sendClaimManagerAlert,
  sendHighRiskAlert,
  sendMissingDocumentsAlert,
  sendMemberClaimConfirmation,
  confirmMemberClaimVisit,
  getClaimById,
  getClaimEvents,
  getManagerRecipients,
  getProviderRecipients,
};
