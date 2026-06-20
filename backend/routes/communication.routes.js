const express = require("express");

const communicationController = require("../controllers/communication.controller");
const {
  authenticate,
  requireRole,
} = require("../middleware/auth.middleware");

const router = express.Router();

const communicationRoles = [
  "system_admin",
  "insurer_admin",
  "claims_officer",
  "fraud_investigator",
];

router.get(
  "/confirm-claim",
  communicationController.confirmClaimVisit
);

router.post(
  "/email/test",
  authenticate,
  requireRole(communicationRoles),
  communicationController.testEmail
);

router.get(
  "/email/verify",
  authenticate,
  requireRole(communicationRoles),
  communicationController.verifyEmail
);
router.get(
  "/claims/:claimId/status",
  authenticate,
  requireRole(communicationRoles),
  communicationController.getClaimCommunicationStatus
);

router.post(
  "/claims/:claimId/manager-alert",
  authenticate,
  requireRole(communicationRoles),
  communicationController.sendManagerAlert
);

router.post(
  "/claims/:claimId/high-risk-alert",
  authenticate,
  requireRole(communicationRoles),
  communicationController.sendHighRisk
);

router.post(
  "/claims/:claimId/missing-documents-alert",
  authenticate,
  requireRole(communicationRoles),
  communicationController.sendMissingDocuments
);

router.post(
  "/claims/:claimId/member-confirmation",
  authenticate,
  requireRole(communicationRoles),
  communicationController.sendMemberConfirmation
);

router.post(
  "/reports/loss-ratio",
  authenticate,
  requireRole(communicationRoles),
  communicationController.sendLossRatio
);

module.exports = router;
