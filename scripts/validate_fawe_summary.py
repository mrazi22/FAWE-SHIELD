import pandas as pd

df = pd.read_csv("data/kenya/fawe_kenya_claims.csv")

claims_processed = len(df)
high_risk_claims = (df["risk_score"] >= 70).sum()
review_claims = (df["recommendation"] == "Review").sum()
investigate_claims = (df["recommendation"] == "Investigate").sum()
estimated_savings = df["estimated_savings"].sum()

print("VALIDATED DASHBOARD SUMMARY")
print("-" * 40)
print(f"Claims processed: {claims_processed}")
print(f"High risk claims: {high_risk_claims}")
print(f"Review claims: {review_claims}")
print(f"Investigate claims: {investigate_claims}")
print(f"Estimated savings: KES {estimated_savings:,.0f}")

print("\nCross-checks")
print("-" * 40)
print("Review + Investigate:", review_claims + investigate_claims)
print("Total non-approve:", (df["recommendation"] != "Approve").sum())
print("High risk equals Investigate:", high_risk_claims == investigate_claims)

print("\nRecommendation breakdown")
print(df["recommendation"].value_counts())

print("\nFAWE category breakdown")
print(df["fawe_category"].value_counts().head(20))

print("\nSavings by recommendation")
print(df.groupby("recommendation")["estimated_savings"].sum())