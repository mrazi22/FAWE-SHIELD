import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import {
  getClaimById,
  scoreClaim,
  updateClaimStatus,
} from "../../api/claimsApi";

import type {
  Claim,
  ClaimRiskCode,
  ClaimStatus,
} from "../../types/claims.types";

import ClaimDetailTabs, {
  type ClaimDetailTab,
} from "../../features/claims/ClaimDetailTabs";
import CommunicationPanel from "../../features/communications/CommunicationPanel";

import DashboardSkeleton from "../../components/loading/DashboardSkeleton";
import PrimaryButton from "../../components/ui/PrimaryButton";
import SectionCard from "../../components/ui/SectionCard";

import {
  FaweBadge,
  RecommendationBadge,
  RiskScore,
  StatusBadge,
} from "../../features/claims/ClaimsTable";

export default function ClaimDetailPage() {
  const navigate = useNavigate();
  const { claimId } = useParams();

  const [claim, setClaim] = useState<Claim | null>(null);
  const [riskCodes, setRiskCodes] = useState<ClaimRiskCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ClaimDetailTab>("overview");
  const [isUpdating, setIsUpdating] = useState(false);

  async function loadClaim() {
    if (!claimId) return;

    try {
      setIsLoading(true);

      const result = await getClaimById(claimId);

      setClaim(result.claim);
      setRiskCodes(result.risk_codes);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to load claim details.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadClaim();
  }, [claimId]);

  async function handleStatusUpdate(status: ClaimStatus) {
    if (!claimId) return;

    try {
      setIsUpdating(true);

      await updateClaimStatus(claimId, {
        claim_status: status,
      });

      toast.success(`Claim marked as ${status}.`);
      await loadClaim();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to update claim status.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleRescore() {
    if (!claimId) return;

    try {
      setIsUpdating(true);

      await scoreClaim(claimId);

      toast.success("Claim rescored successfully.");
      await loadClaim();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to rescore claim.");
    } finally {
      setIsUpdating(false);
    }
  }

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!claim) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center shadow-soft">
        <h1 className="text-2xl font-black text-fawe-navy">
          Claim not found
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          This claim does not exist or you do not have access.
        </p>

        <PrimaryButton
          tone="navy"
          className="mt-6"
          onClick={() => navigate("/claims/review")}
        >
          Back to Claims Queue
        </PrimaryButton>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-fawe-navy p-6 text-white shadow-soft">
        <button
          onClick={() => navigate("/claims/review")}
          className="mb-5 rounded-2xl bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20"
        >
          ← Back to Claims Queue
        </button>

        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-fawe-greenSoft">
              Claim Detail
            </p>

            <h1 className="mt-3 text-3xl font-black">{claim.claim_id}</h1>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              Review claim risk, FAWE reasons, documents, provider details, and
              recommended action.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <FaweBadge type={claim.primary_fawe_type} />
              <RecommendationBadge value={claim.recommendation} />
              <StatusBadge value={claim.claim_status} />
            </div>
          </div>

          <div className="rounded-3xl bg-white/10 p-5 backdrop-blur-xl">
            <p className="text-sm font-bold text-slate-300">Risk Score</p>
            <p className="mt-2 text-5xl font-black">
              <RiskScore score={claim.total_risk_score} />
            </p>
          </div>
        </div>
      </section>

      <ClaimDetailTabs activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "overview" && (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-4">
            <SummaryCard
              label="Claim Amount"
              value={formatCurrency(claim.claim_amount)}
            />
            <SummaryCard
              label="Member"
              value={claim.member_name || claim.member_id}
            />
            <SummaryCard label="Provider" value={claim.provider_name} />
            <SummaryCard label="Claim Type" value={claim.claim_type} />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <SectionCard
              title="Claim Information"
              subtitle="Basic claim, member, provider, and diagnosis details."
            >
              <div className="grid gap-3">
                <DetailRow
                  label="Insurer"
                  value={claim.insurer_name || claim.insurer_id}
                />
                <DetailRow label="Scheme" value={claim.scheme_name} />
                <DetailRow label="Member ID" value={claim.member_id} />
                <DetailRow label="Member Card" value={claim.member_card_no} />
                <DetailRow label="Provider ID" value={claim.kenya_provider_id} />
                <DetailRow label="County" value={claim.county} />
                <DetailRow label="Diagnosis" value={claim.diagnosis} />
                <DetailRow
                  label="Start Date"
                  value={formatDate(claim.claim_start_date)}
                />
                <DetailRow
                  label="End Date"
                  value={formatDate(claim.claim_end_date)}
                />
              </div>
            </SectionCard>

            <SectionCard
              title="FAWE Scores"
              subtitle="Separate scoring for Fraud, Abuse, Waste, and Error."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <ScoreCard label="Fraud" value={claim.fraud_score} tone="red" />
                <ScoreCard label="Abuse" value={claim.abuse_score} tone="amber" />
                <ScoreCard label="Waste" value={claim.waste_score} tone="green" />
                <ScoreCard label="Error" value={claim.error_score} tone="blue" />
              </div>
            </SectionCard>
          </section>

          <SectionCard
            title="Recommended Action"
            subtitle="Use this section to move the claim through the workflow."
          >
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm leading-7 text-slate-600">
                {claim.recommended_action || "No recommended action provided."}
              </p>

              {claim.risk_reasons && (
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  <span className="font-black text-fawe-navy">Risk Reasons:</span>{" "}
                  {claim.risk_reasons}
                </p>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <PrimaryButton
                tone="amber"
                disabled={isUpdating}
                onClick={() => handleStatusUpdate("Under Review")}
              >
                Mark Under Review
              </PrimaryButton>

              <PrimaryButton
                tone="red"
                disabled={isUpdating}
                onClick={() => handleStatusUpdate("Investigate")}
              >
                Send to Investigation
              </PrimaryButton>

              <PrimaryButton
                tone="green"
                disabled={isUpdating}
                onClick={() => handleStatusUpdate("Approved")}
              >
                Approve Claim
              </PrimaryButton>

              <PrimaryButton
                tone="navy"
                disabled={isUpdating}
                onClick={handleRescore}
              >
                Re-score Claim
              </PrimaryButton>
            </div>
          </SectionCard>
        </div>
      )}

      {activeTab === "risk_events" && (
        <SectionCard
          title="Risk Rules Triggered"
          subtitle="These explain why the claim was scored this way."
        >
          <div className="space-y-3">
            {riskCodes.length === 0 && (
              <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                No risk rules were triggered.
              </div>
            )}

            {riskCodes.map((risk) => (
              <div
                key={risk.id}
                className="rounded-2xl border border-slate-100 p-4"
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <p className="font-black text-fawe-navy">{risk.code}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {risk.message}
                    </p>
                    {risk.recommended_action && (
                      <p className="mt-2 text-sm font-semibold text-fawe-greenDark">
                        Action: {risk.recommended_action}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <FaweBadge type={risk.category} />
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                      {risk.points} pts
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {activeTab === "documents" && (
        <SectionCard
          title="Documents & eTIMS"
          subtitle="Missing documents and eTIMS validation signals."
        >
          <div className="grid gap-3">
            <DetailRow
              label="Uploaded Documents"
              value={claim.uploaded_documents}
            />
            <DetailRow
              label="Missing Documents"
              value={claim.missing_documents || "None"}
            />
            <DetailRow label="Claim Form No" value={claim.claim_form_no} />
            <DetailRow label="Authorization No" value={claim.authorization_no} />
            <DetailRow label="Invoice No" value={claim.invoice_no} />
            <DetailRow label="eTIMS Receipt" value={claim.etims_receipt_no} />
            <DetailRow
              label="eTIMS Verified"
              value={claim.etims_verified ? "Yes" : "No"}
            />
          </div>
        </SectionCard>
      )}

      {activeTab === "communication" && (
        <CommunicationPanel
          claimId={claim.claim_id}
          recommendation={claim.recommendation}
          claimStatus={claim.claim_status}
          missingDocuments={claim.missing_documents}
        />
      )}

      {activeTab === "audit_trail" && (
        <SectionCard
          title="Audit Trail"
          subtitle="This will show who changed the claim status, sent emails, or triggered actions."
        >
          <div className="rounded-2xl bg-slate-50 p-6 text-sm text-slate-500">
            Audit trail will be connected after we add claim status history and
            user activity logs.
          </div>
        </SectionCard>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-soft">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-3 text-lg font-black text-fawe-navy">{value || "-"}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex flex-col justify-between gap-1 rounded-2xl bg-slate-50 px-4 py-3 text-sm md:flex-row">
      <span className="font-semibold text-slate-400">{label}</span>
      <span className="font-bold text-slate-700">{value || "-"}</span>
    </div>
  );
}

function ScoreCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "red" | "amber" | "green" | "blue";
}) {
  const toneClasses = {
    red: "bg-fawe-redSoft text-fawe-red",
    amber: "bg-fawe-amberSoft text-amber-700",
    green: "bg-fawe-greenSoft text-fawe-greenDark",
    blue: "bg-blue-100 text-blue-700",
  };

  return (
    <div className={`rounded-3xl p-5 ${toneClasses[tone]}`}>
      <p className="text-sm font-black">{label}</p>
      <p className="mt-3 text-3xl font-black">{Number(value || 0)}</p>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value?: string) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}