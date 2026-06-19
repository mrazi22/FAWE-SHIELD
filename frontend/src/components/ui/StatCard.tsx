type StatCardTone = "green" | "red" | "amber" | "navy" | "slate";

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  tone?: StatCardTone;
};

export default function StatCard({
  title,
  value,
  subtitle,
  tone = "slate",
}: StatCardProps) {
  const toneClasses: Record<StatCardTone, string> = {
    green: "bg-fawe-greenSoft text-fawe-greenDark",
    red: "bg-fawe-redSoft text-fawe-red",
    amber: "bg-fawe-amberSoft text-amber-700",
    navy: "bg-fawe-navy text-white",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="rounded-3xl bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lg">
      <div
        className={`mb-4 inline-flex rounded-2xl px-3 py-1 text-xs font-bold ${toneClasses[tone]}`}
      >
        {title}
      </div>

      <p className="text-2xl font-black tracking-tight text-fawe-navy">
        {value}
      </p>

      {subtitle && (
        <p className="mt-2 text-xs leading-5 text-slate-500">{subtitle}</p>
      )}
    </div>
  );
}