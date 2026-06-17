import os
from typing import Callable, Optional

import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL

load_dotenv()

MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", 3306))
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "mar_bar")

CLAIMS_CSV_FILE = "data/kenya/fawe_claims.csv"
CLAIM_EVENTS_CSV_FILE = "data/kenya/fawe_claim_events.csv"

CHUNK_SIZE = 1000

connection_url = URL.create(
    drivername="mysql+pymysql",
    username=MYSQL_USER,
    password=MYSQL_PASSWORD,
    host=MYSQL_HOST,
    port=MYSQL_PORT,
    database=MYSQL_DATABASE,
)

engine = create_engine(
    connection_url,
    pool_pre_ping=True,
    pool_recycle=3600,
    connect_args={
        "connect_timeout": 60,
        "read_timeout": 300,
        "write_timeout": 300,
    },
)


FAWE_CLAIMS_COLUMNS = [
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

FAWE_CLAIM_EVENTS_COLUMNS = [
    "id", "claim_id", "risk_code", "category", "points", "message", "recommended_action"
]


def create_tables():
    print("\nDropping old FAWE tables...")

    with engine.begin() as conn:
        # Drop child table first because it references fawe_claims.
        conn.execute(text("DROP TABLE IF EXISTS fawe_claim_events"))
        conn.execute(text("DROP TABLE IF EXISTS fawe_claims"))

        print("Creating fawe_claims with correct MySQL types...")

        conn.execute(text("""
            CREATE TABLE fawe_claims (
                claim_id VARCHAR(50) NOT NULL,

                insurer_id VARCHAR(50),
                insurer_name VARCHAR(255),
                scheme_name VARCHAR(255),

                member_id VARCHAR(50),
                member_card_no VARCHAR(50),
                member_name VARCHAR(255),
                member_mobile VARCHAR(30),
                member_email VARCHAR(255),
                sms_opt_in TINYINT(1),

                kenya_provider_id VARCHAR(50),
                provider_name VARCHAR(255),
                provider_mobile VARCHAR(30),
                county VARCHAR(100),
                provider_type VARCHAR(100),
                provider_pin VARCHAR(50),

                claim_type VARCHAR(50),
                claim_start_date DATETIME NULL,
                claim_end_date DATETIME NULL,
                diagnosis VARCHAR(255),
                plan_type VARCHAR(100),
                claim_amount INT,

                uploaded_documents TEXT,
                missing_documents TEXT,

                claim_form_no VARCHAR(100),
                authorization_no VARCHAR(100),
                invoice_no VARCHAR(100),
                etims_receipt_no VARCHAR(100),
                etims_invoice_reference VARCHAR(100),
                etims_verified TINYINT(1),
                etims_qr_verified TINYINT(1),
                etims_amount INT,
                etims_provider_pin VARCHAR(50),

                member_visit_confirmed VARCHAR(30),

                procedure_code VARCHAR(50),
                procedure_name VARCHAR(255),
                procedure_category VARCHAR(100),
                diagnosis_procedure_match TINYINT(1),
                unnecessary_diagnostic_test TINYINT(1),
                repeated_lab_radiology_count INT,

                drug_name VARCHAR(255),
                generic_name VARCHAR(255),
                drug_price INT,
                generic_available TINYINT(1),
                generic_price INT,
                is_brand_drug TINYINT(1),

                provider_avg_claim DECIMAL(12,2),
                member_claims_last_30_days INT,
                same_diagnosis_recent_count INT,
                provider_claims_same_day INT,
                admission_count_recent INT,
                possible_duplicate_claim TINYINT(1),
                invoice_reused TINYINT(1),

                fraud_label TINYINT(1),

                fraud_score INT,
                abuse_score INT,
                waste_score INT,
                error_score INT,
                total_risk_score INT,
                primary_fawe_type VARCHAR(50),

                fraud_flag TINYINT(1),
                abuse_flag TINYINT(1),
                waste_flag TINYINT(1),
                error_flag TINYINT(1),

                recommendation VARCHAR(50),
                risk_reasons TEXT,
                recommended_action TEXT,
                estimated_savings INT,
                claim_status VARCHAR(50),

                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                PRIMARY KEY (claim_id),

                INDEX idx_fawe_claims_insurer_id (insurer_id),
                INDEX idx_fawe_claims_provider_id (kenya_provider_id),
                INDEX idx_fawe_claims_member_id (member_id),
                INDEX idx_fawe_claims_recommendation (recommendation),
                INDEX idx_fawe_claims_claim_status (claim_status),
                INDEX idx_fawe_claims_total_risk_score (total_risk_score),
                INDEX idx_fawe_claims_primary_fawe_type (primary_fawe_type),
                INDEX idx_fawe_claims_member_visit_confirmed (member_visit_confirmed),
                INDEX idx_fawe_claims_procedure_category (procedure_category),
                INDEX idx_fawe_claims_claim_type (claim_type),
                INDEX idx_fawe_claims_provider_pin (provider_pin)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """))

        print("Creating fawe_claim_events with correct MySQL types...")

        conn.execute(text("""
            CREATE TABLE fawe_claim_events (
                id INT NOT NULL AUTO_INCREMENT,
                claim_id VARCHAR(50) NOT NULL,
                risk_code VARCHAR(50),
                category VARCHAR(50),
                points INT,
                message TEXT,
                recommended_action TEXT,

                PRIMARY KEY (id),

                INDEX idx_fawe_claim_events_claim_id (claim_id),
                INDEX idx_fawe_claim_events_category (category),
                INDEX idx_fawe_claim_events_risk_code (risk_code),

                CONSTRAINT fk_fawe_claim_events_claim_id
                    FOREIGN KEY (claim_id)
                    REFERENCES fawe_claims (claim_id)
                    ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """))

    print("Tables created successfully.")


def validate_csv_columns(csv_file: str, expected_columns: list[str], table_name: str):
    print(f"\nValidating columns for {table_name}...")

    csv_columns = pd.read_csv(csv_file, nrows=0).columns.tolist()
    missing_columns = [col for col in expected_columns if col not in csv_columns]
    extra_columns = [col for col in csv_columns if col not in expected_columns]

    if missing_columns:
        raise ValueError(
            f"{csv_file} is missing columns required by {table_name}: {missing_columns}"
        )

    if extra_columns:
        print(f"Warning: {csv_file} has extra columns not imported into {table_name}: {extra_columns}")

    print(f"Column validation passed for {table_name}.")


def validate_claims_csv():
    print("\nValidating claims CSV...")

    validate_csv_columns(CLAIMS_CSV_FILE, FAWE_CLAIMS_COLUMNS, "fawe_claims")

    claims = pd.read_csv(CLAIMS_CSV_FILE, usecols=["claim_id"])

    blank_claims = claims["claim_id"].isna().sum() + (
        claims["claim_id"].astype(str).str.strip() == ""
    ).sum()
    duplicate_claims = claims["claim_id"].duplicated().sum()

    if blank_claims > 0:
        raise ValueError(f"fawe_claims.csv has {blank_claims} blank claim_id values.")

    if duplicate_claims > 0:
        duplicates = claims[claims["claim_id"].duplicated(keep=False)]["claim_id"].head(10).tolist()
        raise ValueError(f"fawe_claims.csv has duplicate claim_id values. Examples: {duplicates}")

    print("Claims CSV validation passed.")


def validate_claim_events_csv():
    print("\nValidating claim events CSV...")

    validate_csv_columns(CLAIM_EVENTS_CSV_FILE, FAWE_CLAIM_EVENTS_COLUMNS, "fawe_claim_events")

    events = pd.read_csv(CLAIM_EVENTS_CSV_FILE, usecols=["claim_id"])
    blank_event_claims = events["claim_id"].isna().sum() + (
        events["claim_id"].astype(str).str.strip() == ""
    ).sum()

    if blank_event_claims > 0:
        raise ValueError(f"fawe_claim_events.csv has {blank_event_claims} blank claim_id values.")

    print("Claim events CSV validation passed.")


def clean_claims_chunk(chunk: pd.DataFrame) -> pd.DataFrame:
    date_cols = [
        "claim_start_date",
        "claim_end_date",
        "created_at",
        "updated_at",
    ]

    bool_cols = [
        "sms_opt_in",
        "etims_verified",
        "etims_qr_verified",
        "diagnosis_procedure_match",
        "unnecessary_diagnostic_test",
        "generic_available",
        "is_brand_drug",
        "possible_duplicate_claim",
        "invoice_reused",
        "fraud_label",
        "fraud_flag",
        "abuse_flag",
        "waste_flag",
        "error_flag",
    ]

    int_cols = [
        "claim_amount",
        "etims_amount",
        "repeated_lab_radiology_count",
        "drug_price",
        "generic_price",
        "member_claims_last_30_days",
        "same_diagnosis_recent_count",
        "provider_claims_same_day",
        "admission_count_recent",
        "fraud_score",
        "abuse_score",
        "waste_score",
        "error_score",
        "total_risk_score",
        "estimated_savings",
    ]

    decimal_cols = ["provider_avg_claim"]

    for col in date_cols:
        if col in chunk.columns:
            chunk[col] = pd.to_datetime(chunk[col], errors="coerce")

    for col in bool_cols:
        if col in chunk.columns:
            chunk[col] = chunk[col].fillna(False).astype(int)

    for col in int_cols:
        if col in chunk.columns:
            chunk[col] = pd.to_numeric(chunk[col], errors="coerce").fillna(0).astype(int)

    for col in decimal_cols:
        if col in chunk.columns:
            chunk[col] = pd.to_numeric(chunk[col], errors="coerce").fillna(0)

    # Keep only columns that exist in the MySQL table, in the correct order.
    chunk = chunk[FAWE_CLAIMS_COLUMNS]

    # Convert pandas NaN/NaT to SQL NULL.
    return chunk.where(pd.notnull(chunk), None)


def clean_events_chunk(chunk: pd.DataFrame) -> pd.DataFrame:
    int_cols = ["id", "points"]

    for col in int_cols:
        if col in chunk.columns:
            chunk[col] = pd.to_numeric(chunk[col], errors="coerce").fillna(0).astype(int)

    chunk = chunk[FAWE_CLAIM_EVENTS_COLUMNS]

    return chunk.where(pd.notnull(chunk), None)


def import_csv_in_chunks(
    csv_file: str,
    table_name: str,
    expected_columns: list[str],
    cleaner: Optional[Callable[[pd.DataFrame], pd.DataFrame]] = None,
):
    print(f"\nLoading {csv_file}...")

    total_rows = sum(1 for _ in open(csv_file, "r", encoding="utf-8")) - 1
    print(f"Rows found for {table_name}: {total_rows:,}")

    imported_rows = 0

    print(f"Importing {table_name} in chunks of {CHUNK_SIZE}...")

    for chunk in pd.read_csv(csv_file, chunksize=CHUNK_SIZE):
        if cleaner:
            chunk = cleaner(chunk)

        # Defensive ordering before insert.
        chunk = chunk[expected_columns]

        chunk.to_sql(
            name=table_name,
            con=engine,
            if_exists="append",
            index=False,
            chunksize=CHUNK_SIZE,
            method=None,
        )

        imported_rows += len(chunk)
        print(f"{table_name}: imported {imported_rows:,}/{total_rows:,} rows")

    print(f"Finished importing {table_name}")


def main():
    print("Starting FAWE MySQL import...")

    validate_claims_csv()
    validate_claim_events_csv()

    create_tables()

    import_csv_in_chunks(
        CLAIMS_CSV_FILE,
        "fawe_claims",
        FAWE_CLAIMS_COLUMNS,
        cleaner=clean_claims_chunk,
    )

    import_csv_in_chunks(
        CLAIM_EVENTS_CSV_FILE,
        "fawe_claim_events",
        FAWE_CLAIM_EVENTS_COLUMNS,
        cleaner=clean_events_chunk,
    )

    print("\nImport complete.")
    print("Tables created:")
    print("- fawe_claims")
    print("- fawe_claim_events")


if __name__ == "__main__":
    main()
