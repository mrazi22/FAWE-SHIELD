const express = require("express");

const dashboardController = require("../controllers/dashboard.controller");

const {
  authenticate,
  requireRole,
} = require("../middleware/auth.middleware");

const router = express.Router();

router.get(
  "/summary",
  authenticate,
  requireRole([
    "system_admin",
    "insurer_admin",
    "claims_officer",
    "fraud_investigator",
    "provider_user",
  ]),
  dashboardController.getSummary
);

router.get(
  "/fawe-breakdown",
  authenticate,
  requireRole([
    "system_admin",
    "insurer_admin",
    "claims_officer",
    "fraud_investigator",
    "provider_user",
  ]),
  dashboardController.getFaweBreakdown
);
router.get(
  "/loss-ratio-page",
  authenticate,
  requireRole([
    "system_admin",
    "insurer_admin",
    "claims_officer",
    "fraud_investigator",
  ]),
  dashboardController.getLossRatioReportPage
);

router.get(
  "/provider-risk",
  authenticate,
  requireRole([
    "system_admin",
    "insurer_admin",
    "claims_officer",
    "fraud_investigator",
    "provider_user",
  ]),
  dashboardController.getProviderRisk
);

router.get(
  "/loss-ratio",
  authenticate,
  requireRole([
    "system_admin",
    "insurer_admin",
    "claims_officer",
    "fraud_investigator",
    "provider_user",
  ]),
  dashboardController.getLossRatio
);

router.get(
  "/provider-risk-dashboard",
  authenticate,
  requireRole([
    "system_admin",
    "insurer_admin",
    "claims_officer",
    "fraud_investigator",
  ]),
  dashboardController.getProviderRiskDashboard
);

router.get(
  "/fawe-breakdown-page",
  authenticate,
  requireRole([
    "system_admin",
    "insurer_admin",
    "claims_officer",
    "fraud_investigator",
  ]),
  dashboardController.getFaweBreakdownPage
);

module.exports = router;
