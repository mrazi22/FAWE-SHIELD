import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { getProviderRiskDashboard } from "../../api/dashboardApi";
import type { ProviderRiskDashboardResponse } from "../../types/dashboard.types";

import DashboardSkeleton from "../../components/loading/DashboardSkeleton";
import SectionCard from "../../components/ui/SectionCard";
import StatCard from "../../components/ui/StatCard";
import SimpleBarChart from "../../components/ui/SimpleBarChart";
import RiskBadge from "../../components/ui/RiskBadge";

export default function ProviderRiskDashboardPage() {
  const [data, setData] = useState<ProviderRiskDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadProviderRisk() {
    try {
      setIsLoading(true);

      const result = await getProviderRiskDashboard(20);

      setData(result);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to load provider risk dashboard.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadProviderRisk();
  }, []);

  const providers = data?.providers || [];
  const counties = data?.county_breakdown || [];
  const rules = data?.fraud_rule_frequency || [];

  const totals = useMemo(() => {
    return providers.reduce(
      (acc, provider) => {
        acc.totalClaims += provider.total_claims;
        acc.totalAmount += provider.total_claim_amount;
        acc.estimatedSavings += provider.estimated_savings;
        acc.investigateCount += provider.investigate_count;
        acc.fraudEvents += provider.fraud_events;
        acc.abuseEvents += provider.abuse_events;
        acc.wasteEvents += provider.waste_events;
        acc.errorEvents += provider.error_events;

        return acc;
      },
      {
        totalClaims: 0,
        totalAmount: 0,
        estimatedSavings: 0,
        investigateCount: 0,
        fraudEvents: 0,
        abuseEvents: 0,
        wasteEvents: 0,
        errorEvents: 0,
      }
    );
  }, [providers]);

  const topRiskyProviderChart = providers.slice(0, 8).map((provider) => ({
    label: provider.provider_name,
    value: Number(provider.avg_risk_score || 0),
    tone:
      provider.avg_risk_score >= 70
        ? "red"
        : provider.avg_risk_score >= 40
        ? "amber"
        : "green",
  })) as any[];

  const countyChart = counties.slice(0, 8).map((county) => ({
    label: county.county || "Unknown",
    value: Number(county.avg_risk_score || 0),
    tone:
      county.avg_risk_score >= 70
        ? "red"
        : county.avg_risk_score >= 40
        ? "amber"
        : "green",
  })) as any[];

  const claimVsPeerChart = providers.slice(0, 8).map((provider) => ({
    label: provider.provider_name,
    value: Number(provider.avg_claim_amount || 0),
    tone:
      provider.avg_claim_amount > provider.peer_avg_claim_amount
        ? "red"
        : "green",
  })) as any[];

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-fawe-navy p-6 text-white shadow-soft">
        <p className="text-sm font-black uppercase tracking-[0.25em] text-fawe-greenSoft">
          Level 6 Provider Risk Dashboard
        </p>

        <h1 className="mt-3 text-3xl font-black">
          Which providers are creating the most risk?
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
          Risk is not only at claim level. Some providers may show repeated
          suspicious patterns across claims, invoices, documents, and member
          activity.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Claims"
          value={formatNumber(totals.totalClaims)}
          subtitle="Claims from top risky providers"
          tone="navy"
        />
        <StatCard
          title="Investigate Count"
          value={formatNumber(totals.investigateCount)}
          subtitle="Claims requiring investigation"
          tone="red"
        />
        <StatCard
          title="Estimated Savings"
          value={formatCurrency(totals.estimatedSavings)}
          subtitle="Potential recoverable value"
          tone="green"
        />
        <StatCard
          title="Fraud Events"
          value={formatNumber(totals.fraudEvents)}
          subtitle="Fraud signals across providers"
          tone="red"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Top Risky Providers"
          subtitle="Providers ranked by average claim risk score."
        >
          <SimpleBarChart
            data={topRiskyProviderChart}
            valueFormatter={(value) => value.toFixed(1)}
          />
        </SectionCard>

        <SectionCard
          title="Provider Risk by County"
          subtitle="Counties where provider risk is concentrated."
        >
          <SimpleBarChart
            data={countyChart}
            valueFormatter={(value) => value.toFixed(1)}
          />
        </SectionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Provider Claim Amount vs Peer Average"
          subtitle="Shows providers whose average claim amount is above peer average."
        >
          <SimpleBarChart
            data={claimVsPeerChart}
            valueFormatter={formatCurrency}
          />
        </SectionCard>

        <SectionCard
          title="Provider Fraud Rule Frequency"
          subtitle="Most repeated FAWE rules by provider."
        >
          <div className="space-y-3">
            {rules.slice(0, 8).map((rule) => (
              <div
                key={`${rule.kenya_provider_id}-${rule.risk_code}`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 p-4"
              >
                <div>
                  <p className="font-black text-fawe-navy">
                    {rule.provider_name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {rule.kenya_provider_id} • {rule.risk_code}
                  </p>
                </div>

                <div className="text-right">
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
                  <p className="mt-2 text-sm font-black text-fawe-navy">
                    {formatNumber(rule.total_events)} events
                  </p>
                </div>
              </div>
            ))}

            {rules.length === 0 && (
              <EmptyMessage message="No provider rule frequency found." />
            )}
          </div>
        </SectionCard>
      </section>

      <SectionCard
        title="Provider Risk Table"
        subtitle="Detailed provider-level risk metrics."
      >
        <div className="hidden overflow-hidden rounded-2xl border border-slate-100 xl:block">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">County</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Claims</th>
                <th className="px-4 py-3">Claim Amount</th>
                <th className="px-4 py-3">Avg Claim</th>
                <th className="px-4 py-3">Fraud</th>
                <th className="px-4 py-3">Abuse</th>
                <th className="px-4 py-3">Waste</th>
                <th className="px-4 py-3">Error</th>
                <th className="px-4 py-3">Investigate</th>
                <th className="px-4 py-3">Savings</th>
              </tr>
            </thead>

            <tbody>
              {providers.map((provider) => (
                <tr
                  key={provider.kenya_provider_id}
                  className="border-t border-slate-100"
                >
                  <td className="px-4 py-4">
                    <p className="font-black text-fawe-navy">
                      {provider.provider_name}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {provider.kenya_provider_id}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600">
                    {provider.county}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600">
                    {provider.provider_type}
                  </td>
                  <td className="px-4 py-4 font-bold">
                    {formatNumber(provider.total_claims)}
                  </td>
                  <td className="px-4 py-4 font-bold">
                    {formatCurrency(provider.total_claim_amount)}
                  </td>
                  <td className="px-4 py-4 font-bold">
                    {formatCurrency(provider.avg_claim_amount)}
                  </td>
                  <td className="px-4 py-4 text-fawe-red font-black">
                    {formatNumber(provider.fraud_events)}
                  </td>
                  <td className="px-4 py-4 text-amber-600 font-black">
                    {formatNumber(provider.abuse_events)}
                  </td>
                  <td className="px-4 py-4 text-fawe-greenDark font-black">
                    {formatNumber(provider.waste_events)}
                  </td>
                  <td className="px-4 py-4 text-blue-700 font-black">
                    {formatNumber(provider.error_events)}
                  </td>
                  <td className="px-4 py-4 text-fawe-red font-black">
                    {formatNumber(provider.investigate_count)}
                  </td>
                  <td className="px-4 py-4 text-fawe-greenDark font-black">
                    {formatCurrency(provider.estimated_savings)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-4 xl:hidden">
          {providers.map((provider) => (
            <div
              key={provider.kenya_provider_id}
              className="rounded-2xl border border-slate-100 p-4"
            >
              <div className="flex justify-between gap-3">
                <div>
                  <p className="font-black text-fawe-navy">
                    {provider.provider_name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {provider.county} • {provider.provider_type}
                  </p>
                </div>

                <RiskBadge
                  label={`Risk ${provider.avg_risk_score.toFixed(1)}`}
                  tone={
                    provider.avg_risk_score >= 70
                      ? "red"
                      : provider.avg_risk_score >= 40
                      ? "amber"
                      : "green"
                  }
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <MiniMetric label="Claims" value={formatNumber(provider.total_claims)} />
                <MiniMetric label="Amount" value={formatCurrency(provider.total_claim_amount)} />
                <MiniMetric label="Investigate" value={formatNumber(provider.investigate_count)} />
                <MiniMetric label="Savings" value={formatCurrency(provider.estimated_savings)} />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
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