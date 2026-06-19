import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-fawe-background px-6">
      <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-soft">
        <h1 className="text-5xl font-bold text-fawe-navy">404</h1>

        <p className="mt-3 text-sm text-slate-500">
          The page you are looking for does not exist.
        </p>

        <Link
          to="/"
          className="mt-6 inline-flex rounded-2xl bg-fawe-green px-5 py-3 text-sm font-bold text-white hover:bg-fawe-greenDark"
        >
          Return home
        </Link>
      </div>
    </main>
  );
}