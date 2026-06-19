import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
  getDashboardSummary,
  getFaweBreakdown,
  getProviderRisk,
  getLossRatio,
} from "../../api/dashboardApi";

import type {
  DashboardSummaryResponse,
  FaweBreakdownResponse,
  ProviderRiskResponse,
  LossRatioResponse,
} from "../../types/dashboard.types";

import DashboardSkeleton from "../../components/loading/DashboardSkeleton";
import StatCard from "../../components/ui/StatCard";
import SectionCard from "../../components/ui/SectionCard";
import SimpleBarChart from "../../components/ui/SimpleBarChart";
import RiskBadge from "../../components/ui/RiskBadge";
import PrimaryButton from "../../components/ui/PrimaryButton";

export default function MainDashboardPage() {
  const navigate = useNavigate();

  const [summaryData, setSummaryData] =
    useState<DashboardSummaryResponse | null>(null);
  const [faweData, setFaweData] = useState<FaweBreakdownResponse | null>(null);
  const [providerData, setProviderData] =
    useState<ProviderRiskResponse | null>(null);
  const [lossRatioData, setLossRatioData] =
    useState<LossRatioResponse | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setIsLoading(true);

        const [summary, fawe, providers, lossRatio] = await Promise.all([
          getDashboardSummary(),
          getFaweBreakdown(),
          getProviderRisk(5),
          getLossRatio(),
        ]);

        setSummaryData(summary);
        setFaweData(fawe);
        setProviderData(providers);
        setLossRatioData(lossRatio);
      } catch (error: any) {
        console.error(error);
        toast.error(error?.message || "Failed to load dashboard.");
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const summary = summaryData?.summary;

  const faweEvents = useMemo(() => {
    const rows = faweData?.category_breakdown || [];

    return {
      fraud: rows.find((row) => row.category === "Fraud")?.total_events || 0,
      abuse: rows.find((row) => row.category === "Abuse")?.total_events || 0,
      waste: rows.find((row) => row.category === "Waste")?.total_events || 0,
      error: rows.find((row) => row.category === "Error")?.total_events || 0,
    };
  }, [faweData]);

  const faweChartData = useMemo(() => {
    return (faweData?.category_breakdown || []).map((item) => ({
      label: item.category,
      value: Number(item.total_events || 0),
      tone:
        item.category === "Fraud"
          ? "red"
          : item.category === "Abuse"
          ? "amber"
          : item.category === "Waste"
          ? "green"
          : "slate",
    })) as any[];
  }, [faweData]);

  const recommendationChartData = useMemo(() => {
    return (summaryData?.recommendation_breakdown || []).map((item) => ({
      label: item.recommendation || "Unknown",
      value: Number(item.total || 0),
      tone:
        item.recommendation === "Investigate"
          ? "red"
          : item.recommendation === "Review"
          ? "amber"
          : "green",
    })) as any[];
  }, [summaryData]);

  const topRiskRules = faweData?.top_risk_codes || [];
  const topProviders = providerData?.data || [];

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl bg-fawe-navy shadow-soft">
        <div className="grid gap-6 p-6 text-white lg:grid-cols-[1.5fr_1fr] lg:p-8">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-fawe-greenSoft">
              Level 2 Main Dashboard
            </p>

            <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight md:text-4xl">
              See where claims risk and possible savings are concentrated.
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
              FAWE Shield is not just storing claims. It is detecting fraud,
              abuse, waste, and errors so teams can review the right claims
              faster.
            </p>

            <div className="mt-6">
              <PrimaryButton
                tone="green"
                onClick={() => navigate("/claims/review")}
              >
                View Claims Needing Action
              </PrimaryButton>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
            <p className="text-sm font-bold text-slate-300">
              Estimated Savings
            </p>

            <p className="mt-3 text-4xl font-black text-fawe-greenSoft">
              {formatCurrency(summary?.potential_savings || 0)}
            </p>

            <p className="mt-3 text-sm leading-6 text-slate-300">
              Potential value protected from claims requiring review or
              investigation.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Total Claims"
          value={formatNumber(summary?.claims_processed || 0)}
          subtitle="All processed claims"
          tone="navy"
        />

        <StatCard
          title="Approved"
          value={formatNumber(summary?.approve_claims || 0)}
          subtitle="Clean claims approved"
          tone="green"
        />

        <StatCard
          title="Review"
          value={formatNumber(summary?.review_claims || 0)}
          subtitle="Needs officer review"
          tone="amber"
        />

        <StatCard
          title="Investigate"
          value={formatNumber(summary?.investigate_claims || 0)}
          subtitle="High-risk claims"
          tone="red"
        />

        <StatCard
          title="Savings"
          value={formatCurrency(summary?.potential_savings || 0)}
          subtitle="Estimated recoverable value"
          tone="green"
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Fraud Events"
          value={formatNumber(faweEvents.fraud)}
          subtitle="Intentional deception signals"
          tone="red"
        />

        <StatCard
          title="Abuse Events"
          value={formatNumber(faweEvents.abuse)}
          subtitle="Overuse or improper use"
          tone="amber"
        />

        <StatCard
          title="Waste Events"
          value={formatNumber(faweEvents.waste)}
          subtitle="Unnecessary cost patterns"
          tone="green"
        />

        <StatCard
          title="Error Events"
          value={formatNumber(faweEvents.error)}
          subtitle="Missing or incorrect documents"
          tone="slate"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="FAWE Breakdown"
          subtitle="Shows whether most risk is coming from fraud, abuse, waste, or error."
        >
          <SimpleBarChart data={faweChartData} valueFormatter={formatNumber} />
        </SectionCard>

        <SectionCard
          title="Claims by Recommendation"
          subtitle="Shows where claims are currently sitting in the decision flow."
        >
          <SimpleBarChart
            data={recommendationChartData}
            valueFormatter={formatNumber}
          />
        </SectionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Top Risk Rules"
          subtitle="The rules creating the most FAWE events."
        >
          <div className="space-y-3">
            {topRiskRules.length === 0 && (
              <EmptyMessage message="No risk rules found." />
            )}

            {topRiskRules.slice(0, 6).map((rule) => (
              <div
                key={`${rule.risk_code}-${rule.category}`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 p-4"
              >
                <div>
                  <p className="font-black text-fawe-navy">{rule.risk_code}</p>
                  <div className="mt-2">
                    <RiskBadge
                      label={rule.category}
                      tone={
                        rule.category === "Fraud"
                          ? "red"
                          : rule.category === "Abuse"
                          ? "amber"
                          : rule.category === "Waste"
                          ? "green"
                          : "slate"
                      }
                    />
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-lg font-black text-fawe-navy">
                    {formatNumber(rule.total_events)}
                  </p>
                  <p className="text-xs text-slate-500">events</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Top Risk Providers"
          subtitle="Providers with the highest average risk score."
        >
          <div className="space-y-3">
            {topProviders.length === 0 && (
              <EmptyMessage message="No provider risk data found." />
            )}

            {topProviders.slice(0, 6).map((provider) => (
              <div
                key={provider.kenya_provider_id}
                className="rounded-2xl border border-slate-100 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-black text-fawe-navy">
                      {provider.provider_name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {provider.kenya_provider_id} • {provider.county} •{" "}
                      {provider.provider_type}
                    </p>
                  </div>

                  <RiskBadge
                    label={`Risk ${Number(provider.avg_risk_score || 0).toFixed(
                      1
                    )}`}
                    tone={
                      Number(provider.avg_risk_score || 0) >= 70
                        ? "red"
                        : Number(provider.avg_risk_score || 0) >= 40
                        ? "amber"
                        : "green"
                    }
                  />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <MiniProviderMetric
                    label="Claims"
                    value={formatNumber(provider.total_claims)}
                  />
                  <MiniProviderMetric
                    label="Review"
                    value={formatNumber(provider.review_claims)}
                  />
                  <MiniProviderMetric
                    label="Investigate"
                    value={formatNumber(provider.investigate_claims)}
                  />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </section>

      <SectionCard
        title="Loss Ratio Summary"
        subtitle="Demo view showing possible improvement after FAWE savings."
      >
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            title="Premium Base"
            value={formatCurrency(lossRatioData?.premium_base || 0)}
            tone="navy"
          />

          <StatCard
            title="Before FAWE"
            value={`${((lossRatioData?.loss_ratio_before_fawe || 0) * 100).toFixed(
              1
            )}%`}
            tone="red"
          />

          <StatCard
            title="After FAWE"
            value={`${((lossRatioData?.loss_ratio_after_fawe || 0) * 100).toFixed(
              1
            )}%`}
            tone="green"
          />

          <StatCard
            title="Improvement"
            value={`${((lossRatioData?.loss_ratio_improvement || 0) * 100).toFixed(
              1
            )}%`}
            tone="green"
          />
        </div>
      </SectionCard>
    </div>
  );
}

function MiniProviderMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-black text-fawe-navy">{value}</p>
    </div>
  );
}

function EmptyMessage({ message }: { message: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-KE").format(Number(value || 0));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}