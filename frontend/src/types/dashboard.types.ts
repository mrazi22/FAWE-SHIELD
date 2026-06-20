import type { FaweType } from "./claims.types";
import type { UserRole } from "./auth.types";

export type DashboardScope = {
  role: UserRole;
  insurerId?: string | null;
  providerId?: string | null;
};

export type DashboardSummary = {
  claims_processed: number;
  total_claim_amount: number;
  avg_risk_score: number;
  high_risk_claims: number;
  approve_claims: number;
  approve_with_notes_claims: number;
  review_claims: number;
  investigate_claims: number;
  paid_claims: number;
  rejected_claims: number;
  potential_savings: number;
};

export type RecommendationBreakdown = {
  recommendation: string;
  total: number;
};

export type StatusBreakdown = {
  claim_status: string;
  total: number;
};

export type DashboardSummaryResponse = {
  scope: DashboardScope;
  summary: DashboardSummary;
  recommendation_breakdown: RecommendationBreakdown[];
  status_breakdown: StatusBreakdown[];
};

export type FaweCategoryBreakdown = {
  category: FaweType;
  total_events: number;
  affected_claims: number;
  total_points: number;
};

export type TopRiskCode = {
  risk_code: string;
  category: FaweType;
  total_events: number;
  affected_claims: number;
  avg_points: number;
};

export type FaweBreakdownResponse = {
  scope: DashboardScope;
  category_breakdown: FaweCategoryBreakdown[];
  top_risk_codes: TopRiskCode[];
};

export type ProviderRisk = {
  provider_name: string;
  kenya_provider_id: string;
  county: string;
  provider_type: string;
  total_claims: number;
  total_claim_amount: number;
  avg_risk_score: number;
  investigate_claims: number;
  review_claims: number;
  estimated_savings: number;
};

export type ProviderRiskResponse = {
  scope: DashboardScope;
  count: number;
  data: ProviderRisk[];
};

export type LossRatioResponse = {
  scope: DashboardScope;
  claims_processed: number;
  premium_base: number;
  gross_claims_cost: number;
  estimated_savings: number;
  net_claims_cost_after_fawe: number;
  loss_ratio_before_fawe: number;
  loss_ratio_after_fawe: number;
  loss_ratio_improvement: number;
  note: string;
};

export type ProviderRiskDashboardProvider = {
  kenya_provider_id: string;
  provider_name: string;
  county: string;
  provider_type: string;

  total_claims: number;
  total_claim_amount: number;
  avg_claim_amount: number;
  peer_avg_claim_amount: number;
  avg_risk_score: number;

  fraud_events: number;
  abuse_events: number;
  waste_events: number;
  error_events: number;

  investigate_count: number;
  estimated_savings: number;
};

export type ProviderCountyBreakdown = {
  county: string;
  total_claims: number;
  total_claim_amount: number;
  avg_risk_score: number;
  estimated_savings: number;
};

export type ProviderFraudRuleFrequency = {
  kenya_provider_id: string;
  provider_name: string;
  risk_code: string;
  category: string;
  total_events: number;
};

export type ProviderRiskDashboardResponse = {
  scope: DashboardScope;
  providers: ProviderRiskDashboardProvider[];
  county_breakdown: ProviderCountyBreakdown[];
  fraud_rule_frequency: ProviderFraudRuleFrequency[];
};

export type FaweExampleClaim = {
  claim_id: string;
  member_id: string;
  member_name?: string;
  provider_name: string;
  kenya_provider_id: string;
  claim_amount: number;
  total_risk_score: number;
  recommendation: string;
  claim_status: string;
  primary_fawe_type: string;
  claim_start_date: string;
  risk_code: string;
  message: string;
};

export type FaweTopRule = {
  risk_code: string;
  message: string;
  total_events: number;
  affected_claims: number;
  total_points: number;
};

export type LossRatioReportSummary = {
  total_claims: number;
  total_claims_value: number;
  approved_value: number;
  review_value: number;
  investigate_value: number;
  high_risk_claims_value: number;
  estimated_savings: number;
  net_claims_cost_after_fawe: number;
  premium_base: number;
  loss_ratio_before_fawe: number;
  loss_ratio_after_fawe: number;
  loss_ratio_improvement: number;
  avg_risk_score: number;
  investigate_claims: number;
  review_claims: number;
  approved_claims: number;
};

export type HighRiskProviderExposure = {
  kenya_provider_id: string;
  provider_name: string;
  county: string;
  provider_type: string;
  total_claims: number;
  total_claims_value: number;
  avg_risk_score: number;
  investigate_count: number;
  estimated_savings: number;
};

export type LossRatioReportPageResponse = {
  scope: DashboardScope;
  summary: LossRatioReportSummary;
  high_risk_provider_exposure: HighRiskProviderExposure[];
  note: string;
};

export type FaweCategoryDetail = {
  category: "Fraud" | "Abuse" | "Waste" | "Error";
  total_events: number;
  affected_claims: number;
  total_points: number;
  top_rules: FaweTopRule[];
  example_claims: FaweExampleClaim[];
};

export type FaweBreakdownPageResponse = {
  scope: DashboardScope;
  categories: {
    Fraud: FaweCategoryDetail;
    Abuse: FaweCategoryDetail;
    Waste: FaweCategoryDetail;
    Error: FaweCategoryDetail;
  };
};