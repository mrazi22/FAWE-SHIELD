import pandas as pd

fraud = pd.read_csv("data/raw/Train-1542865627584.csv")
beneficiary = pd.read_csv("data/raw/Train_Beneficiarydata-1542865627584.csv")
inpatient = pd.read_csv("data/raw/Train_Inpatientdata-1542865627584.csv")
outpatient = pd.read_csv("data/raw/Train_Outpatientdata-1542865627584.csv")

# Mark claim type
inpatient["claim_type"] = "Inpatient"
outpatient["claim_type"] = "Outpatient"

# Combine inpatient + outpatient claims
claims = pd.concat([inpatient, outpatient], ignore_index=True, sort=False)

# Add fraud label from provider file
claims = claims.merge(fraud, on="Provider", how="left")

# Add beneficiary/member details
claims = claims.merge(beneficiary, on="BeneID", how="left")

# Rename important columns for FAWE Shield
claims = claims.rename(columns={
    "ClaimID": "claim_id",
    "BeneID": "member_id",
    "Provider": "provider_id",
    "InscClaimAmtReimbursed": "claim_amount",
    "ClaimStartDt": "claim_start_date",
    "ClaimEndDt": "claim_end_date",
    "ClmDiagnosisCode_1": "diagnosis_code",
    "PotentialFraud": "provider_fraud_label"
})

# Convert Yes/No fraud label to 1/0
claims["fraud_label"] = claims["provider_fraud_label"].map({
    "Yes": 1,
    "No": 0
})

# Keep only useful columns for now
final_claims = claims[[
    "claim_id",
    "member_id",
    "provider_id",
    "claim_type",
    "claim_start_date",
    "claim_end_date",
    "claim_amount",
    "diagnosis_code",
    "provider_fraud_label",
    "fraud_label",
    "Gender",
    "DOB",
    "State",
    "County",
    "ChronicCond_Diabetes",
    "ChronicCond_Heartfailure",
    "ChronicCond_KidneyDisease",
    "ChronicCond_Cancer",
    "ChronicCond_Depression"
]]

final_claims.to_csv("data/cleaned/master_claims.csv", index=False)

print("Master claims dataset created successfully.")
print(final_claims.head())
print(final_claims.shape)