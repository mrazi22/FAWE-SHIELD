export type ClaimType = "Inpatient" | "Outpatient";

export type ClaimStatus =
  | "Submitted"
  | "Pending Documents"
  | "Under Review"
  | "Investigate"
  | "Approved"
  | "Rejected"
  | "Paid";

export type ClaimRecommendation =
  | "Approve"
  | "Approve with Notes"
  | "Review"
  | "Investigate";

export type FaweType = "Fraud" | "Abuse" | "Waste" | "Error" | "Clean";

export type Claim = {
  claim_id: string;

  insurer_id: string;
  insurer_name?: string;
  scheme_name?: string;

  member_id: string;
  member_card_no?: string;
  member_name?: string;
  member_mobile?: string;
  member_email?: string;

  kenya_provider_id: string;
  provider_name: string;
  provider_mobile?: string;
  county?: string;
  provider_type?: string;

  claim_type: ClaimType;
  claim_start_date: string;
  claim_end_date: string;
  diagnosis: string;
  plan_type?: string;

  claim_amount: number;

  uploaded_documents?: string;
  missing_documents?: string;

  claim_form_no?: string;
  authorization_no?: string;
  invoice_no?: string;
  etims_receipt_no?: string;
  etims_invoice_reference?: string;
  etims_verified?: number | boolean;

  fraud_score: number;
  abuse_score: number;
  waste_score: number;
  error_score: number;
  total_risk_score: number;

  primary_fawe_type: FaweType;

  fraud_flag?: number;
  abuse_flag?: number;
  waste_flag?: number;
  error_flag?: number;

  recommendation: ClaimRecommendation;
  claim_status: ClaimStatus;

  risk_reasons?: string;
  recommended_action?: string;
  estimated_savings?: number;

  created_at?: string;
  updated_at?: string;
};

export type ClaimRiskCode = {
  id: number;
  code: string;
  category: FaweType;
  message: string;
  points: number;
  recommended_action?: string;
};

export type GetClaimsParams = {
  page?: number;
  limit?: number;
  recommendation?: ClaimRecommendation;
  claim_status?: ClaimStatus;
  claim_type?: ClaimType;
  search?: string;
};

export type GetClaimsResponse = {
  page: number;
  limit: number;
  total: number;
  count: number;
  data: Claim[];
};

export type GetClaimByIdResponse = {
  claim: Claim;
  risk_codes: ClaimRiskCode[];
};

export type CreateClaimPayload = {
  claim_id?: string;

  insurer_id?: string;
  insurer_name?: string;
  scheme_name?: string;

  member_id: string;
  member_card_no?: string;
  member_name?: string;
  member_mobile?: string;
  member_email?: string;
  sms_opt_in?: boolean | number;

  kenya_provider_id: string;
  provider_name: string;
  provider_mobile?: string;
  county?: string;
  provider_type?: string;

  claim_type: ClaimType;
  claim_start_date: string;
  claim_end_date: string;
  diagnosis: string;
  plan_type?: string;

  claim_amount: number;

  uploaded_documents?: string;
  missing_documents?: string;

  claim_form_no?: string;
  authorization_no?: string;
  invoice_no?: string;
  etims_receipt_no?: string;
  etims_invoice_reference?: string;
  etims_verified?: boolean | number;
};

export type ScoringResult = {
  claim_id?: string;
  recommendation: ClaimRecommendation;
  total_risk_score: number;
  primary_fawe_type: FaweType;
  claim_status: ClaimStatus;
  risk_codes?: string[] | ClaimRiskCode[];
  [key: string]: unknown;
};

export type CreateClaimResponse = {
  message: string;
  claim_id: string;
  scoring: ScoringResult;
};

export type UpdateClaimStatusPayload = {
  claim_status: ClaimStatus;
};

export type UpdateClaimStatusResponse = {
  message: string;
  claim_id: string;
  claim_status: ClaimStatus;
};