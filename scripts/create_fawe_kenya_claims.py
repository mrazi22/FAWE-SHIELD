"""
FAWE Shield Kenya Claims Generator v2

Creates:
- data/kenya/fawe_claims.csv
- data/kenya/fawe_claim_events.csv

Purpose:
- Generate one row per claim in fawe_claims.csv
- Generate one row per triggered FAWE rule in fawe_claim_events.csv
- Keep Python-generated scoring aligned with the Node/Express FAWE endpoint

Main improvements from v1:
- Full FAWE rule dictionary: Fraud, Abuse, Waste, Error
- Adds missing rule codes: FRAUD003, FRAUD006, ABUSE004, WASTE003, WASTE004, ERR003
- Keeps current eTIMS endpoint-compatible rules: ETIMS002 and ETIMS003
- Adds optional future integration fields for SMS/USSD confirmation, provider PIN, procedures, diagnostics, drugs
- Cleaner pipeline using small functions instead of one long script
"""

from __future__ import annotations

import random
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

import numpy as np
import pandas as pd

# -----------------------------------------------------------------------------
# CONFIG
# -----------------------------------------------------------------------------

SEED = 42
random.seed(SEED)
np.random.seed(SEED)

INPUT_FILE = "data/cleaned/master_claims.csv"
CLAIMS_OUTPUT_FILE = "data/kenya/fawe_claims.csv"
CLAIM_EVENTS_OUTPUT_FILE = "data/kenya/fawe_claim_events.csv"
MAX_ROWS = 50_000

# Thresholds should match your Node service where possible.
THRESHOLDS = {
    "member_claims_last_30_days": 4,
    "same_diagnosis_recent_count": 3,
    "provider_claims_same_day": 30,
    "admission_count_recent": 3,
    "claim_above_peer_multiplier": 2.5,
    "low_cost_diagnosis_high_amount": 25_000,
    "repeated_lab_radiology_count": 3,
}

# -----------------------------------------------------------------------------
# MASTER DATA
# -----------------------------------------------------------------------------

KENYA_PROVIDERS: List[Tuple[str, str, str, str, str, str]] = [
    # provider_id, provider_name, county, provider_type, mobile, kra_pin/provider_pin
    ("KNH001", "Kenyatta National Hospital", "Nairobi", "National", "+254711000001", "P051111111A"),
    ("MTRH001", "Moi Teaching and Referral Hospital", "Uasin Gishu", "National", "+254711000002", "P052222222B"),
    ("JOOTRH001", "Jaramogi Oginga Odinga Teaching and Referral Hospital", "Kisumu", "Referral", "+254711000003", "P053333333C"),
    ("KCRH001", "Kisii County Referral Hospital", "Kisii", "Referral", "+254711000004", "P054444444D"),
    ("AKUH001", "Aga Khan University Hospital", "Nairobi", "Private", "+254711000005", "P055555555E"),
    ("MPSH001", "MP Shah Hospital", "Nairobi", "Private", "+254711000006", "P056666666F"),
    ("NRH001", "Nakuru Level 5 Hospital", "Nakuru", "County", "+254711000007", "P057777777G"),
    ("KSMCH001", "Kisumu County Hospital", "Kisumu", "County", "+254711000008", "P058888888H"),
]

PROVIDER_PREFIX = {
    "KNH001": "KN",
    "MTRH001": "MTRH",
    "JOOTRH001": "JOO",
    "KCRH001": "KCRH",
    "AKUH001": "AKH",
    "MPSH001": "MPSH",
    "NRH001": "NRH",
    "KSMCH001": "KSM",
}

INSURERS = [
    ("INS001", "XYZ Health Insurance"),
    ("INS002", "AXE Health Insurance"),
    ("INS003", "CUO Health Insurance"),
    ("INS004", "MMM Health Insurance"),
    ("INS005", "AKA Health Insurance"),
]

SCHEMES = [
    "Corporate Medical Scheme",
    "Family Cover Scheme",
    "SME Health Scheme",
    "Executive Medical Scheme",
    "Student Medical Scheme",
]

FIRST_NAMES = [
    "Brian", "Mary", "John", "Faith", "Kevin", "Grace", "Peter", "Ann",
    "David", "Mercy", "James", "Sharon", "Daniel", "Lucy", "Samuel",
]

LAST_NAMES = [
    "Otieno", "Wambui", "Mwangi", "Achieng", "Kiptoo", "Mutiso",
    "Njoroge", "Omondi", "Cherono", "Kamau", "Atieno", "Wekesa",
]

DIAGNOSES = [
    "Malaria", "Typhoid", "Pneumonia", "Hypertension", "Diabetes",
    "Maternal Care", "HIV Follow-up", "Dental Care", "Mental Health",
    "Gastroenteritis", "Respiratory Infection",
]

DIAGNOSIS_AMOUNT_RANGES = {
    "Malaria": (1_000, 7_000),
    "Typhoid": (1_500, 9_000),
    "Pneumonia": (7_000, 45_000),
    "Hypertension": (1_000, 12_000),
    "Diabetes": (2_000, 18_000),
    "Maternal Care": (8_000, 90_000),
    "HIV Follow-up": (1_500, 15_000),
    "Dental Care": (2_000, 30_000),
    "Mental Health": (2_500, 25_000),
    "Gastroenteritis": (1_500, 12_000),
    "Respiratory Infection": (2_000, 18_000),
}

PLANS = ["Bronze", "Silver", "Gold", "Executive"]

OUTPATIENT_REQUIRED = {"claims_form", "etims", "invoice"}
INPATIENT_REQUIRED = {"claims_form", "etims", "invoice", "discharge_summary", "medical_reports"}

LOW_COST_DIAGNOSES = {"Malaria", "Typhoid", "Gastroenteritis", "Respiratory Infection"}

PROCEDURE_CATALOG = [
    # procedure_code, procedure_name, procedure_category, normally_needed_for
    ("CONS001", "General consultation", "Consultation", "all"),
    ("LAB001", "Full haemogram", "Lab", "Pneumonia"),
    ("LAB002", "Malaria blood smear", "Lab", "Malaria"),
    ("LAB003", "HbA1c test", "Lab", "Diabetes"),
    ("RAD001", "Chest X-ray", "Radiology", "Pneumonia"),
    ("RAD002", "Abdominal ultrasound", "Radiology", "Maternal Care"),
    ("PROC001", "Dental extraction", "Procedure", "Dental Care"),
    ("PROC002", "Counselling session", "Procedure", "Mental Health"),
]

BRAND_DRUGS = [
    # brand_name, generic_name, generic_price
    ("Panadol Extra", "Paracetamol", 120),
    ("Augmentin", "Amoxicillin Clavulanate", 650),
    ("Ventolin", "Salbutamol", 300),
    ("Glucophage", "Metformin", 180),
    ("Coartem", "Artemether Lumefantrine", 250),
]

# -----------------------------------------------------------------------------
# RULE DEFINITIONS
# -----------------------------------------------------------------------------

RISK_RULES: Dict[str, Dict[str, Any]] = {
    # Fraud
    "FRAUD001": {
        "category": "Fraud",
        "message": "Possible duplicate claim",
        "points": 35,
        "action": "Investigate possible duplicate billing",
    },
    "FRAUD002": {
        "category": "Fraud",
        "message": "Provider has historical fraud label",
        "points": 25,
        "action": "Send claim for investigation",
    },
    "FRAUD003": {
        "category": "Fraud",
        "message": "Member denies receiving the service",
        "points": 40,
        "action": "Contact member and provider for visit verification",
    },
    "FRAUD004": {
        "category": "Fraud",
        "message": "Invoice number appears reused",
        "points": 30,
        "action": "Investigate reused invoice number",
    },
    "FRAUD005": {
        "category": "Fraud",
        "message": "eTIMS invoice reference mismatch",
        "points": 30,
        "action": "Investigate possible invoice manipulation",
    },
    "FRAUD006": {
        "category": "Fraud",
        "message": "Provider PIN mismatch between claim and eTIMS",
        "points": 30,
        "action": "Verify provider registration and eTIMS tax PIN",
    },

    # Current endpoint-compatible eTIMS rules. Keep these if your Node service still uses them.
    "ETIMS002": {
        "category": "Fraud",
        "message": "eTIMS QR validation failed",
        "points": 35,
        "action": "Validate eTIMS receipt using KRA/eTIMS source",
    },
    "ETIMS003": {
        "category": "Fraud",
        "message": "eTIMS amount does not match claim amount",
        "points": 25,
        "action": "Compare submitted invoice, eTIMS receipt, and claim amount",
    },

    # Abuse
    "ABUSE001": {
        "category": "Abuse",
        "message": "Member has excessive claim frequency",
        "points": 15,
        "action": "Review member utilization history",
    },
    "ABUSE002": {
        "category": "Abuse",
        "message": "Repeated same diagnosis within short period",
        "points": 15,
        "action": "Review repeated diagnosis pattern",
    },
    "ABUSE003": {
        "category": "Abuse",
        "message": "Provider has excessive billing frequency",
        "points": 15,
        "action": "Review provider billing pattern",
    },
    "ABUSE004": {
        "category": "Abuse",
        "message": "Too many admissions for the same member",
        "points": 20,
        "action": "Review admission history and clinical justification",
    },

    # Waste
    "WASTE001": {
        "category": "Waste",
        "message": "Claim amount is above provider peer benchmark",
        "points": 20,
        "action": "Review billed amount against clinical justification",
    },
    "WASTE002": {
        "category": "Waste",
        "message": "Potentially unnecessary diagnostic test",
        "points": 15,
        "action": "Review diagnostic test against diagnosis and clinical notes",
    },
    "WASTE003": {
        "category": "Waste",
        "message": "Repeated lab/radiology tests within short period",
        "points": 15,
        "action": "Review repeated diagnostics and prior results",
    },
    "WASTE004": {
        "category": "Waste",
        "message": "Brand-name drug used where generic exists",
        "points": 10,
        "action": "Review pharmacy substitution opportunity",
    },

    # Documentation / Error
    "DOC001": {
        "category": "Error",
        "message": "Invoice not uploaded",
        "points": 15,
        "action": "Request invoice from provider",
    },
    "DOC002": {
        "category": "Error",
        "message": "Claim form not uploaded",
        "points": 15,
        "action": "Request claim form from provider",
    },
    "DOC003": {
        "category": "Error",
        "message": "eTIMS receipt not uploaded",
        "points": 15,
        "action": "Request eTIMS receipt from provider",
    },
    "DOC004": {
        "category": "Error",
        "message": "Discharge summary not uploaded",
        "points": 15,
        "action": "Request discharge summary from provider",
    },
    "DOC005": {
        "category": "Error",
        "message": "Medical report not uploaded",
        "points": 15,
        "action": "Request medical report from provider",
    },
    "ERR001": {
        "category": "Error",
        "message": "Invalid claim date",
        "points": 10,
        "action": "Correct claim date before processing",
    },
    "ERR002": {
        "category": "Error",
        "message": "Missing authorization number",
        "points": 10,
        "action": "Request pre-authorization number",
    },
    "ERR003": {
        "category": "Error",
        "message": "Diagnosis/procedure mismatch",
        "points": 10,
        "action": "Review diagnosis and procedure coding",
    },
}

MISSING_DOCUMENT_RULE_MAP = {
    "invoice": "DOC001",
    "claims_form": "DOC002",
    "etims": "DOC003",
    "discharge_summary": "DOC004",
    "medical_reports": "DOC005",
}

FAWE_PRIORITY = ["Fraud", "Abuse", "Waste", "Error"]

CLAIM_STATUS_MAP = {
    "Approve": "Submitted",
    "Approve with Notes": "Pending Documents",
    "Review": "Under Review",
    "Investigate": "Investigate",
}

# -----------------------------------------------------------------------------
# HELPERS
# -----------------------------------------------------------------------------

@dataclass(frozen=True)
class RiskEvent:
    code: str
    category: str
    message: str
    points: int
    recommended_action: str

    def to_record(self, claim_id: str) -> Dict[str, object]:
        return {
            "claim_id": claim_id,
            "risk_code": self.code,
            "category": self.category,
            "points": self.points,
            "message": self.message,
            "recommended_action": self.recommended_action,
        }


def as_bool_int(value: object) -> int:
    return int(bool(value))


def choose_provider() -> Tuple[str, str, str, str, str, str]:
    return random.choice(KENYA_PROVIDERS)


def choose_insurer() -> Tuple[str, str]:
    return random.choice(INSURERS)


def generate_member_name() -> str:
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"


def generate_member_mobile() -> str:
    prefixes = [
        "701", "702", "703", "704", "705", "707", "708", "710",
        "711", "712", "713", "714", "715", "716", "717", "718",
        "719", "720", "721", "722", "723", "724", "725", "726",
        "727", "728", "729",
    ]
    return f"+254{random.choice(prefixes)}{random.randint(100000, 999999)}"


def generate_member_email(member_name: str, member_id: str) -> str:
    clean_name = str(member_name).lower().replace(" ", ".")
    clean_id = str(member_id).lower()
    return f"{clean_name}.{clean_id}@example.co.ke"


def generate_amount(diagnosis: str, claim_type: str) -> int:
    low, high = DIAGNOSIS_AMOUNT_RANGES.get(diagnosis, (1_000, 10_000))

    if claim_type == "Inpatient":
        low *= 4
        high *= 6

    return int(random.randint(low, high))


def generate_documents(claim_type: str) -> Tuple[str, str]:
    required = OUTPATIENT_REQUIRED if claim_type == "Outpatient" else INPATIENT_REQUIRED
    uploaded = set(required)

    # Randomly remove one required document from some claims.
    if random.random() < 0.12 and uploaded:
        uploaded.remove(random.choice(list(uploaded)))

    missing = sorted(required - uploaded)
    return ";".join(sorted(uploaded)), ";".join(missing)


def generate_invoice_number(provider_id: str) -> str:
    prefix = PROVIDER_PREFIX.get(provider_id, "INV")
    return f"{prefix}-{random.randint(1, 999999):06d}"


def generate_etims_receipt(claim_date: Any) -> str:
    parsed_date = pd.to_datetime(claim_date, errors="coerce")
    date_part = datetime.now().strftime("%Y%m%d") if pd.isna(parsed_date) else parsed_date.strftime("%Y%m%d")
    return f"ETM-{date_part}-{random.randint(1, 999999):06d}"


def generate_claim_form_no(claim_date: Any) -> str:
    parsed_date = pd.to_datetime(claim_date, errors="coerce")
    year = datetime.now().year if pd.isna(parsed_date) else parsed_date.year
    return f"CF-{year}-{random.randint(1, 999999):06d}"


def generate_authorization_no(claim_type: str, claim_date: Any) -> str:
    if claim_type != "Inpatient":
        return ""

    parsed_date = pd.to_datetime(claim_date, errors="coerce")
    year = datetime.now().year if pd.isna(parsed_date) else parsed_date.year

    # Mostly present for inpatient, missing sometimes to trigger ERR002.
    if random.random() < 0.08:
        return ""

    return f"PA-{year}-{random.randint(1, 999999):06d}"


def generate_member_card_no(member_id: str) -> str:
    member_number = str(member_id).replace("BENE", "").strip()
    if not member_number or not member_number.isdigit():
        member_number = str(random.randint(1, 999999))
    return f"SHA-{int(member_number):06d}"


def build_risk_event(code: str, extra_detail: Optional[str] = None) -> RiskEvent:
    rule = RISK_RULES[code]
    message = str(rule["message"])

    if extra_detail:
        message = f"{message}: {extra_detail}"

    return RiskEvent(
        code=code,
        category=str(rule["category"]),
        message=message,
        points=int(rule["points"]),
        recommended_action=str(rule["action"]),
    )


def calculate_primary_fawe_type(scores: Dict[str, int]) -> str:
    max_score = max(scores.values())

    if max_score == 0:
        return "Clean"

    for category in FAWE_PRIORITY:
        if scores.get(category, 0) == max_score:
            return category

    return "Clean"


def calculate_recommendation(total_risk_score: int) -> str:
    if total_risk_score >= 70:
        return "Investigate"
    if total_risk_score >= 35:
        return "Review"
    if total_risk_score > 0:
        return "Approve with Notes"
    return "Approve"


def score_events(events: Iterable[RiskEvent]) -> Dict[str, int]:
    events_list = list(events)
    return {
        "Fraud": min(sum(e.points for e in events_list if e.category == "Fraud"), 100),
        "Abuse": min(sum(e.points for e in events_list if e.category == "Abuse"), 100),
        "Waste": min(sum(e.points for e in events_list if e.category == "Waste"), 100),
        "Error": min(sum(e.points for e in events_list if e.category == "Error"), 100),
    }

# -----------------------------------------------------------------------------
# ENRICHMENT FUNCTIONS
# -----------------------------------------------------------------------------


def load_base_claims() -> pd.DataFrame:
    claims = pd.read_csv(INPUT_FILE)
    claims = claims.sample(min(len(claims), MAX_ROWS), random_state=SEED).copy()

    required_cols = {"claim_id", "provider_id", "member_id", "claim_type", "claim_start_date", "claim_end_date", "fraud_label"}
    missing_cols = required_cols - set(claims.columns)

    if missing_cols:
        raise ValueError(f"Input file is missing required columns: {sorted(missing_cols)}")

    return claims


def add_provider_details(claims: pd.DataFrame) -> pd.DataFrame:
    provider_map = {provider: choose_provider() for provider in claims["provider_id"].dropna().unique()}
    provider_details = claims["provider_id"].map(provider_map)

    claims["kenya_provider_id"] = provider_details.apply(lambda x: x[0])
    claims["provider_name"] = provider_details.apply(lambda x: x[1])
    claims["county"] = provider_details.apply(lambda x: x[2])
    claims["provider_type"] = provider_details.apply(lambda x: x[3])
    claims["provider_mobile"] = provider_details.apply(lambda x: x[4])
    claims["provider_pin"] = provider_details.apply(lambda x: x[5])

    return claims


def add_member_profiles(claims: pd.DataFrame) -> pd.DataFrame:
    member_profile_map: Dict[str, Dict[str, object]] = {}

    for member_id in claims["member_id"].dropna().unique():
        member_name = generate_member_name()
        insurer_id, insurer_name = choose_insurer()

        member_profile_map[member_id] = {
            "member_name": member_name,
            "member_mobile": generate_member_mobile(),
            "member_email": generate_member_email(member_name, member_id),
            "insurer_id": insurer_id,
            "insurer_name": insurer_name,
            "scheme_name": random.choice(SCHEMES),
            "sms_opt_in": random.random() < 0.85,
        }

    profile_df = pd.DataFrame.from_dict(member_profile_map, orient="index")
    profile_df.index.name = "member_id"

    return claims.merge(profile_df, on="member_id", how="left")


def add_basic_claim_details(claims: pd.DataFrame) -> pd.DataFrame:
    claims["diagnosis"] = np.random.choice(DIAGNOSES, size=len(claims))
    claims["plan_type"] = np.random.choice(PLANS, size=len(claims))

    claims["claim_amount"] = claims.apply(lambda row: generate_amount(row["diagnosis"], row["claim_type"]), axis=1)

    docs = claims["claim_type"].apply(generate_documents)
    claims["uploaded_documents"] = docs.apply(lambda x: x[0])
    claims["missing_documents"] = docs.apply(lambda x: x[1])

    claims["claim_start_date"] = pd.to_datetime(claims["claim_start_date"], errors="coerce")
    claims["claim_end_date"] = pd.to_datetime(claims["claim_end_date"], errors="coerce")

    claims["member_card_no"] = claims["member_id"].apply(generate_member_card_no)
    claims["claim_form_no"] = claims["claim_start_date"].apply(generate_claim_form_no)
    claims["authorization_no"] = claims.apply(lambda row: generate_authorization_no(row["claim_type"], row["claim_start_date"]), axis=1)

    return claims


def add_etims_fields(claims: pd.DataFrame) -> pd.DataFrame:
    records = []

    for _, row in claims.iterrows():
        uploaded_set = set(str(row["uploaded_documents"]).split(";"))
        invoice_no = generate_invoice_number(row["kenya_provider_id"])

        if "etims" not in uploaded_set:
            records.append({
                "invoice_no": invoice_no,
                "etims_receipt_no": "",
                "etims_invoice_reference": "",
                "etims_verified": False,
                "etims_qr_verified": False,
                "etims_amount": 0,
                "etims_provider_pin": "",
            })
            continue

        # Mostly correct, sometimes mismatched.
        etims_invoice_reference = invoice_no if random.random() > 0.08 else generate_invoice_number(row["kenya_provider_id"])
        etims_qr_verified = random.random() > 0.03

        # Mostly same as claim amount, sometimes different to trigger ETIMS003.
        etims_amount = int(row["claim_amount"])
        if random.random() < 0.04:
            etims_amount = int(row["claim_amount"] * random.choice([0.75, 0.9, 1.15, 1.25]))

        # Mostly same provider PIN, sometimes mismatched to trigger FRAUD006.
        etims_provider_pin = row["provider_pin"] if random.random() > 0.03 else random.choice(KENYA_PROVIDERS)[5]

        records.append({
            "invoice_no": invoice_no,
            "etims_receipt_no": generate_etims_receipt(row["claim_start_date"]),
            "etims_invoice_reference": etims_invoice_reference,
            "etims_verified": invoice_no == etims_invoice_reference,
            "etims_qr_verified": etims_qr_verified,
            "etims_amount": etims_amount,
            "etims_provider_pin": etims_provider_pin,
        })

    return pd.concat([claims, pd.DataFrame(records, index=claims.index)], axis=1)


def add_member_confirmation_fields(claims: pd.DataFrame) -> pd.DataFrame:
    # Future Africa's Talking SMS/USSD confirmation simulation.
    # Confirmed = member agrees visit happened.
    # Denied = possible ghost patient/service.
    # Pending = no response yet.
    statuses = ["Confirmed", "Denied", "Pending"]
    probabilities = [0.90, 0.025, 0.075]
    claims["member_visit_confirmed"] = np.random.choice(statuses, p=probabilities, size=len(claims))
    return claims


def choose_procedure_for_diagnosis(diagnosis: str) -> Tuple[str, str, str, int]:
    # Mostly choose a clinically plausible procedure; sometimes choose an unrelated diagnostic.
    matching = [p for p in PROCEDURE_CATALOG if p[3] in {diagnosis, "all"}]
    unrelated = [p for p in PROCEDURE_CATALOG if p[3] not in {diagnosis, "all"}]

    if random.random() < 0.88 and matching:
        chosen = random.choice(matching)
        match_flag = 1
    else:
        chosen = random.choice(unrelated or PROCEDURE_CATALOG)
        match_flag = 0

    return chosen[0], chosen[1], chosen[2], match_flag


def add_procedure_and_pharmacy_fields(claims: pd.DataFrame) -> pd.DataFrame:
    procedure_records = []
    pharmacy_records = []

    for _, row in claims.iterrows():
        procedure_code, procedure_name, procedure_category, diagnosis_procedure_match = choose_procedure_for_diagnosis(row["diagnosis"])

        # A claim can be flagged as potentially unnecessary when procedure does not match low-risk/low-cost diagnosis.
        unnecessary_diagnostic_test = int(
            procedure_category in {"Lab", "Radiology"}
            and row["diagnosis"] in LOW_COST_DIAGNOSES
            and diagnosis_procedure_match == 0
        )

        procedure_records.append({
            "procedure_code": procedure_code,
            "procedure_name": procedure_name,
            "procedure_category": procedure_category,
            "diagnosis_procedure_match": diagnosis_procedure_match,
            "unnecessary_diagnostic_test": unnecessary_diagnostic_test,
        })

        if random.random() < 0.35:
            brand_name, generic_name, generic_price = random.choice(BRAND_DRUGS)
            is_brand_drug = random.random() < 0.65
            generic_available = True
            drug_name = brand_name if is_brand_drug else generic_name
            drug_price = int(generic_price * random.uniform(1.8, 4.0)) if is_brand_drug else generic_price
        else:
            drug_name = ""
            generic_name = ""
            generic_price = 0
            drug_price = 0
            is_brand_drug = False
            generic_available = False

        pharmacy_records.append({
            "drug_name": drug_name,
            "generic_name": generic_name,
            "drug_price": drug_price,
            "generic_available": generic_available,
            "generic_price": generic_price,
            "is_brand_drug": is_brand_drug,
        })

    claims = pd.concat([claims, pd.DataFrame(procedure_records, index=claims.index)], axis=1)
    claims = pd.concat([claims, pd.DataFrame(pharmacy_records, index=claims.index)], axis=1)

    return claims


def add_pattern_features(claims: pd.DataFrame) -> pd.DataFrame:
    claims["provider_avg_claim"] = (
        claims.groupby(["insurer_id", "kenya_provider_id"])["claim_amount"]
        .transform("mean")
        .round(2)
    )

    claims = claims.sort_values(["insurer_id", "member_id", "claim_start_date"]).copy()

    claims["member_claims_last_30_days"] = claims.groupby(["insurer_id", "member_id"]).cumcount()

    claims["same_diagnosis_recent_count"] = (
        claims.groupby(["insurer_id", "member_id", "diagnosis"]).cumcount() + 1
    )

    claims["claim_date_only"] = claims["claim_start_date"].dt.date

    claims["provider_claims_same_day"] = (
        claims.groupby(["insurer_id", "kenya_provider_id", "claim_date_only"])["claim_id"].transform("count")
    )

    admission_mask = claims["claim_type"].eq("Inpatient")
    claims["admission_count_recent"] = 0
    claims.loc[admission_mask, "admission_count_recent"] = (
        claims.loc[admission_mask]
        .groupby(["insurer_id", "member_id"])
        .cumcount()
        + 1
    )

    duplicate_columns = ["insurer_id", "member_id", "kenya_provider_id", "diagnosis", "claim_start_date", "claim_amount"]
    claims["possible_duplicate_claim"] = claims.duplicated(subset=duplicate_columns, keep=False).astype(int)

    claims["invoice_reuse_count"] = (
        claims.groupby(["insurer_id", "kenya_provider_id", "invoice_no"])["claim_id"].transform("count")
    )

    claims["invoice_reused"] = (
        (claims["invoice_no"].astype(str).str.strip() != "")
        & (claims["invoice_reuse_count"] > 1)
    ).astype(int)

    # Count repeated lab/radiology test patterns.
    lab_rad_mask = claims["procedure_category"].isin(["Lab", "Radiology"])
    claims["repeated_lab_radiology_count"] = 0
    claims.loc[lab_rad_mask, "repeated_lab_radiology_count"] = (
        claims.loc[lab_rad_mask]
        .groupby(["insurer_id", "member_id", "procedure_code"])
        .cumcount()
        + 1
    )

    return claims

# -----------------------------------------------------------------------------
# RISK ENGINE
# -----------------------------------------------------------------------------


def calculate_risk(row: pd.Series) -> pd.Series:
    events: List[RiskEvent] = []

    # -------------------------
    # Error / documentation rules
    # -------------------------
    missing_docs = str(row.get("missing_documents", "")).strip()
    if missing_docs:
        for document in missing_docs.split(";"):
            rule_code = MISSING_DOCUMENT_RULE_MAP.get(document.strip())
            if rule_code:
                events.append(build_risk_event(rule_code))

    claim_start = row.get("claim_start_date")
    claim_end = row.get("claim_end_date")

    if pd.isna(claim_start) or pd.isna(claim_end) or (not pd.isna(claim_start) and not pd.isna(claim_end) and claim_end < claim_start):
        events.append(build_risk_event("ERR001"))

    if row.get("claim_type") == "Inpatient" and not str(row.get("authorization_no", "")).strip():
        events.append(build_risk_event("ERR002"))

    if int(row.get("diagnosis_procedure_match", 1)) == 0:
        events.append(build_risk_event(
            "ERR003",
            f"Diagnosis {row.get('diagnosis')} does not align with procedure {row.get('procedure_name')}",
        ))

    # -------------------------
    # Fraud rules
    # -------------------------
    if int(row.get("possible_duplicate_claim", 0)) == 1:
        events.append(build_risk_event("FRAUD001", "Same member, provider, diagnosis, date, and amount"))

    if int(row.get("fraud_label", 0)) == 1:
        events.append(build_risk_event("FRAUD002"))

    if str(row.get("member_visit_confirmed", "")).strip().lower() == "denied":
        events.append(build_risk_event("FRAUD003", "Member confirmation response was Denied"))

    if int(row.get("invoice_reused", 0)) == 1:
        events.append(build_risk_event("FRAUD004", f"Invoice {row.get('invoice_no')} appears on multiple claims"))

    invoice_no = str(row.get("invoice_no", "")).strip()
    etims_invoice_reference = str(row.get("etims_invoice_reference", "")).strip()

    if invoice_no and etims_invoice_reference and invoice_no != etims_invoice_reference:
        events.append(build_risk_event("FRAUD005", f"Invoice {invoice_no} vs eTIMS reference {etims_invoice_reference}"))

    provider_pin = str(row.get("provider_pin", "")).strip()
    etims_provider_pin = str(row.get("etims_provider_pin", "")).strip()

    if provider_pin and etims_provider_pin and provider_pin != etims_provider_pin:
        events.append(build_risk_event("FRAUD006", f"Claim PIN {provider_pin} vs eTIMS PIN {etims_provider_pin}"))

    # Keep if your Node service still uses ETIMS002/ETIMS003.
    if str(row.get("etims_receipt_no", "")).strip() and not bool(row.get("etims_qr_verified", True)):
        events.append(build_risk_event("ETIMS002", f"Receipt {row.get('etims_receipt_no')} failed QR validation"))

    etims_amount = int(row.get("etims_amount", 0) or 0)
    claim_amount = int(row.get("claim_amount", 0) or 0)

    if etims_amount > 0 and claim_amount > 0 and etims_amount != claim_amount:
        events.append(build_risk_event("ETIMS003", f"Claim amount KES {claim_amount:,.0f} vs eTIMS amount KES {etims_amount:,.0f}"))

    # -------------------------
    # Abuse rules
    # -------------------------
    if int(row.get("member_claims_last_30_days", 0)) >= THRESHOLDS["member_claims_last_30_days"]:
        events.append(build_risk_event("ABUSE001", f"{row.get('member_claims_last_30_days')} claims within recent period"))

    if int(row.get("same_diagnosis_recent_count", 0)) >= THRESHOLDS["same_diagnosis_recent_count"]:
        events.append(build_risk_event("ABUSE002", f"{row.get('same_diagnosis_recent_count')} repeated claims for {row.get('diagnosis')}"))

    if int(row.get("provider_claims_same_day", 0)) >= THRESHOLDS["provider_claims_same_day"]:
        events.append(build_risk_event("ABUSE003", f"{row.get('provider_claims_same_day')} claims submitted by provider on the same day"))

    if row.get("claim_type") == "Inpatient" and int(row.get("admission_count_recent", 0)) >= THRESHOLDS["admission_count_recent"]:
        events.append(build_risk_event("ABUSE004", f"{row.get('admission_count_recent')} admissions recorded for this member"))

    # -------------------------
    # Waste rules
    # -------------------------
    provider_avg_claim = float(row.get("provider_avg_claim", 0) or 0)

    if provider_avg_claim > 0 and claim_amount > provider_avg_claim * THRESHOLDS["claim_above_peer_multiplier"]:
        events.append(build_risk_event("WASTE001", f"Claim KES {claim_amount:,.0f} vs provider average KES {provider_avg_claim:,.0f}"))

    if int(row.get("unnecessary_diagnostic_test", 0)) == 1:
        events.append(build_risk_event("WASTE002", f"{row.get('procedure_name')} for {row.get('diagnosis')}"))

    if int(row.get("repeated_lab_radiology_count", 0)) >= THRESHOLDS["repeated_lab_radiology_count"]:
        events.append(build_risk_event("WASTE003", f"{row.get('repeated_lab_radiology_count')} repeats of {row.get('procedure_name')}"))

    if bool(row.get("is_brand_drug", False)) and bool(row.get("generic_available", False)):
        events.append(build_risk_event("WASTE004", f"{row.get('drug_name')} used while generic {row.get('generic_name')} exists"))

    scores = score_events(events)
    total_risk_score = min(sum(scores.values()), 100)
    primary_fawe_type = calculate_primary_fawe_type(scores)
    recommendation = calculate_recommendation(total_risk_score)

    risk_reasons = "; ".join(event.message for event in events)
    recommended_action = "; ".join(sorted({event.recommended_action for event in events}))

    estimated_savings = 0
    if recommendation in {"Review", "Investigate"}:
        estimated_savings = int(claim_amount * min(total_risk_score / 100, 0.6))

    return pd.Series({
        "fraud_score": scores["Fraud"],
        "abuse_score": scores["Abuse"],
        "waste_score": scores["Waste"],
        "error_score": scores["Error"],
        "total_risk_score": total_risk_score,
        "primary_fawe_type": primary_fawe_type,
        "recommendation": recommendation,
        "risk_reasons": risk_reasons,
        "risk_event_objects": events,
        "recommended_action": recommended_action,
        "estimated_savings": estimated_savings,
        "fraud_flag": int(scores["Fraud"] > 0),
        "abuse_flag": int(scores["Abuse"] > 0),
        "waste_flag": int(scores["Waste"] > 0),
        "error_flag": int(scores["Error"] > 0),
    })

# -----------------------------------------------------------------------------
# OUTPUT
# -----------------------------------------------------------------------------


def build_claim_events(claims: pd.DataFrame) -> pd.DataFrame:
    records: List[Dict[str, object]] = []

    for _, claim_row in claims.iterrows():
        events = claim_row.get("risk_event_objects", [])
        for event in events:
            records.append(event.to_record(str(claim_row["claim_id"])))

    claim_events = pd.DataFrame(records, columns=[
        "claim_id", "risk_code", "category", "points", "message", "recommended_action"
    ])

    if not claim_events.empty:
        claim_events.insert(0, "id", range(1, len(claim_events) + 1))

    return claim_events


def build_final_claims(claims: pd.DataFrame) -> pd.DataFrame:
    current_timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    claims["claim_status"] = claims["recommendation"].map(CLAIM_STATUS_MAP).fillna("Submitted")
    claims["created_at"] = current_timestamp
    claims["updated_at"] = current_timestamp

    final_columns = [
        "claim_id",

        "insurer_id", "insurer_name", "scheme_name",

        "member_id", "member_card_no", "member_name", "member_mobile", "member_email", "sms_opt_in",

        "kenya_provider_id", "provider_name", "provider_mobile", "county", "provider_type", "provider_pin",

        "claim_type", "claim_start_date", "claim_end_date", "diagnosis", "plan_type", "claim_amount",

        "uploaded_documents", "missing_documents",

        "claim_form_no", "authorization_no", "invoice_no", "etims_receipt_no", "etims_invoice_reference",
        "etims_verified", "etims_qr_verified", "etims_amount", "etims_provider_pin",

        "member_visit_confirmed",

        "procedure_code", "procedure_name", "procedure_category", "diagnosis_procedure_match",
        "unnecessary_diagnostic_test", "repeated_lab_radiology_count",

        "drug_name", "generic_name", "drug_price", "generic_available", "generic_price", "is_brand_drug",

        "provider_avg_claim", "member_claims_last_30_days", "same_diagnosis_recent_count",
        "provider_claims_same_day", "admission_count_recent", "possible_duplicate_claim", "invoice_reused",

        "fraud_label",

        "fraud_score", "abuse_score", "waste_score", "error_score", "total_risk_score", "primary_fawe_type",

        "fraud_flag", "abuse_flag", "waste_flag", "error_flag",

        "recommendation", "risk_reasons", "recommended_action", "estimated_savings", "claim_status",
        "created_at", "updated_at",
    ]

    missing = [col for col in final_columns if col not in claims.columns]
    if missing:
        raise ValueError(f"Final claims output is missing columns: {missing}")

    return claims[final_columns].copy()


def write_outputs(final_claims: pd.DataFrame, claim_events: pd.DataFrame) -> None:
    Path(CLAIMS_OUTPUT_FILE).parent.mkdir(parents=True, exist_ok=True)
    Path(CLAIM_EVENTS_OUTPUT_FILE).parent.mkdir(parents=True, exist_ok=True)

    final_claims.to_csv(CLAIMS_OUTPUT_FILE, index=False)
    claim_events.to_csv(CLAIM_EVENTS_OUTPUT_FILE, index=False)


def print_summary(final_claims: pd.DataFrame, claim_events: pd.DataFrame) -> None:
    print(f"Created {CLAIMS_OUTPUT_FILE}")
    print(f"Created {CLAIM_EVENTS_OUTPUT_FILE}")

    print("\nClaims preview:")
    print(final_claims.head())
    print(final_claims.shape)

    print("\nClaim events preview:")
    print(claim_events.head())
    print(claim_events.shape)

    print("\nDashboard summary:")
    print("Claims processed:", len(final_claims))
    print("FAWE events generated:", len(claim_events))
    print("Fraud cases:", len(final_claims[final_claims["fraud_flag"] == 1]))
    print("Abuse cases:", len(final_claims[final_claims["abuse_flag"] == 1]))
    print("Waste cases:", len(final_claims[final_claims["waste_flag"] == 1]))
    print("Error cases:", len(final_claims[final_claims["error_flag"] == 1]))
    print("High risk claims:", len(final_claims[final_claims["total_risk_score"] >= 70]))
    print("Review claims:", len(final_claims[final_claims["recommendation"] == "Review"]))
    print("Investigate claims:", len(final_claims[final_claims["recommendation"] == "Investigate"]))
    print("Estimated savings: KES {:,.0f}".format(final_claims["estimated_savings"].sum()))

    print("\nRule breakdown:")
    if claim_events.empty:
        print("No FAWE events generated.")
    else:
        print(claim_events.groupby(["category", "risk_code"]).size().reset_index(name="total").sort_values(["category", "total"], ascending=[True, False]))

    print("\nNormalized FAWE model created:")
    print("fawe_claims.csv: one row per claim")
    print("fawe_claim_events.csv: one row per risk finding per claim")

    print("\nFAWE scoring fields added:")
    print("fraud_score, abuse_score, waste_score, error_score, total_risk_score, primary_fawe_type")

    print("\nAfrica's Talking ready fields:")
    print("member_name, member_mobile, member_email, provider_mobile, insurer_id, scheme_name, sms_opt_in, member_visit_confirmed")


def main() -> None:
    claims = load_base_claims()
    claims = add_provider_details(claims)
    claims = add_member_profiles(claims)
    claims = add_basic_claim_details(claims)
    claims = add_etims_fields(claims)
    claims = add_member_confirmation_fields(claims)
    claims = add_procedure_and_pharmacy_fields(claims)
    claims = add_pattern_features(claims)

    risk_results = claims.apply(calculate_risk, axis=1)
    claims = pd.concat([claims, risk_results], axis=1)

    claim_events = build_claim_events(claims)
    final_claims = build_final_claims(claims)

    write_outputs(final_claims, claim_events)
    print_summary(final_claims, claim_events)


if __name__ == "__main__":
    main()
