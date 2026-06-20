import type {
  ClaimRecommendation,
  ClaimType,
  FaweType,
  GetClaimsParams,
  ProviderFilterOption,
  InsurerFilterOption,
} from "../../types/claims.types";

type ClaimsFiltersProps = {
  filters: GetClaimsParams;
  providerOptions: ProviderFilterOption[];
  insurerOptions: InsurerFilterOption[];
  onChange: (filters: GetClaimsParams) => void;
  onReset: () => void;
};

export default function ClaimsFilters({
  filters,
  providerOptions,
  insurerOptions,
  onChange,
  onReset,
}: ClaimsFiltersProps) {
  function updateFilter<K extends keyof GetClaimsParams>(
    key: K,
    value: GetClaimsParams[K]
  ) {
    onChange({
      ...filters,
      page: 1,
      [key]: value || undefined,
    });
  }

  return (
    <div className="rounded-3xl bg-white p-5 shadow-soft">
      <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h2 className="text-lg font-black text-fawe-navy">
            Queue Filters
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Filter claims by recommendation, FAWE type, provider, insurer, or
            search term.
          </p>
        </div>

        <button
          onClick={onReset}
          className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200"
        >
          Reset Filters
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <div>
          <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
            Recommendation
          </label>
          <select
            value={filters.recommendation || ""}
            onChange={(event) =>
              updateFilter(
                "recommendation",
                event.target.value as ClaimRecommendation
              )
            }
            className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-fawe-green focus:ring-4 focus:ring-green-100"
          >
            <option value="">All</option>
            <option value="Investigate">Investigate</option>
            <option value="Review">Review</option>
            <option value="Approve">Approve</option>
            <option value="Approve with Notes">Approve with Notes</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
            FAWE Type
          </label>
          <select
            value={filters.primary_fawe_type || ""}
            onChange={(event) =>
              updateFilter("primary_fawe_type", event.target.value as FaweType)
            }
            className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-fawe-green focus:ring-4 focus:ring-green-100"
          >
            <option value="">All</option>
            <option value="Fraud">Fraud</option>
            <option value="Abuse">Abuse</option>
            <option value="Waste">Waste</option>
            <option value="Error">Error</option>
            <option value="Clean">Clean</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
            Claim Type
          </label>
          <select
            value={filters.claim_type || ""}
            onChange={(event) =>
              updateFilter("claim_type", event.target.value as ClaimType)
            }
            className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-fawe-green focus:ring-4 focus:ring-green-100"
          >
            <option value="">All</option>
            <option value="Inpatient">Inpatient</option>
            <option value="Outpatient">Outpatient</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
            Provider
          </label>
          <select
            value={filters.provider || ""}
            onChange={(event) => updateFilter("provider", event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-fawe-green focus:ring-4 focus:ring-green-100"
          >
            <option value="">All Providers</option>

            {providerOptions.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name || provider.id}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
            Insurer
          </label>
          <select
            value={filters.insurer || ""}
            onChange={(event) => updateFilter("insurer", event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-fawe-green focus:ring-4 focus:ring-green-100"
          >
            <option value="">All Insurers</option>

            {insurerOptions.map((insurer) => (
              <option key={insurer.id} value={insurer.id}>
                {insurer.name || insurer.id}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
            Search
          </label>
          <input
            value={filters.search || ""}
            onChange={(event) => updateFilter("search", event.target.value)}
            placeholder="Claim/member/provider"
            className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-fawe-green focus:ring-4 focus:ring-green-100"
          />
        </div>
      </div>
    </div>
  );
}