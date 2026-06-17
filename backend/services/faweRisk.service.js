const pool = require("../config/db");

const {
  OUTPATIENT_REQUIRED,
  INPATIENT_REQUIRED,
  MISSING_DOCUMENT_RULE_MAP,
  LOW_COST_DIAGNOSES,
  FAWE_PRIORITY,
  RISK_RULES,
} = require("../config/faweRules");

const THRESHOLDS = {
  memberClaimsLast30Days: 4,
  sameDiagnosisLast30Days: 3,
  providerClaimsSameDay: 30,
  admissionCountRecent: 3,
  providerBenchmarkMultiplier: 2.5,
  lowCostDiagnosisHighAmount: 25000,
  repeatedLabRadiologyCount: 3,
};

function normalizeDocumentName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function parseDocumentList(value) {
  if (!value) return [];

  return String(value)
    .split(";")
    .map(normalizeDocumentName)
    .filter(Boolean);
}

function getRequiredDocuments(claimType) {
  return String(claimType || "").toLowerCase() === "inpatient"
    ? INPATIENT_REQUIRED
    : OUTPATIENT_REQUIRED;
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function toBoolean(value) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;

  const normalized = String(value || "").trim().toLowerCase();

  return ["true", "1", "yes", "y", "confirmed"].includes(normalized);
}

function toNumber(value, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function formatKES(value) {
  return `KES ${Math.round(toNumber(value)).toLocaleString()}`;
}

function buildRiskEvent(code, extraDetail = null) {
  const rule = RISK_RULES[code];

  if (!rule) {
    throw new Error(`Unknown FAWE risk rule code: ${code}`);
  }

  return {
    code,
    category: rule.category,
    message: extraDetail ? `${rule.message}: ${extraDetail}` : rule.message,
    points: rule.points,
    recommended_action: rule.action,
  };
}

function addEvent(events, code, extraDetail = null) {
  events.push(buildRiskEvent(code, extraDetail));
}

function calculatePrimaryFaweType(scores) {
  const categories = {
    Fraud: scores.fraud_score,
    Abuse: scores.abuse_score,
    Waste: scores.waste_score,
    Error: scores.error_score,
  };

  const maxScore = Math.max(...Object.values(categories));

  if (maxScore === 0) return "Clean";

  for (const category of FAWE_PRIORITY) {
    if (categories[category] === maxScore) {
      return category;
    }
  }

  return "Clean";
}

function calculateRecommendation(totalRiskScore) {
  if (totalRiskScore >= 70) return "Investigate";
  if (totalRiskScore >= 35) return "Review";
  if (totalRiskScore > 0) return "Approve with Notes";
  return "Approve";
}

function calculateClaimStatus(recommendation, missingDocumentsCount) {
  if (recommendation === "Investigate") return "Investigate";
  if (recommendation === "Review") return "Under Review";
  if (missingDocumentsCount > 0) return "Pending Documents";
  if (recommendation === "Approve" || recommendation === "Approve with Notes") {
    return "Submitted";
  }

  return "Submitted";
}

function calculateScores(events) {
  const scoreByCategory = (category) =>
    Math.min(
      events
        .filter((event) => event.category === category)
        .reduce((sum, event) => sum + Number(event.points), 0),
      100
    );

  const fraud_score = scoreByCategory("Fraud");
  const abuse_score = scoreByCategory("Abuse");
  const waste_score = scoreByCategory("Waste");
  const error_score = scoreByCategory("Error");

  const total_risk_score = Math.min(
    fraud_score + abuse_score + waste_score + error_score,
    100
  );

  return {
    fraud_score,
    abuse_score,
    waste_score,
    error_score,
    total_risk_score,
  };
}

function validateClaimDates(events, claim) {
  const claimStartDate = claim.claim_start_date
    ? new Date(claim.claim_start_date)
    : null;

  const claimEndDate = claim.claim_end_date
    ? new Date(claim.claim_end_date)
    : null;

  const invalidStart =
    !claimStartDate || Number.isNaN(claimStartDate.getTime());

  const invalidEnd =
    !claimEndDate || Number.isNaN(claimEndDate.getTime());

  if (invalidStart || invalidEnd) {
    addEvent(
      events,
      "ERR001",
      "Claim start date or end date is missing/invalid"
    );
    return;
  }

  if (claimEndDate < claimStartDate) {
    addEvent(events, "ERR001", "Claim end date is before claim start date");
  }
}

async function applyDocumentAndErrorRules(events, claim) {
  const requiredDocuments = getRequiredDocuments(claim.claim_type);
  const uploadedDocuments = parseDocumentList(claim.uploaded_documents);

  const missingDocuments = requiredDocuments.filter(
    (document) => !uploadedDocuments.includes(document)
  );

  for (const document of missingDocuments) {
    const code = MISSING_DOCUMENT_RULE_MAP[document];

    if (code) {
      addEvent(events, code);
    }
  }

  validateClaimDates(events, claim);

  if (
    String(claim.claim_type || "").toLowerCase() === "inpatient" &&
    !hasValue(claim.authorization_no)
  ) {
    addEvent(events, "ERR002");
  }

  if (
    claim.diagnosis_procedure_match !== undefined &&
    claim.diagnosis_procedure_match !== null &&
    Number(claim.diagnosis_procedure_match) === 0
  ) {
    addEvent(
      events,
      "ERR003",
      `Diagnosis ${claim.diagnosis || "N/A"} vs procedure ${
        claim.procedure_name || claim.procedure_code || "N/A"
      }`
    );
  }

  return missingDocuments;
}

function applyEtimsRules(events, claim) {
  const invoiceNo = String(claim.invoice_no || "").trim();
  const etimsReceiptNo = String(claim.etims_receipt_no || "").trim();
  const etimsInvoiceReference = String(
    claim.etims_invoice_reference || ""
  ).trim();

  // Missing eTIMS is Error, not Fraud. It is handled by DOC003.
  if (!etimsReceiptNo) return;

  if (invoiceNo && etimsInvoiceReference && invoiceNo !== etimsInvoiceReference) {
    addEvent(
      events,
      "FRAUD005",
      `Invoice ${invoiceNo} vs eTIMS reference ${etimsInvoiceReference}`
    );
  }

  if (
    claim.etims_qr_verified !== undefined &&
    !toBoolean(claim.etims_qr_verified)
  ) {
    addEvent(events, "ETIMS002", `Receipt ${etimsReceiptNo} failed QR validation`);
  }

  if (
    hasValue(claim.etims_amount) &&
    toNumber(claim.etims_amount) > 0 &&
    toNumber(claim.claim_amount) > 0 &&
    toNumber(claim.etims_amount) !== toNumber(claim.claim_amount)
  ) {
    addEvent(
      events,
      "ETIMS003",
      `Claim amount ${formatKES(claim.claim_amount)} vs eTIMS amount ${formatKES(
        claim.etims_amount
      )}`
    );
  }

  if (
    hasValue(claim.provider_pin) &&
    hasValue(claim.etims_provider_pin) &&
    String(claim.provider_pin).trim() !== String(claim.etims_provider_pin).trim()
  ) {
    addEvent(
      events,
      "FRAUD006",
      `Claim PIN ${claim.provider_pin} vs eTIMS PIN ${claim.etims_provider_pin}`
    );
  }
}

async function applyFraudRules(connection, events, claim) {
  if (
    toNumber(claim.fraud_label) === 1 ||
    toNumber(claim.provider_historical_fraud_label) === 1
  ) {
    addEvent(events, "FRAUD002");
  }

  if (
    String(claim.member_visit_confirmed || "").trim().toLowerCase() === "denied"
  ) {
    addEvent(events, "FRAUD003", "Member confirmation response was Denied");
  }

  applyEtimsRules(events, claim);

  const [duplicateRows] = await connection.query(
    `
    SELECT COUNT(*) AS duplicate_count
    FROM fawe_claims
    WHERE insurer_id = ?
      AND member_id = ?
      AND kenya_provider_id = ?
      AND diagnosis = ?
      AND DATE(claim_start_date) = DATE(?)
      AND claim_amount = ?
      AND claim_id <> ?
    `,
    [
      claim.insurer_id,
      claim.member_id,
      claim.kenya_provider_id,
      claim.diagnosis,
      claim.claim_start_date,
      claim.claim_amount,
      claim.claim_id,
    ]
  );

  if (Number(duplicateRows[0].duplicate_count || 0) > 0) {
    addEvent(
      events,
      "FRAUD001",
      "Same member, provider, diagnosis, date, and amount"
    );
  }

  const invoiceNo = String(claim.invoice_no || "").trim();

  if (invoiceNo) {
    const [invoiceRows] = await connection.query(
      `
      SELECT COUNT(*) AS reuse_count
      FROM fawe_claims
      WHERE insurer_id = ?
        AND kenya_provider_id = ?
        AND invoice_no = ?
        AND claim_id <> ?
      `,
      [claim.insurer_id, claim.kenya_provider_id, invoiceNo, claim.claim_id]
    );

    if (Number(invoiceRows[0].reuse_count || 0) > 0) {
      addEvent(
        events,
        "FRAUD004",
        `Invoice ${invoiceNo} appears on multiple claims`
      );
    }
  }
}

async function applyAbuseRules(connection, events, claim) {
  const [memberFrequencyRows] = await connection.query(
    `
    SELECT COUNT(*) AS recent_claims_count
    FROM fawe_claims
    WHERE insurer_id = ?
      AND member_id = ?
      AND claim_start_date BETWEEN DATE_SUB(?, INTERVAL 30 DAY) AND ?
    `,
    [
      claim.insurer_id,
      claim.member_id,
      claim.claim_start_date,
      claim.claim_start_date,
    ]
  );

  const recentClaimsCount = Number(
    memberFrequencyRows[0].recent_claims_count || 0
  );

  if (recentClaimsCount >= THRESHOLDS.memberClaimsLast30Days) {
    addEvent(
      events,
      "ABUSE001",
      `${recentClaimsCount} claims within recent 30-day period`
    );
  }

  const [sameDiagnosisRows] = await connection.query(
    `
    SELECT COUNT(*) AS same_diagnosis_count
    FROM fawe_claims
    WHERE insurer_id = ?
      AND member_id = ?
      AND diagnosis = ?
      AND claim_start_date BETWEEN DATE_SUB(?, INTERVAL 30 DAY) AND ?
    `,
    [
      claim.insurer_id,
      claim.member_id,
      claim.diagnosis,
      claim.claim_start_date,
      claim.claim_start_date,
    ]
  );

  const sameDiagnosisCount = Number(
    sameDiagnosisRows[0].same_diagnosis_count || 0
  );

  if (sameDiagnosisCount >= THRESHOLDS.sameDiagnosisLast30Days) {
    addEvent(
      events,
      "ABUSE002",
      `${sameDiagnosisCount} repeated claims for ${claim.diagnosis}`
    );
  }

  const [providerBillingRows] = await connection.query(
    `
    SELECT COUNT(*) AS provider_claims_same_day
    FROM fawe_claims
    WHERE insurer_id = ?
      AND kenya_provider_id = ?
      AND DATE(claim_start_date) = DATE(?)
    `,
    [claim.insurer_id, claim.kenya_provider_id, claim.claim_start_date]
  );

  const providerClaimsSameDay = Number(
    providerBillingRows[0].provider_claims_same_day || 0
  );

  if (providerClaimsSameDay >= THRESHOLDS.providerClaimsSameDay) {
    addEvent(
      events,
      "ABUSE003",
      `${providerClaimsSameDay} claims submitted by provider on the same day`
    );
  }

  if (String(claim.claim_type || "").toLowerCase() === "inpatient") {
    const [admissionRows] = await connection.query(
      `
      SELECT COUNT(*) AS admission_count
      FROM fawe_claims
      WHERE insurer_id = ?
        AND member_id = ?
        AND LOWER(claim_type) = 'inpatient'
        AND claim_start_date BETWEEN DATE_SUB(?, INTERVAL 180 DAY) AND ?
      `,
      [
        claim.insurer_id,
        claim.member_id,
        claim.claim_start_date,
        claim.claim_start_date,
      ]
    );

    const admissionCount = Number(admissionRows[0].admission_count || 0);

    if (admissionCount >= THRESHOLDS.admissionCountRecent) {
      addEvent(
        events,
        "ABUSE004",
        `${admissionCount} admissions recorded within recent period`
      );
    }
  }
}

async function applyWasteRules(connection, events, claim) {
  const [providerAverageRows] = await connection.query(
    `
    SELECT AVG(claim_amount) AS provider_avg_claim
    FROM fawe_claims
    WHERE insurer_id = ?
      AND kenya_provider_id = ?
      AND claim_id <> ?
    `,
    [claim.insurer_id, claim.kenya_provider_id, claim.claim_id]
  );

  const providerAverage = Number(
    providerAverageRows[0].provider_avg_claim || 0
  );

  if (
    providerAverage > 0 &&
    Number(claim.claim_amount) >
      providerAverage * THRESHOLDS.providerBenchmarkMultiplier
  ) {
    addEvent(
      events,
      "WASTE001",
      `Claim ${formatKES(claim.claim_amount)} vs provider average ${formatKES(
        providerAverage
      )}`
    );
  }

  if (toNumber(claim.unnecessary_diagnostic_test) === 1) {
    addEvent(
      events,
      "WASTE002",
      `${claim.procedure_name || claim.procedure_code || "Diagnostic test"} for ${
        claim.diagnosis || "N/A"
      }`
    );
  } else if (
    LOW_COST_DIAGNOSES.includes(claim.diagnosis) &&
    Number(claim.claim_amount) > THRESHOLDS.lowCostDiagnosisHighAmount
  ) {
    addEvent(
      events,
      "WASTE002",
      `${claim.diagnosis} claim billed at ${formatKES(claim.claim_amount)}`
    );
  }

  if (
    claim.procedure_code !== undefined &&
    hasValue(claim.procedure_code) &&
    ["Lab", "Radiology"].includes(String(claim.procedure_category || ""))
  ) {
    const [repeatDiagnosticRows] = await connection.query(
      `
      SELECT COUNT(*) AS repeat_count
      FROM fawe_claims
      WHERE insurer_id = ?
        AND member_id = ?
        AND procedure_code = ?
        AND procedure_category IN ('Lab', 'Radiology')
        AND claim_start_date BETWEEN DATE_SUB(?, INTERVAL 90 DAY) AND ?
      `,
      [
        claim.insurer_id,
        claim.member_id,
        claim.procedure_code,
        claim.claim_start_date,
        claim.claim_start_date,
      ]
    );

    const repeatCountFromQuery = Number(
      repeatDiagnosticRows[0].repeat_count || 0
    );

    const repeatCountFromColumn = Number(
      claim.repeated_lab_radiology_count || 0
    );

    const repeatCount = Math.max(repeatCountFromQuery, repeatCountFromColumn);

    if (repeatCount >= THRESHOLDS.repeatedLabRadiologyCount) {
      addEvent(
        events,
        "WASTE003",
        `${repeatCount} repeats of ${claim.procedure_name || claim.procedure_code}`
      );
    }
  }

  if (toBoolean(claim.is_brand_drug) && toBoolean(claim.generic_available)) {
    addEvent(
      events,
      "WASTE004",
      `${claim.drug_name || "Brand drug"} used while generic ${
        claim.generic_name || "alternative"
      } exists`
    );
  }

  return providerAverage;
}

async function buildRiskEventsForClaim(connection, claim) {
  const events = [];

  const missingDocuments = await applyDocumentAndErrorRules(events, claim);
  await applyFraudRules(connection, events, claim);
  await applyAbuseRules(connection, events, claim);
  const providerAverage = await applyWasteRules(connection, events, claim);

  return {
    events,
    missingDocuments,
    providerAverage,
  };
}

async function scoreClaimById(claimId) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [claimRows] = await connection.query(
      `
      SELECT *
      FROM fawe_claims
      WHERE claim_id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [claimId]
    );

    if (claimRows.length === 0) {
      const error = new Error("Claim not found.");
      error.statusCode = 404;
      throw error;
    }

    const claim = claimRows[0];

    const { events, missingDocuments, providerAverage } =
      await buildRiskEventsForClaim(connection, claim);

    const scores = calculateScores(events);

    const totalRiskScore = scores.total_risk_score;
    const primaryFaweType = calculatePrimaryFaweType(scores);
    const recommendation = calculateRecommendation(totalRiskScore);
    const claimStatus = calculateClaimStatus(
      recommendation,
      missingDocuments.length
    );

    const riskReasons = events.map((event) => event.message).join("; ");

    const recommendedAction = [
      ...new Set(events.map((event) => event.recommended_action)),
    ].join("; ");

    let estimatedSavings = 0;

    if (["Review", "Investigate"].includes(recommendation)) {
      estimatedSavings = Math.round(
        Number(claim.claim_amount) * Math.min(totalRiskScore / 100, 0.6)
      );
    }

    await connection.query(
      `
      DELETE FROM fawe_claim_events
      WHERE claim_id = ?
      `,
      [claimId]
    );

    for (const event of events) {
      await connection.query(
        `
        INSERT INTO fawe_claim_events (
          claim_id,
          risk_code,
          category,
          points,
          message,
          recommended_action
        )
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          claimId,
          event.code,
          event.category,
          event.points,
          event.message,
          event.recommended_action,
        ]
      );
    }

    await connection.query(
      `
      UPDATE fawe_claims
      SET
        fraud_score = ?,
        abuse_score = ?,
        waste_score = ?,
        error_score = ?,
        total_risk_score = ?,
        primary_fawe_type = ?,
        fraud_flag = ?,
        abuse_flag = ?,
        waste_flag = ?,
        error_flag = ?,
        recommendation = ?,
        claim_status = ?,
        risk_reasons = ?,
        recommended_action = ?,
        estimated_savings = ?,
        missing_documents = ?,
        provider_avg_claim = ?,
        updated_at = NOW()
      WHERE claim_id = ?
      `,
      [
        scores.fraud_score,
        scores.abuse_score,
        scores.waste_score,
        scores.error_score,
        scores.total_risk_score,
        primaryFaweType,
        scores.fraud_score > 0 ? 1 : 0,
        scores.abuse_score > 0 ? 1 : 0,
        scores.waste_score > 0 ? 1 : 0,
        scores.error_score > 0 ? 1 : 0,
        recommendation,
        claimStatus,
        riskReasons,
        recommendedAction,
        estimatedSavings,
        missingDocuments.join(";"),
        providerAverage,
        claimId,
      ]
    );

    await connection.commit();

    return {
      claim_id: claimId,
      fraud_score: scores.fraud_score,
      abuse_score: scores.abuse_score,
      waste_score: scores.waste_score,
      error_score: scores.error_score,
      total_risk_score: scores.total_risk_score,
      primary_fawe_type: primaryFaweType,
      recommendation,
      claim_status: claimStatus,
      risk_reasons: riskReasons,
      recommended_action: recommendedAction,
      estimated_savings: estimatedSavings,
      risk_codes: events.map((event) => ({
        code: event.code,
        category: event.category,
        message: event.message,
        points: event.points,
      })),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  scoreClaimById,
  buildRiskEventsForClaim,
  RISK_RULES,
  OUTPATIENT_REQUIRED,
  INPATIENT_REQUIRED,
  MISSING_DOCUMENT_RULE_MAP,
};