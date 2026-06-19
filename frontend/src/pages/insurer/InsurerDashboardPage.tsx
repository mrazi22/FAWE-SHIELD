import { useAuth } from "../../context/AuthContext";

export default function InsurerDashboardPage() {
  const { user, logout } = useAuth();

  return (
    <main className="min-h-screen bg-fawe-background p-6">
      <div className="mx-auto max-w-6xl">
        <Header
          title="Insurer Risk Dashboard"
          subtitle="Insurer-wide FAWE summary, savings, recommendations, and provider risk."
          userName={user?.name}
          role={user?.role}
          onLogout={logout}
        />

        <section className="mt-8 grid gap-5 md:grid-cols-4">
          <MetricCard label="Claims Processed" value="--" tone="navy" />
          <MetricCard label="Potential Savings" value="KES --" tone="green" />
          <MetricCard label="Review Claims" value="--" tone="amber" />
          <MetricCard label="Investigate" value="--" tone="red" />
        </section>

        <section className="mt-8 rounded-3xl bg-white p-6 shadow-soft">
          <h2 className="text-lg font-bold text-fawe-navy">
            Next step for this page
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Connect this page to your dashboard API:
            <span className="font-semibold text-fawe-navy">
              {" "}
              /api/dashboard/summary
            </span>
            .
          </p>
        </section>
      </div>
    </main>
  );
}

type HeaderProps = {
  title: string;
  subtitle: string;
  userName?: string;
  role?: string;
  onLogout: () => void;
};

function Header({ title, subtitle, userName, role, onLogout }: HeaderProps) {
  return (
    <div className="flex flex-col justify-between gap-4 rounded-3xl bg-fawe-navy p-6 text-white md:flex-row md:items-center">
      <div>
        <p className="text-sm font-semibold text-fawe-greenSoft">
          FAWE Shield
        </p>
        <h1 className="mt-2 text-3xl font-bold">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">{subtitle}</p>
      </div>

      <div className="text-left md:text-right">
        <p className="text-sm font-semibold">{userName}</p>
        <p className="text-xs text-slate-300">{role}</p>
        <button
          onClick={onLogout}
          className="mt-3 rounded-xl bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
  tone: "navy" | "green" | "amber" | "red";
};

function MetricCard({ label, value, tone }: MetricCardProps) {
  const toneClasses = {
    navy: "bg-fawe-navy text-white",
    green: "bg-fawe-greenSoft text-fawe-greenDark",
    amber: "bg-fawe-amberSoft text-amber-700",
    red: "bg-fawe-redSoft text-fawe-red",
  };

  return (
    <div className="rounded-3xl bg-white p-5 shadow-soft">
      <div
        className={`mb-4 inline-flex rounded-2xl px-3 py-1 text-xs font-bold ${toneClasses[tone]}`}
      >
        {label}
      </div>
      <p className="text-2xl font-bold text-fawe-navy">{value}</p>
    </div>
  );
}