const crypto = require("crypto");
const pool = require("../config/db");

function generateClaimId() {
  return `CLM${crypto.randomInt(100000, 999999)}`;
}

function normalizeBoolean(value) {
  if (value === true || value === 1) return 1;
  if (value === false || value === 0) return 0;

  const normalized = String(value || "").trim().toLowerCase();

  if (["true", "1", "yes", "y", "confirmed"].includes(normalized)) return 1;

  return 0;
}

function normalizeNumber(value, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

async function claimIdExists(claimId) {
  const [rows] = await pool.query(
    `
    SELECT claim_id
    FROM fawe_claims
    WHERE claim_id = ?
    LIMIT 1
    `,
    [claimId]
  );

  return rows.length > 0;
}

async function generateUniqueClaimId() {
  let claimId = generateClaimId();

  while (await claimIdExists(claimId)) {
    claimId = generateClaimId();
  }

  return claimId;
}

function validateClaimPayload(payload) {
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
    if (
      payload[field] === undefined ||
      payload[field] === null ||
      payload[field] === ""
    ) {
      return `${field} is required.`;
    }
  }

  if (!["Inpatient", "Outpatient"].includes(String(payload.claim_type))) {
    return "claim_type must be either Inpatient or Outpatient.";
  }

  if (Number(payload.claim_amount) <= 0) {
    return "claim_amount must be greater than zero.";
  }

  return null;
}

function buildClaimInsertData(payload, options, claimId) {
  const insurerId = options.forceInsurerId || payload.insurer_id;
  const providerId = options.forceProviderId || payload.kenya_provider_id;

  return {
    claim_id: claimId,

    insurer_id: insurerId,
    insurer_name: payload.insurer_name || "",
    scheme_name: payload.scheme_name || "",

    member_id: payload.member_id,
    member_card_no: payload.member_card_no || "",
    member_name: payload.member_name || "",
    member_mobile: payload.member_mobile || "",
    member_email: payload.member_email || "",
    sms_opt_in: normalizeBoolean(payload.sms_opt_in),

    kenya_provider_id: providerId,
    provider_name: payload.provider_name,
    provider_mobile: payload.provider_mobile || "",
    county: payload.county || "",
    provider_type: payload.provider_type || "",
    provider_pin: payload.provider_pin || "",

    claim_type: payload.claim_type,
    claim_start_date: payload.claim_start_date,
    claim_end_date: payload.claim_end_date,
    diagnosis: payload.diagnosis,
    plan_type: payload.plan_type || "",
    claim_amount: normalizeNumber(payload.claim_amount),

    uploaded_documents: payload.uploaded_documents || "",
    missing_documents: payload.missing_documents || "",

    claim_form_no: payload.claim_form_no || "",
    authorization_no: payload.authorization_no || "",
    invoice_no: payload.invoice_no || "",
    etims_receipt_no: payload.etims_receipt_no || "",
    etims_invoice_reference: payload.etims_invoice_reference || "",
    etims_verified: normalizeBoolean(payload.etims_verified),

    etims_qr_verified: normalizeBoolean(payload.etims_qr_verified ?? true),
    etims_amount: normalizeNumber(payload.etims_amount || payload.claim_amount),
    etims_provider_pin: payload.etims_provider_pin || "",

    member_visit_confirmed: payload.member_visit_confirmed || "Pending",

    procedure_code: payload.procedure_code || "",
    procedure_name: payload.procedure_name || "",
    procedure_category: payload.procedure_category || "",
    diagnosis_procedure_match: normalizeBoolean(
      payload.diagnosis_procedure_match ?? true
    ),
    unnecessary_diagnostic_test: normalizeBoolean(
      payload.unnecessary_diagnostic_test
    ),
    repeated_lab_radiology_count: normalizeNumber(
      payload.repeated_lab_radiology_count
    ),

    drug_name: payload.drug_name || "",
    generic_name: payload.generic_name || "",
    drug_price: normalizeNumber(payload.drug_price),
    generic_available: normalizeBoolean(payload.generic_available),
    generic_price: normalizeNumber(payload.generic_price),
    is_brand_drug: normalizeBoolean(payload.is_brand_drug),

    provider_avg_claim: 0,
    member_claims_last_30_days: 0,
    same_diagnosis_recent_count: 0,
    provider_claims_same_day: 0,
    admission_count_recent: normalizeNumber(payload.admission_count_recent),
    possible_duplicate_claim: 0,
    invoice_reused: 0,

    fraud_label: normalizeBoolean(payload.fraud_label),

    fraud_score: 0,
    abuse_score: 0,
    waste_score: 0,
    error_score: 0,
    total_risk_score: 0,
    primary_fawe_type: "Clean",

    fraud_flag: 0,
    abuse_flag: 0,
    waste_flag: 0,
    error_flag: 0,

    recommendation: "Approve",
    claim_status: "Submitted",
    risk_reasons: "",
    recommended_action: "",
    estimated_savings: 0,
  };
}

async function insertClaim(payload, options = {}) {
  const validationError = validateClaimPayload(payload);

  if (validationError) {
    const error = new Error(validationError);
    error.statusCode = 400;
    throw error;
  }

  const insurerId = options.forceInsurerId || payload.insurer_id;

  if (!insurerId) {
    const error = new Error("insurer_id is required.");
    error.statusCode = 400;
    throw error;
  }

  const claimId = payload.claim_id || (await generateUniqueClaimId());

  if (payload.claim_id && (await claimIdExists(payload.claim_id))) {
    const error = new Error("Claim ID already exists.");
    error.statusCode = 409;
    throw error;
  }

  const claimData = buildClaimInsertData(payload, options, claimId);

  const columns = Object.keys(claimData);
  const values = Object.values(claimData);

  const columnSql = columns.map((column) => `\`${column}\``).join(", ");
  const placeholderSql = columns.map(() => "?").join(", ");

  await pool.query(
    `
    INSERT INTO fawe_claims (${columnSql})
    VALUES (${placeholderSql})
    `,
    values
  );

  return claimId;
}

module.exports = {
  insertClaim,
  generateUniqueClaimId,
};