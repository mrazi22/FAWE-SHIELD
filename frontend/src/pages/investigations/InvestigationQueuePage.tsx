import { useAuth } from "../../context/AuthContext";

export default function InvestigationQueuePage() {
  const { user, logout } = useAuth();

  return (
    <main className="min-h-screen bg-fawe-background p-6">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-3xl bg-fawe-navy p-6 text-white shadow-soft">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-bold text-red-300">
                Fraud Investigation
              </p>
              <h1 className="mt-2 text-3xl font-bold">
                Investigation Queue
              </h1>
              <p className="mt-2 text-sm text-slate-300">
                High-risk claims, suspicious providers, repeated invoices, and
                possible fraud patterns.
              </p>
            </div>

            <div className="text-left md:text-right">
              <p className="text-sm font-semibold">{user?.name}</p>
              <p className="text-xs text-slate-300">{user?.role}</p>
              <button
                onClick={logout}
                className="mt-3 rounded-xl bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        <section className="mt-8 rounded-3xl border border-red-100 bg-fawe-redSoft p-6">
          <h2 className="text-lg font-bold text-fawe-red">
            Investigation queue placeholder
          </h2>
          <p className="mt-2 text-sm text-red-700">
            Next, connect this page to:
            <span className="font-bold">
              {" "}
              /api/claims?recommendation=Investigate
            </span>
            .
          </p>
        </section>
      </div>
    </main>
  );
}