import pandas as pd

fraud = pd.read_csv("data/raw/Train-1542865627584.csv")
beneficiary = pd.read_csv("data/raw/Train_Beneficiarydata-1542865627584.csv")
inpatient = pd.read_csv("data/raw/Train_Inpatientdata-1542865627584.csv")
outpatient = pd.read_csv("data/raw/Train_Outpatientdata-1542865627584.csv")

print("\n=== FRAUD ===")
print(fraud.head())
print(fraud.columns)

print("\n=== BENEFICIARY ===")
print(beneficiary.head())
print(beneficiary.columns)

print("\n=== INPATIENT ===")
print(inpatient.head())
print(inpatient.columns)

print("\n=== OUTPATIENT ===")
print(outpatient.head())
print(outpatient.columns)