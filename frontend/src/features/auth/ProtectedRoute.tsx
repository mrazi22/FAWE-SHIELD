import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import type { UserRole } from "../../types/auth.types";

type ProtectedRouteProps = {
  children: ReactNode;
  allowedRoles?: UserRole[];
};

export default function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-fawe-background">
        <div className="rounded-2xl bg-white px-6 py-4 shadow-soft">
          <p className="text-sm font-medium text-slate-600">
            Loading FAWE Shield...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}