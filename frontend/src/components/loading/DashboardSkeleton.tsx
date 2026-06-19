import Skeleton from "./Skeleton";

export default function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-fawe-background p-4 md:p-6">
      <div className="space-y-6">
        <div className="rounded-3xl bg-white p-5 shadow-soft">
          <Skeleton className="h-6 w-48" />

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    </div>
  );
}