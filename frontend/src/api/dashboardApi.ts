import axiosClient from "./axiosClient";
import type {
  DashboardSummaryResponse,
  FaweBreakdownResponse,
  ProviderRiskResponse,
  LossRatioResponse,
} from "../types/dashboard.types";

export async function getDashboardSummary(): Promise<DashboardSummaryResponse> {
  const response = await axiosClient.get<DashboardSummaryResponse>(
    "/dashboard/summary"
  );

  return response.data;
}

export async function getFaweBreakdown(): Promise<FaweBreakdownResponse> {
  const response = await axiosClient.get<FaweBreakdownResponse>(
    "/dashboard/fawe-breakdown"
  );

  return response.data;
}

export async function getProviderRisk(
  limit = 10
): Promise<ProviderRiskResponse> {
  const response = await axiosClient.get<ProviderRiskResponse>(
    "/dashboard/provider-risk",
    {
      params: { limit },
    }
  );

  return response.data;
}

export async function getLossRatio(
  premiumBase?: number
): Promise<LossRatioResponse> {
  const response = await axiosClient.get<LossRatioResponse>(
    "/dashboard/loss-ratio",
    {
      params: premiumBase ? { premium_base: premiumBase } : {},
    }
  );

  return response.data;
}