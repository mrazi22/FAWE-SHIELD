const express = require("express");

const userController = require("../controllers/user.controller");

const {
  authenticate,
  requireRole,
} = require("../middleware/auth.middleware");

const router = express.Router();

router.post(
  "/",
  authenticate,
  requireRole(["system_admin", "insurer_admin"]),
  userController.createUser
);

router.get(
  "/",
  authenticate,
  requireRole(["system_admin", "insurer_admin"]),
  userController.getUsers
);

module.exports = router;