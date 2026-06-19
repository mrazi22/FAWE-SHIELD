import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getRoleHomePath } from "./RoleEntryRedirect";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, user, isAuthenticated } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (isAuthenticated && user) {
    return <Navigate to={getRoleHomePath(user.role)} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const loggedInUser = await login({
        email,
        password,
      });

      navigate(getRoleHomePath(loggedInUser.role), {
        replace: true,
      });
    } catch (error: any) {
      setErrorMessage(error?.message || "Login failed. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-fawe-background">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="hidden bg-fawe-navy px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-3 rounded-full bg-white/10 px-4 py-2 text-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-fawe-green" />
              FAWE Shield
            </div>

            <div className="mt-20 max-w-xl">
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-fawe-greenSoft">
                Fraud • Abuse • Waste • Error
              </p>

              <h1 className="text-5xl font-bold leading-tight">
                Protect claims money before it leaks.
              </h1>

              <p className="mt-6 text-lg leading-8 text-slate-300">
                Login to review risky claims, investigate suspicious providers,
                recover possible savings, and protect insurer funds.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-2xl bg-white/10 p-5">
              <p className="text-3xl font-bold text-fawe-greenSoft">Save</p>
              <p className="mt-2 text-sm text-slate-300">
                Stop wasteful claims early.
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-5">
              <p className="text-3xl font-bold text-fawe-amber">Review</p>
              <p className="mt-2 text-sm text-slate-300">
                Route claims to officers.
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-5">
              <p className="text-3xl font-bold text-red-300">Block</p>
              <p className="mt-2 text-sm text-slate-300">
                Flag fraud patterns.
              </p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <div className="inline-flex items-center gap-3 rounded-full bg-fawe-greenSoft px-4 py-2 text-sm font-semibold text-fawe-greenDark">
                <span className="h-2.5 w-2.5 rounded-full bg-fawe-green" />
                FAWE Shield
              </div>
            </div>

            <div className="rounded-3xl bg-white p-8 shadow-soft">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-fawe-navy">
                  Login to FAWE Shield
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Your dashboard depends on your assigned role.
                </p>
              </div>

              {errorMessage && (
                <div className="mb-5 rounded-2xl border border-red-200 bg-fawe-redSoft px-4 py-3 text-sm font-medium text-fawe-red">
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="admin@fawe.test"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-fawe-green focus:ring-4 focus:ring-green-100"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter password"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-fawe-green focus:ring-4 focus:ring-green-100"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-2xl bg-fawe-green px-4 py-3 text-sm font-bold text-white shadow-lg shadow-green-200 transition hover:bg-fawe-greenDark disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Signing in..." : "Login"}
                </button>
              </form>

              <div className="mt-8 border-t border-slate-100 pt-6">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                  MVP role entry
                </p>

                <div className="grid gap-3">
                  <RoleHint
                    title="Insurer Admin"
                    description="Insurer-wide risk dashboard and savings view."
                    color="green"
                  />

                  <RoleHint
                    title="Claims Officer"
                    description="Claims needing review and document follow-up."
                    color="amber"
                  />

                  <RoleHint
                    title="Fraud Investigator"
                    description="High-risk queue and investigation workflow."
                    color="red"
                  />
                </div>
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-slate-400">
              FAWE Shield protects claims by detecting fraud, abuse, waste, and
              errors.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

type RoleHintProps = {
  title: string;
  description: string;
  color: "green" | "amber" | "red";
};

function RoleHint({ title, description, color }: RoleHintProps) {
  const colorClasses = {
    green: "bg-fawe-greenSoft text-fawe-greenDark",
    amber: "bg-fawe-amberSoft text-amber-700",
    red: "bg-fawe-redSoft text-fawe-red",
  };

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-100 p-3">
      <div
        className={`mt-0.5 h-9 w-9 rounded-xl ${colorClasses[color]} flex items-center justify-center text-sm font-bold`}
      >
        ✓
      </div>

      <div>
        <p className="text-sm font-bold text-fawe-navy">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}