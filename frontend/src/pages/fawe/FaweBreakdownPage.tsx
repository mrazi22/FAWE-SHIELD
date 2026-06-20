import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { getFaweBreakdownPage } from "../../api/dashboardApi";
import type {
  FaweBreakdownPageResponse,
  FaweCategoryDetail,
} from "../../types/dashboard.types";

import DashboardSkeleton from "../../components/loading/DashboardSkeleton";
import SectionCard from "../../components/ui/SectionCard";
import StatCard from "../../components/ui/StatCard";
import RiskBadge from "../../components/ui/RiskBadge";
import SimpleBarChart from "../../components/ui/SimpleBarChart";

export default function FaweBreakdownPage() {
  const navigate = useNavigate();

  const [data, setData] = useState<FaweBreakdownPageResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadFaweBreakdown() {
    try {
      setIsLoading(true);

      const result = await getFaweBreakdownPage();

      setData(result);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to load FAWE breakdown.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadFaweBreakdown();
  }, []);

  const categories = data?.categories;

  const categoryList = useMemo(() => {
    if (!categories) return [];

    return [
      categories.Fraud,
      categories.Abuse,
      categories.Waste,
      categories.Error,
    ];
  }, [categories]);

  const chartData = categoryList.map((category) => ({
    label: category.category,
    value: category.total_events,
    tone:
      category.category === "Fraud"
        ? "red"
        : category.category === "Abuse"
        ? "amber"
        : category.category === "Waste"
        ? "green"
        : "slate",
  })) as any[];

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!categories) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center shadow-soft">
        <h1 className="text-2xl font-black text-fawe-navy">
          No FAWE data found
        </h1>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-fawe-navy p-6 text-white shadow-soft">
        <p className="text-sm font-black uppercase tracking-[0.25em] text-fawe-greenSoft">
          Level 7 FAWE Breakdown
        </p>

        <h1 className="mt-3 text-3xl font-black">
          What type of risk is most common?
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
          FAWE Shield separates fraud from abuse, waste, and error. Not every
          claim problem is fraud. This distinction helps teams take the right
          action.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Fraud"
          value={formatNumber(categories.Fraud.total_events)}
          subtitle="Intentional deception"
          tone="red"
        />
        <StatCard
          title="Abuse"
          value={formatNumber(categories.Abuse.total_events)}
          subtitle="Overuse or improper use"
          tone="amber"
        />
        <StatCard
          title="Waste"
          value={formatNumber(categories.Waste.total_events)}
          subtitle="Unnecessary cost"
          tone="green"
        />
        <StatCard
          title="Error"
          value={formatNumber(categories.Error.total_events)}
          subtitle="Missing or incorrect data"
          tone="slate"
        />
      </section>

      <SectionCard
        title="FAWE Category Distribution"
        subtitle="Shows which type of risk appears most often."
      >
        <SimpleBarChart data={chartData} valueFormatter={formatNumber} />
      </SectionCard>

      <section className="grid gap-6 xl:grid-cols-2">
        <FaweCategorySection
          category={categories.Fraud}
          definition="Intentional deception, such as reused invoices, fake invoices, ghost visits, or mismatched eTIMS references."
          examples={[
            "Fake invoice = Fraud",
            "Invoice reused = Fraud",
            "Member denies visit = Fraud",
          ]}
          tone="red"
          onOpenClaim={(claimId) => navigate(`/claims/${claimId}`)}
        />

        <FaweCategorySection
          category={categories.Abuse}
          definition="Excessive or improper use of services, such as too many visits or repeated billing patterns."
          examples={[
            "Too many visits = Abuse",
            "Repeated diagnosis billing = Abuse",
            "Excessive provider billing = Abuse",
          ]}
          tone="amber"
          onOpenClaim={(claimId) => navigate(`/claims/${claimId}`)}
        />

        <FaweCategorySection
          category={categories.Waste}
          definition="Unnecessary cost, such as avoidable expensive services, unnecessary tests, or treatment above peer benchmark."
          examples={[
            "Unnecessary tests = Waste",
            "Above peer benchmark = Waste",
            "Expensive treatment where cheaper option exists = Waste",
          ]}
          tone="green"
          onOpenClaim={(claimId) => navigate(`/claims/${claimId}`)}
        />

        <FaweCategorySection
          category={categories.Error}
          definition="Mistakes, missing documents, missing eTIMS receipt, wrong dates, or incomplete claim information."
          examples={[
            "Missing eTIMS = Error",
            "Missing invoice = Error",
            "Invalid date = Error",
          ]}
          tone="blue"
          onOpenClaim={(claimId) => navigate(`/claims/${claimId}`)}
        />
      </section>
    </div>
  );
}

function FaweCategorySection({
  category,
  definition,
  examples,
  tone,
  onOpenClaim,
}: {
  category: FaweCategoryDetail;
  definition: string;
  examples: string[];
  tone: "red" | "amber" | "green" | "blue";
  onOpenClaim: (claimId: string) => void;
}) {
  const toneClasses = {
    red: "border-red-100 bg-fawe-redSoft text-fawe-red",
    amber: "border-amber-100 bg-fawe-amberSoft text-amber-700",
    green: "border-green-100 bg-fawe-greenSoft text-fawe-greenDark",
    blue: "border-blue-100 bg-blue-100 text-blue-700",
  };

  return (
    <section className="rounded-3xl bg-white p-5 shadow-soft">
      <div className={`rounded-3xl border p-5 ${toneClasses[tone]}`}>
        <p className="text-sm font-black uppercase tracking-[0.2em]">
          {category.category}
        </p>
        <p className="mt-3 text-sm leading-7">{definition}</p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <MiniStat label="Events" value={formatNumber(category.total_events)} />
        <MiniStat
          label="Affected Claims"
          value={formatNumber(category.affected_claims)}
        />
        <MiniStat label="Points" value={formatNumber(category.total_points)} />
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-black text-fawe-navy">Important Examples</h3>
        <div className="mt-3 space-y-2">
          {examples.map((example) => (
            <div
              key={example}
              className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600"
            >
              {example}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-black text-fawe-navy">Top Rules</h3>

        <div className="mt-3 space-y-3">
          {category.top_rules.map((rule) => (
            <div
              key={rule.risk_code}
              className="rounded-2xl border border-slate-100 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-black text-fawe-navy">
                    {rule.risk_code}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {rule.message}
                  </p>
                </div>

                <RiskBadge
                  label={`${formatNumber(rule.total_events)} events`}
                  tone={
                    category.category === "Fraud"
                      ? "red"
                      : category.category === "Abuse"
                      ? "amber"
                      : category.category === "Waste"
                      ? "green"
                      : "slate"
                  }
                />
              </div>
            </div>
          ))}

          {category.top_rules.length === 0 && (
            <EmptyMessage message="No top rules found." />
          )}
        </div>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-black text-fawe-navy">Example Claims</h3>

        <div className="mt-3 space-y-3">
          {category.example_claims.map((claim) => (
            <button
              key={`${category.category}-${claim.claim_id}-${claim.risk_code}`}
              onClick={() => onOpenClaim(claim.claim_id)}
              className="w-full rounded-2xl border border-slate-100 p-4 text-left transition hover:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-black text-fawe-navy">{claim.claim_id}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {claim.provider_name}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    {claim.risk_code} • {claim.message}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-black text-fawe-navy">
                    {formatCurrency(claim.claim_amount)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Risk {claim.total_risk_score}
                  </p>
                </div>
              </div>
            </button>
          ))}

          {category.example_claims.length === 0 && (
            <EmptyMessage message="No example claims found." />
          )}
        </div>
      </div>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-black text-fawe-navy">{value}</p>
    </div>
  );
}

function EmptyMessage({ message }: { message: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5 text-center text-sm text-slate-500">
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