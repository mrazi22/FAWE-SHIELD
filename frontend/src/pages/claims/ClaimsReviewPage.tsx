import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import {
  getClaims,
  getClaimFilterOptions,
} from "../../api/claimsApi";

import type {
  Claim,
  GetClaimsParams,
  ProviderFilterOption,
  InsurerFilterOption,
} from "../../types/claims.types";

import ClaimsFilters from "../../features/claims/ClaimsFilters";
import ClaimsTable from "../../features/claims/ClaimsTable";
import ClaimsMobileCards from "../../features/claims/ClaimsMobileCards";
import DashboardSkeleton from "../../components/loading/DashboardSkeleton";
import PrimaryButton from "../../components/ui/PrimaryButton";

const DEFAULT_FILTERS: GetClaimsParams = {
  page: 1,
  limit: 25,
};

export default function ClaimsReviewPage() {
  const [filters, setFilters] = useState<GetClaimsParams>(DEFAULT_FILTERS);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [providerOptions, setProviderOptions] = useState<ProviderFilterOption[]>([]);
const [insurerOptions, setInsurerOptions] = useState<InsurerFilterOption[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const page = filters.page || 1;
  const limit = filters.limit || 25;
  const totalPages = Math.max(Math.ceil(total / limit), 1);

  useEffect(() => {
    async function loadClaims() {
      try {
        setIsLoading(true);

        const result = await getClaims(filters);

        setClaims(result.data);
        setTotal(result.total);
      } catch (error: any) {
        console.error(error);
        toast.error(error?.message || "Failed to load claims queue.");
      } finally {
        setIsLoading(false);
      }
    }

    loadClaims();
  }, [filters]);

  useEffect(() => {
  async function loadFilterOptions() {
    try {
      const result = await getClaimFilterOptions();

      setProviderOptions(result.providers || []);
      setInsurerOptions(result.insurers || []);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to load filter options.");
    }
  }

  loadFilterOptions();
}, []);

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
  }

  function goToPage(nextPage: number) {
    setFilters((current) => ({
      ...current,
      page: nextPage,
    }));
  }

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-fawe-navy p-6 text-white shadow-soft">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-fawe-greenSoft">
              Level 3 Claims Queue
            </p>

            <h1 className="mt-3 text-3xl font-black">
              Claims Needing Attention
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              This page tells claims officers what to work on first. High-risk
              investigations appear first, followed by review and document
              action items.
            </p>
          </div>

          <div className="rounded-3xl bg-white/10 p-5 backdrop-blur-xl">
            <p className="text-sm font-bold text-slate-300">Total Results</p>
            <p className="mt-2 text-3xl font-black text-white">
              {formatNumber(total)}
            </p>
          </div>
        </div>
      </section>

     <ClaimsFilters
  filters={filters}
  providerOptions={providerOptions}
  insurerOptions={insurerOptions}
  onChange={setFilters}
  onReset={resetFilters}
/>

      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h2 className="text-xl font-black text-fawe-navy">Triage Queue</h2>
          <p className="mt-1 text-sm text-slate-500">
            Sorted by highest risk score and newest claim date.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <PriorityLegend label="Investigate" className="bg-fawe-red" />
          <PriorityLegend label="Review" className="bg-fawe-amber" />
          <PriorityLegend label="Approve" className="bg-fawe-green" />
        </div>
      </div>

      <ClaimsTable claims={claims} />
      <ClaimsMobileCards claims={claims} />

      <div className="flex flex-col items-center justify-between gap-4 rounded-3xl bg-white p-4 shadow-soft md:flex-row">
        <p className="text-sm font-semibold text-slate-500">
          Page {page} of {totalPages}
        </p>

        <div className="flex items-center gap-3">
          <PrimaryButton
            tone="navy"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
          >
            Previous
          </PrimaryButton>

          <PrimaryButton
            tone="green"
            disabled={page >= totalPages}
            onClick={() => goToPage(page + 1)}
          >
            Next
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function PriorityLegend({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
      <span className={`h-2.5 w-2.5 rounded-full ${className}`} />
      {label}
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-KE").format(Number(value || 0));
}