import { useNavigate } from "react-router-dom";
import type { Claim } from "../../types/claims.types";
import ClaimPriorityBadge from "./ClaimPriorityBadge";
import {
  FaweBadge,
  RecommendationBadge,
  RiskScore,
  StatusBadge,
} from "./ClaimsTable";

type ClaimsMobileCardsProps = {
  claims: Claim[];
};

export default function ClaimsMobileCards({ claims }: ClaimsMobileCardsProps) {
  const navigate = useNavigate();

  if (claims.length === 0) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center text-sm text-slate-500 shadow-soft lg:hidden">
        No claims found for the selected filters.
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:hidden">
      {claims.map((claim) => (
        <button
          key={claim.claim_id}
          onClick={() => navigate(`/claims/${claim.claim_id}`)}
          className="w-full rounded-3xl bg-white p-5 text-left shadow-soft"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="font-black text-fawe-navy">{claim.claim_id}</p>
              <p className="mt-1 text-xs text-slate-400">
                {formatDate(claim.claim_start_date)} • {claim.claim_type}
              </p>
            </div>

            <ClaimPriorityBadge
              recommendation={claim.recommendation}
              claimStatus={claim.claim_status}
              faweType={claim.primary_fawe_type}
            />
          </div>

          <div className="space-y-3">
            <InfoRow
              label="Member"
              value={claim.member_name || claim.member_id}
            />
            <InfoRow label="Provider" value={claim.provider_name} />
            <InfoRow
              label="Amount"
              value={formatCurrency(claim.claim_amount)}
            />

            <div className="flex flex-wrap gap-2 pt-2">
              <FaweBadge type={claim.primary_fawe_type} />
              <RecommendationBadge value={claim.recommendation} />
              <StatusBadge value={claim.claim_status} />
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">
                Risk <RiskScore score={claim.total_risk_score} />
              </span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="text-right font-bold text-slate-700">
        {value || "-"}
      </span>
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