import { createBrowserRouter } from "react-router-dom";

import LoginPage from "../features/auth/LoginPage";
import ProtectedRoute from "../features/auth/ProtectedRoute";
import RoleEntryRedirect from "../features/auth/RoleEntryRedirect";

import InsurerDashboardPage from "../pages/insurer/InsurerDashboardPage";
import ClaimsReviewPage from "../pages/claims/ClaimsReviewPage";
import InvestigationQueuePage from "../pages/investigations/InvestigationQueuePage";

import UnauthorizedPage from "../pages/errors/UnauthorizedPage";
import NotFoundPage from "../pages/errors/NotFoundPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RoleEntryRedirect />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/insurer/dashboard",
    element: (
      <ProtectedRoute allowedRoles={["insurer_admin", "system_admin"]}>
        <InsurerDashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/claims/review",
    element: (
      <ProtectedRoute allowedRoles={["claims_officer", "insurer_admin"]}>
        <ClaimsReviewPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/investigations/queue",
    element: (
      <ProtectedRoute
        allowedRoles={["fraud_investigator", "insurer_admin"]}
      >
        <InvestigationQueuePage />
      </ProtectedRoute>
    ),
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