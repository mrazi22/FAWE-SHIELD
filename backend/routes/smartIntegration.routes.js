const express = require("express");

const smartIntegrationController = require("../controllers/smartIntegration.controller");

const {
  authenticateIntegrationClient,
} = require("../middleware/integrationAuth.middleware");

const router = express.Router();

router.post(
  "/claims",
  authenticateIntegrationClient,
  smartIntegrationController.receiveSmartClaim
);

module.exports = router;
