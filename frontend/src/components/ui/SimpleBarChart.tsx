type SimpleBarChartItem = {
  label: string;
  value: number;
  tone?: "green" | "red" | "amber" | "navy" | "slate";
};

type SimpleBarChartProps = {
  data: SimpleBarChartItem[];
  valueFormatter?: (value: number) => string;
};

export default function SimpleBarChart({
  data,
  valueFormatter,
}: SimpleBarChartProps) {
  const maxValue = Math.max(...data.map((item) => Number(item.value || 0)), 1);

  const toneClasses = {
    green: "bg-fawe-green",
    red: "bg-fawe-red",
    amber: "bg-fawe-amber",
    navy: "bg-fawe-navy",
    slate: "bg-slate-400",
  };

  if (data.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
        No data available yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((item) => {
        const percentage = Math.max((item.value / maxValue) * 100, 4);

        return (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
              <p className="truncate font-semibold text-slate-700">
                {item.label}
              </p>
              <p className="font-bold text-fawe-navy">
                {valueFormatter ? valueFormatter(item.value) : item.value}
              </p>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${
                  toneClasses[item.tone || "green"]
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}