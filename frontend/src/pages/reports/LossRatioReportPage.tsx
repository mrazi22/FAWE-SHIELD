import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { getLossRatioReportPage } from "../../api/dashboardApi";
import { sendLossRatioReport } from "../../api/communicationsApi";

import type { LossRatioReportPageResponse } from "../../types/dashboard.types";

import DashboardSkeleton from "../../components/loading/DashboardSkeleton";
import SectionCard from "../../components/ui/SectionCard";
import StatCard from "../../components/ui/StatCard";
import SimpleBarChart from "../../components/ui/SimpleBarChart";
import PrimaryButton from "../../components/ui/PrimaryButton";
import RiskBadge from "../../components/ui/RiskBadge";

export default function LossRatioReportPage() {
  const [data, setData] = useState<LossRatioReportPageResponse | null>(null);
  const [premiumBase, setPremiumBase] = useState("");
  const [managerEmails, setManagerEmails] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isEmailing, setIsEmailing] = useState(false);

  async function loadReport(customPremiumBase?: number) {
    try {
      setIsLoading(true);

      const result = await getLossRatioReportPage(customPremiumBase);

      setData(result);
      toast.success("Loss ratio report generated.");
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to generate loss ratio report.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
  }, []);

  async function handleGenerateReport() {
    const parsedPremiumBase = premiumBase ? Number(premiumBase) : undefined;

    if (premiumBase && Number.isNaN(parsedPremiumBase)) {
      toast.error("Premium base must be a valid number.");
      return;
    }

    await loadReport(parsedPremiumBase);
  }

  async function handleEmailReport() {
    try {
      setIsEmailing(true);

      const toEmails = managerEmails
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean);

      if (toEmails.length === 0) {
        toast.error("Enter at least one manager email.");
        return;
      }

      await sendLossRatioReport({
        insurer_id: data?.scope.insurerId || undefined,
        to_emails: toEmails,
      });

      toast.success("Loss ratio report emailed to managers.");
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to email report.");
    } finally {
      setIsEmailing(false);
    }
  }

  const summary = data?.summary;
  const providers = data?.high_risk_provider_exposure || [];

  const claimsValueChart = useMemo(() => {
    if (!summary) return [];

    return [
      {
        label: "Approved Value",
        value: summary.approved_value,
        tone: "green",
      },
      {
        label: "Review Value",
        value: summary.review_value,
        tone: "amber",
      },
      {
        label: "Investigate Value",
        value: summary.investigate_value,
        tone: "red",
      },
    ] as any[];
  }, [summary]);

  const lossRatioChart = useMemo(() => {
    if (!summary) return [];

    return [
      {
        label: "Before FAWE",
        value: Number((summary.loss_ratio_before_fawe * 100).toFixed(2)),
        tone: "red",
      },
      {
        label: "After FAWE",
        value: Number((summary.loss_ratio_after_fawe * 100).toFixed(2)),
        tone: "green",
      },
      {
        label: "Improvement",
        value: Number((summary.loss_ratio_improvement * 100).toFixed(2)),
        tone: "amber",
      },
    ] as any[];
  }, [summary]);

  const providerExposureChart = useMemo(() => {
    return providers.slice(0, 8).map((provider) => ({
      label: provider.provider_name,
      value: provider.total_claims_value,
      tone:
        provider.avg_risk_score >= 70
          ? "red"
          : provider.avg_risk_score >= 40
          ? "amber"
          : "green",
    })) as any[];
  }, [providers]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!data || !summary) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center shadow-soft">
        <h1 className="text-2xl font-black text-fawe-navy">
          No loss ratio data found
        </h1>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-fawe-navy p-6 text-white shadow-soft">
        <p className="text-sm font-black uppercase tracking-[0.25em] text-fawe-greenSoft">
          Level 8 Reports / Loss Ratio
        </p>

        <h1 className="mt-3 text-3xl font-black">
          What is the financial impact?
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
          FAWE Shield helps management understand how fraud, abuse, waste, and
          error affect claims value, estimated savings, provider exposure, and
          loss ratio.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Claims Value"
          value={formatCurrency(summary.total_claims_value)}
          subtitle={`${formatNumber(summary.total_claims)} claims processed`}
          tone="navy"
        />

        <StatCard
          title="Estimated Savings"
          value={formatCurrency(summary.estimated_savings)}
          subtitle="Potential value protected by FAWE"
          tone="green"
        />

        <StatCard
          title="Loss Ratio Estimate"
          value={`${(summary.loss_ratio_after_fawe * 100).toFixed(1)}%`}
          subtitle="After estimated FAWE savings"
          tone="amber"
        />

        <StatCard
          title="High-Risk Exposure"
          value={formatCurrency(summary.high_risk_claims_value)}
          subtitle="Claims with high risk score"
          tone="red"
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Approved Value"
          value={formatCurrency(summary.approved_value)}
          subtitle={`${formatNumber(summary.approved_claims)} approved claims`}
          tone="green"
        />

        <StatCard
          title="Review Value"
          value={formatCurrency(summary.review_value)}
          subtitle={`${formatNumber(summary.review_claims)} review claims`}
          tone="amber"
        />

        <StatCard
          title="Investigate Value"
          value={formatCurrency(summary.investigate_value)}
          subtitle={`${formatNumber(summary.investigate_claims)} investigate claims`}
          tone="red"
        />

        <StatCard
          title="Premium Base"
          value={formatCurrency(summary.premium_base)}
          subtitle="Used for loss ratio estimate"
          tone="navy"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Claims Value by Recommendation"
          subtitle="Shows where claims value is sitting: approved, review, or investigation."
        >
          <SimpleBarChart
            data={claimsValueChart}
            valueFormatter={formatCurrency}
          />
        </SectionCard>

        <SectionCard
          title="Loss Ratio Before vs After FAWE"
          subtitle="Shows how estimated savings can improve loss ratio."
        >
          <SimpleBarChart
            data={lossRatioChart}
            valueFormatter={(value) => `${value.toFixed(2)}%`}
          />
        </SectionCard>
      </section>

      <SectionCard
        title="High-Risk Provider Exposure"
        subtitle="Providers with the highest financial exposure from high-risk or investigation claims."
      >
        <SimpleBarChart
          data={providerExposureChart}
          valueFormatter={formatCurrency}
        />

        <div className="mt-6 hidden overflow-hidden rounded-2xl border border-slate-100 xl:block">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">County</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Claims</th>
                <th className="px-4 py-3">Exposure</th>
                <th className="px-4 py-3">Risk</th>
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

                  <td className="px-4 py-4 font-bold text-slate-700">
                    {formatNumber(provider.total_claims)}
                  </td>

                  <td className="px-4 py-4 font-black text-fawe-navy">
                    {formatCurrency(provider.total_claims_value)}
                  </td>

                  <td className="px-4 py-4">
                    <RiskBadge
                      label={provider.avg_risk_score.toFixed(1)}
                      tone={
                        provider.avg_risk_score >= 70
                          ? "red"
                          : provider.avg_risk_score >= 40
                          ? "amber"
                          : "green"
                      }
                    />
                  </td>

                  <td className="px-4 py-4 font-black text-fawe-red">
                    {formatNumber(provider.investigate_count)}
                  </td>

                  <td className="px-4 py-4 font-black text-fawe-greenDark">
                    {formatCurrency(provider.estimated_savings)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 space-y-4 xl:hidden">
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

              <div className="mt-4 grid grid-cols-2 gap-3">
                <MiniMetric
                  label="Exposure"
                  value={formatCurrency(provider.total_claims_value)}
                />
                <MiniMetric
                  label="Claims"
                  value={formatNumber(provider.total_claims)}
                />
                <MiniMetric
                  label="Investigate"
                  value={formatNumber(provider.investigate_count)}
                />
                <MiniMetric
                  label="Savings"
                  value={formatCurrency(provider.estimated_savings)}
                />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Report Actions"
        subtitle="Generate a report for management or email the report to managers."
      >
        <div className="grid gap-4 xl:grid-cols-[1fr_1.3fr]">
          <div className="rounded-3xl bg-slate-50 p-5">
            <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
              Premium Base
            </label>

            <input
              value={premiumBase}
              onChange={(event) => setPremiumBase(event.target.value)}
              placeholder="Optional. Example: 50000000"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-fawe-green focus:ring-4 focus:ring-green-100"
            />

            <p className="mt-3 text-xs leading-5 text-slate-500">
              If left blank, the backend estimates premium base as total claims
              value × 1.25 for demo purposes.
            </p>

            <PrimaryButton
              tone="green"
              className="mt-5 w-full"
              onClick={handleGenerateReport}
            >
              Generate Loss Ratio Report
            </PrimaryButton>
          </div>

          <div className="rounded-3xl bg-slate-50 p-5">
            <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
              Manager Emails
            </label>

            <textarea
              value={managerEmails}
              onChange={(event) => setManagerEmails(event.target.value)}
              placeholder="simongunyali@gmail.com, venessaarwa@gmail.com, sgrizzly487@gmail.com"
              rows={4}
              className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-fawe-green focus:ring-4 focus:ring-green-100"
            />

            <div className="mt-5 flex flex-col gap-3 md:flex-row">
              <PrimaryButton
                tone="navy"
                className="flex-1"
                disabled={isEmailing}
                onClick={handleEmailReport}
              >
                {isEmailing ? "Emailing..." : "Email Report to Managers"}
              </PrimaryButton>

              <button
                disabled
                className="flex-1 rounded-2xl bg-slate-200 px-5 py-3 text-sm font-black text-slate-400"
              >
                Export CSV Later
              </button>

              <button
                disabled
                className="flex-1 rounded-2xl bg-slate-200 px-5 py-3 text-sm font-black text-slate-400"
              >
                Export PDF Later
              </button>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="rounded-3xl bg-white p-5 text-sm leading-7 text-slate-500 shadow-soft">
        <span className="font-black text-fawe-navy">Note:</span>{" "}
        {data.note}
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-3">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 font-black text-fawe-navy">{value}</p>
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