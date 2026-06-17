const express = require("express");

const claimsController = require("../controllers/claims.controller");

const {
  authenticate,
  requireRole,
} = require("../middleware/auth.middleware");

const router = express.Router();

router.get(
  "/",
  authenticate,
  requireRole([
    "system_admin",
    "insurer_admin",
    "claims_officer",
    "fraud_investigator",
    "provider_user",
  ]),
  claimsController.getClaims
);

router.get(
  "/:claimId",
  authenticate,
  requireRole([
    "system_admin",
    "insurer_admin",
    "claims_officer",
    "fraud_investigator",
    "provider_user",
    "member",
  ]),
  claimsController.getClaimById
);

router.post(
  "/",
  authenticate,
  requireRole([
    "system_admin",
    "insurer_admin",
    "claims_officer",
    "provider_user",
  ]),
  claimsController.createClaim
);

router.patch(
  "/:claimId/status",
  authenticate,
  requireRole([
    "system_admin",
    "insurer_admin",
    "claims_officer",
    "fraud_investigator",
  ]),
  claimsController.updateClaimStatus
);

router.post(
  "/:claimId/score",
  authenticate,
  requireRole([
    "system_admin",
    "insurer_admin",
    "claims_officer",
    "fraud_investigator",
  ]),
  claimsController.scoreClaim
);

module.exports = router;
