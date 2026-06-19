import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import type { UserRole } from "../../types/auth.types";

export function getRoleHomePath(role: UserRole): string {
  switch (role) {
    case "insurer_admin":
      return "/dashboard";

    case "claims_officer":
      return "/dashboard";

    case "fraud_investigator":
      return "/dashboard";

    case "system_admin":
      return "/dashboard";

    case "provider_user":
      return "/provider/documents";

    case "member":
      return "/member/claims";

    default:
      return "/login";
  }
}

export default function RoleEntryRedirect() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-fawe-background">
        <p className="text-sm text-slate-500">Checking session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getRoleHomePath(user.role)} replace />;
}