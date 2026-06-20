import axiosClient from "./axiosClient";
import type {
  DashboardSummaryResponse,
  FaweBreakdownResponse,
  ProviderRiskResponse,
  LossRatioResponse,
    ProviderRiskDashboardResponse,
  FaweBreakdownPageResponse,
  LossRatioReportPageResponse,
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
export async function getProviderRiskDashboard(
  limit = 20
): Promise<ProviderRiskDashboardResponse> {
  const response = await axiosClient.get<ProviderRiskDashboardResponse>(
    "/dashboard/provider-risk-dashboard",
    {
      params: { limit },
    }
  );

  return response.data;
}

export async function getFaweBreakdownPage(): Promise<FaweBreakdownPageResponse> {
  const response = await axiosClient.get<FaweBreakdownPageResponse>(
    "/dashboard/fawe-breakdown-page"
  );

  return response.data;
}

export async function getLossRatioReportPage(
  premiumBase?: number
): Promise<LossRatioReportPageResponse> {
  const response = await axiosClient.get<LossRatioReportPageResponse>(
    "/dashboard/loss-ratio-page",
    {
      params: premiumBase ? { premium_base: premiumBase } : {},
    }
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