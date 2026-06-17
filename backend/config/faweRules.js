const OUTPATIENT_REQUIRED = ["claims_form", "etims", "invoice"];

const INPATIENT_REQUIRED = [
  "claims_form",
  "etims",
  "invoice",
  "discharge_summary",
  "medical_reports",
];

const MISSING_DOCUMENT_RULE_MAP = {
  invoice: "DOC001",
  claims_form: "DOC002",
  etims: "DOC003",
  discharge_summary: "DOC004",
  medical_reports: "DOC005",
};

const LOW_COST_DIAGNOSES = [
  "Malaria",
  "Typhoid",
  "Gastroenteritis",
  "Respiratory Infection",
];

const FAWE_PRIORITY = ["Fraud", "Abuse", "Waste", "Error"];

const RISK_RULES = {
  DOC001: {
    category: "Error",
    message: "Invoice not uploaded",
    points: 15,
    action: "Request invoice from provider",
  },
  DOC002: {
    category: "Error",
    message: "Claim form not uploaded",
    points: 15,
    action: "Request claim form from provider",
  },
  DOC003: {
    category: "Error",
    message: "eTIMS receipt not uploaded",
    points: 15,
    action: "Request eTIMS receipt from provider",
  },
  DOC004: {
    category: "Error",
    message: "Discharge summary not uploaded",
    points: 15,
    action: "Request discharge summary from provider",
  },
  DOC005: {
    category: "Error",
    message: "Medical report not uploaded",
    points: 15,
    action: "Request medical report from provider",
  },
  ERR001: {
    category: "Error",
    message: "Invalid claim date",
    points: 10,
    action: "Correct claim date before processing",
  },
  ERR002: {
    category: "Error",
    message: "Missing authorization number",
    points: 10,
    action: "Request pre-authorization number",
  },
  ERR003: {
    category: "Error",
    message: "Diagnosis/procedure mismatch",
    points: 10,
    action: "Review diagnosis and procedure coding",
  },

  FRAUD001: {
    category: "Fraud",
    message: "Possible duplicate claim",
    points: 35,
    action: "Investigate possible duplicate billing",
  },
  FRAUD002: {
    category: "Fraud",
    message: "Provider has historical fraud label",
    points: 25,
    action: "Send claim for investigation",
  },
  FRAUD003: {
    category: "Fraud",
    message: "Member denies receiving the service",
    points: 40,
    action: "Contact member and provider for visit verification",
  },
  FRAUD004: {
    category: "Fraud",
    message: "Invoice number appears reused",
    points: 30,
    action: "Investigate reused invoice number",
  },
  FRAUD005: {
    category: "Fraud",
    message: "eTIMS invoice reference mismatch",
    points: 30,
    action: "Investigate possible invoice manipulation",
  },
  FRAUD006: {
    category: "Fraud",
    message: "Provider PIN mismatch between claim and eTIMS",
    points: 30,
    action: "Verify provider registration and eTIMS tax PIN",
  },

  ETIMS002: {
    category: "Fraud",
    message: "eTIMS QR validation failed",
    points: 30,
    action: "Verify eTIMS receipt authenticity",
  },
  ETIMS003: {
    category: "Fraud",
    message: "eTIMS amount does not match invoice amount",
    points: 30,
    action: "Investigate amount mismatch",
  },

  ABUSE001: {
    category: "Abuse",
    message: "Member has excessive claim frequency",
    points: 15,
    action: "Review member utilization history",
  },
  ABUSE002: {
    category: "Abuse",
    message: "Repeated same diagnosis within short period",
    points: 15,
    action: "Review repeated diagnosis pattern",
  },
  ABUSE003: {
    category: "Abuse",
    message: "Provider has excessive billing frequency",
    points: 15,
    action: "Review provider billing pattern",
  },
  ABUSE004: {
    category: "Abuse",
    message: "Too many admissions for the same member",
    points: 20,
    action: "Review admission history and clinical justification",
  },

  WASTE001: {
    category: "Waste",
    message: "Claim amount is above provider peer benchmark",
    points: 20,
    action: "Review billed amount against clinical justification",
  },
  WASTE002: {
    category: "Waste",
    message: "Potentially unnecessary diagnostic test",
    points: 15,
    action: "Review diagnostic test against diagnosis and clinical notes",
  },
  WASTE003: {
    category: "Waste",
    message: "Repeated lab/radiology tests within short period",
    points: 15,
    action: "Review repeated diagnostics and prior results",
  },
  WASTE004: {
    category: "Waste",
    message: "Brand-name drug used where generic exists",
    points: 10,
    action: "Review pharmacy substitution opportunity",
  },
};

module.exports = {
  OUTPATIENT_REQUIRED,
  INPATIENT_REQUIRED,
  MISSING_DOCUMENT_RULE_MAP,
  LOW_COST_DIAGNOSES,
  FAWE_PRIORITY,
  RISK_RULES,
};