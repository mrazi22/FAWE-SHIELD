import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getRoleHomePath } from "../../features/auth/RoleEntryRedirect";

export default function UnauthorizedPage() {
  const { user } = useAuth();

  const homePath = user ? getRoleHomePath(user.role) : "/login";

  return (
    <main className="flex min-h-screen items-center justify-center bg-fawe-background px-6">
      <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-soft">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-fawe-redSoft text-2xl font-bold text-fawe-red">
          !
        </div>

        <h1 className="text-2xl font-bold text-fawe-navy">
          Access denied
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          Your role does not have permission to view this page.
        </p>

        <Link
          to={homePath}
          className="mt-6 inline-flex rounded-2xl bg-fawe-green px-5 py-3 text-sm font-bold text-white hover:bg-fawe-greenDark"
        >
          Go back to my dashboard
        </Link>
      </div>
    </main>
  );
}