import type {
  ClaimRecommendation,
  ClaimStatus,
  FaweType,
} from "../../types/claims.types";

type ClaimPriorityBadgeProps = {
  recommendation?: ClaimRecommendation | string;
  claimStatus?: ClaimStatus | string;
  faweType?: FaweType | string;
};

export default function ClaimPriorityBadge({
  recommendation,
  claimStatus,
  faweType,
}: ClaimPriorityBadgeProps) {
  const priority = getPriority({
    recommendation,
    claimStatus,
    faweType,
  });

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${priority.className}`}
    >
      {priority.label}
    </span>
  );
}

function getPriority({
  recommendation,
  claimStatus,
  faweType,
}: ClaimPriorityBadgeProps) {
  if (recommendation === "Investigate") {
    return {
      label: "High Priority",
      className: "bg-fawe-redSoft text-fawe-red",
    };
  }

  if (claimStatus === "Pending Documents") {
    return {
      label: "Action Required",
      className: "bg-blue-100 text-blue-700",
    };
  }

  if (recommendation === "Review") {
    return {
      label: "Medium Priority",
      className: "bg-fawe-amberSoft text-amber-700",
    };
  }

  if (recommendation === "Approve") {
    return {
      label: "Low Risk",
      className: "bg-fawe-greenSoft text-fawe-greenDark",
    };
  }

  if (faweType === "Fraud") {
    return {
      label: "Fraud Risk",
      className: "bg-fawe-redSoft text-fawe-red",
    };
  }

  return {
    label: "Normal",
    className: "bg-slate-100 text-slate-600",
  };
}