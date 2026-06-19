import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";

import LoginPage from "../features/auth/LoginPage";
import ProtectedRoute from "../features/auth/ProtectedRoute";
import RoleEntryRedirect from "../features/auth/RoleEntryRedirect";
import AppLayout from "../components/layout/AppLayout";
import DashboardSkeleton from "../components/loading/DashboardSkeleton";

import UnauthorizedPage from "../pages/errors/UnauthorizedPage";
import NotFoundPage from "../pages/errors/NotFoundPage";

const MainDashboardPage = lazy(
  () => import("../pages/dashboard/MainDashboardPage")
);

const ClaimsReviewPage = lazy(
  () => import("../pages/claims/ClaimsReviewPage")
);

const InvestigationQueuePage = lazy(
  () => import("../pages/investigations/InvestigationQueuePage")
);

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<DashboardSkeleton />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },

  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <RoleEntryRedirect />,
      },
      {
        path: "dashboard",
        element: (
          <ProtectedRoute
            allowedRoles={[
              "system_admin",
              "insurer_admin",
              "claims_officer",
              "fraud_investigator",
            ]}
          >
            <LazyPage>
              <MainDashboardPage />
            </LazyPage>
          </ProtectedRoute>
        ),
      },
      {
        path: "insurer/dashboard",
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: "claims/review",
        element: (
          <ProtectedRoute allowedRoles={["insurer_admin", "claims_officer"]}>
            <LazyPage>
              <ClaimsReviewPage />
            </LazyPage>
          </ProtectedRoute>
        ),
      },
      {
        path: "investigations/queue",
        element: (
          <ProtectedRoute
            allowedRoles={["insurer_admin", "fraud_investigator"]}
          >
            <LazyPage>
              <InvestigationQueuePage />
            </LazyPage>
          </ProtectedRoute>
        ),
      },
    ],
  },

  {
    path: "/unauthorized",
    element: <UnauthorizedPage />,
  },

  {
    path: "*",
    element: <NotFoundPage />,
  },
]);