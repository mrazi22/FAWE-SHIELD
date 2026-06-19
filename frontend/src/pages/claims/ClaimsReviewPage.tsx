import { useAuth } from "../../context/AuthContext";

export default function ClaimsReviewPage() {
  const { user, logout } = useAuth();

  return (
    <main className="min-h-screen bg-fawe-background p-6">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-3xl bg-white p-6 shadow-soft">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-bold text-fawe-amber">
                Claims Officer Workspace
              </p>
              <h1 className="mt-2 text-3xl font-bold text-fawe-navy">
                Claims Needing Review
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Review claims flagged as Review, Pending Documents, or Approve
                with Notes.
              </p>
            </div>

            <div className="text-left md:text-right">
              <p className="text-sm font-semibold text-fawe-navy">
                {user?.name}
              </p>
              <p className="text-xs text-slate-500">{user?.role}</p>
              <button
                onClick={logout}
                className="mt-3 rounded-xl bg-fawe-navy px-4 py-2 text-xs font-bold text-white"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        <section className="mt-8 rounded-3xl border border-amber-100 bg-fawe-amberSoft p-6">
          <h2 className="text-lg font-bold text-amber-800">
            Review queue placeholder
          </h2>
          <p className="mt-2 text-sm text-amber-800">
            Next, connect this page to:
            <span className="font-bold">
              {" "}
              /api/claims?recommendation=Review
            </span>
            .
          </p>
        </section>
      </div>
    </main>
  );
}