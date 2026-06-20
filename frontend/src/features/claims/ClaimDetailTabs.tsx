type ClaimDetailTab =
  | "overview"
  | "risk_events"
  | "documents"
  | "communication"
  | "audit_trail";

type ClaimDetailTabsProps = {
  activeTab: ClaimDetailTab;
  onChange: (tab: ClaimDetailTab) => void;
};

const tabs: { label: string; value: ClaimDetailTab }[] = [
  {
    label: "Overview",
    value: "overview",
  },
  {
    label: "Risk Events",
    value: "risk_events",
  },
  {
    label: "Documents",
    value: "documents",
  },
  {
    label: "Communication",
    value: "communication",
  },
  {
    label: "Audit Trail",
    value: "audit_trail",
  },
];

export default function ClaimDetailTabs({
  activeTab,
  onChange,
}: ClaimDetailTabsProps) {
  return (
    <div className="overflow-x-auto rounded-3xl bg-white p-2 shadow-soft">
      <div className="flex min-w-max gap-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.value;

          return (
            <button
              key={tab.value}
              onClick={() => onChange(tab.value)}
              className={`rounded-2xl px-4 py-3 text-sm font-black transition ${
                isActive
                  ? "bg-fawe-green text-white shadow-lg shadow-green-100"
                  : "text-slate-500 hover:bg-slate-50 hover:text-fawe-navy"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export type { ClaimDetailTab };