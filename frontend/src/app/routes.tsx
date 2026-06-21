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

const ClaimDetailPage = lazy(
  () => import("../pages/claims/ClaimDetailPage")
);

const InvestigationQueuePage = lazy(
  () => import("../pages/investigations/InvestigationQueuePage")
);
const ProviderRiskDashboardPage = lazy(
  () => import("../pages/providers/ProviderRiskDashboardPage")
);

const FaweBreakdownPage = lazy(
  () => import("../pages/fawe/FaweBreakdownPage")
);
const LossRatioReportPage = lazy(
  () => import("../pages/reports/LossRatioReportPage")
);
const SmartLctSimulatorPage = lazy(
  () => import("../pages/integrations/SmartLctSimulatorPage")
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
        path: "claims/:claimId",
        element: (
          <ProtectedRoute
            allowedRoles={[
              "system_admin",
              "insurer_admin",
              "claims_officer",
              "fraud_investigator",
              "provider_user",
              "member",
            ]}
          >
            <LazyPage>
              <ClaimDetailPage />
            </LazyPage>
          </ProtectedRoute>
        ),
      },

      {
  path: "integrations/smart-simulator",
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
        <SmartLctSimulatorPage />
      </LazyPage>
    </ProtectedRoute>
  ),
},
      {
  path: "providers/risk",
  element: (
    <ProtectedRoute
      allowedRoles={[
        "system_admin",
        "insurer_admin",
        "fraud_investigator",
      ]}
    >
      <LazyPage>
        <ProviderRiskDashboardPage />
      </LazyPage>
    </ProtectedRoute>
  ),
},
{
  path: "fawe/breakdown",
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
        <FaweBreakdownPage />
      </LazyPage>
    </ProtectedRoute>
  ),
},
{
  path: "reports/loss-ratio",
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
        <LossRatioReportPage />
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
