type RiskBadgeProps = {
  label: string;
  tone?: "green" | "red" | "amber" | "slate";
};

export default function RiskBadge({ label, tone = "slate" }: RiskBadgeProps) {
  const toneClasses = {
    green: "bg-fawe-greenSoft text-fawe-greenDark",
    red: "bg-fawe-redSoft text-fawe-red",
    amber: "bg-fawe-amberSoft text-amber-700",
    slate: "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${toneClasses[tone]}`}
    >
      {label}
    </span>
  );
}