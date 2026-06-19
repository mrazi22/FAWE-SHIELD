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