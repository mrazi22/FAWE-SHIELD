import { useNavigate } from "react-router-dom";
import type { Claim } from "../../types/claims.types";
import ClaimPriorityBadge from "./ClaimPriorityBadge";

type ClaimsTableProps = {
  claims: Claim[];
};

export default function ClaimsTable({ claims }: ClaimsTableProps) {
  const navigate = useNavigate();

  return (
    <div className="hidden overflow-hidden rounded-3xl bg-white shadow-soft lg:block">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <th className="px-5 py-4">Priority</th>
            <th className="px-5 py-4">Claim ID</th>
            <th className="px-5 py-4">Member</th>
            <th className="px-5 py-4">Provider</th>
            <th className="px-5 py-4">Amount</th>
            <th className="px-5 py-4">FAWE</th>
            <th className="px-5 py-4">Risk</th>
            <th className="px-5 py-4">Recommendation</th>
            <th className="px-5 py-4">Status</th>
            <th className="px-5 py-4">Date</th>
          </tr>
        </thead>

        <tbody>
          {claims.map((claim) => (
            <tr
              key={claim.claim_id}
              onClick={() => navigate(`/claims/${claim.claim_id}`)}
              className="cursor-pointer border-b border-slate-100 transition hover:bg-slate-50"
            >
              <td className="px-5 py-4">
                <ClaimPriorityBadge
                  recommendation={claim.recommendation}
                  claimStatus={claim.claim_status}
                  faweType={claim.primary_fawe_type}
                />
              </td>

              <td className="px-5 py-4">
                <p className="font-black text-fawe-navy">{claim.claim_id}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {claim.claim_type}
                </p>
              </td>

              <td className="px-5 py-4">
                <p className="font-semibold text-slate-700">
                  {claim.member_name || claim.member_id}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {claim.member_id}
                </p>
              </td>

              <td className="px-5 py-4">
                <p className="max-w-48 truncate font-semibold text-slate-700">
                  {claim.provider_name}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {claim.kenya_provider_id}
                </p>
              </td>

              <td className="px-5 py-4 font-black text-fawe-navy">
                {formatCurrency(claim.claim_amount)}
              </td>

              <td className="px-5 py-4">
                <FaweBadge type={claim.primary_fawe_type} />
              </td>

              <td className="px-5 py-4">
                <RiskScore score={claim.total_risk_score} />
              </td>

              <td className="px-5 py-4">
                <RecommendationBadge value={claim.recommendation} />
              </td>

              <td className="px-5 py-4">
                <StatusBadge value={claim.claim_status} />
              </td>

              <td className="px-5 py-4 text-sm text-slate-500">
                {formatDate(claim.claim_start_date)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {claims.length === 0 && (
        <div className="p-10 text-center text-sm text-slate-500">
          No claims found for the selected filters.
        </div>
      )}
    </div>
  );
}

export function FaweBadge({ type }: { type: string }) {
  const classes =
    type === "Fraud"
      ? "bg-fawe-redSoft text-fawe-red"
      : type === "Abuse"
      ? "bg-fawe-amberSoft text-amber-700"
      : type === "Waste"
      ? "bg-fawe-greenSoft text-fawe-greenDark"
      : type === "Error"
      ? "bg-blue-100 text-blue-700"
      : "bg-slate-100 text-slate-600";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${classes}`}>
      {type || "Clean"}
    </span>
  );
}

export function RecommendationBadge({ value }: { value: string }) {
  const classes =
    value === "Investigate"
      ? "bg-fawe-redSoft text-fawe-red"
      : value === "Review"
      ? "bg-fawe-amberSoft text-amber-700"
      : "bg-fawe-greenSoft text-fawe-greenDark";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${classes}`}>
      {value}
    </span>
  );
}

export function StatusBadge({ value }: { value: string }) {
  const classes =
    value === "Pending Documents"
      ? "bg-blue-100 text-blue-700"
      : value === "Investigate"
      ? "bg-fawe-redSoft text-fawe-red"
      : value === "Under Review"
      ? "bg-fawe-amberSoft text-amber-700"
      : value === "Approved" || value === "Paid"
      ? "bg-fawe-greenSoft text-fawe-greenDark"
      : "bg-slate-100 text-slate-600";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${classes}`}>
      {value}
    </span>
  );
}

export function RiskScore({ score }: { score: number }) {
  const scoreValue = Number(score || 0);

  const classes =
    scoreValue >= 70
      ? "text-fawe-red"
      : scoreValue >= 40
      ? "text-amber-600"
      : "text-fawe-greenDark";

  return <span className={`font-black ${classes}`}>{scoreValue}</span>;
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