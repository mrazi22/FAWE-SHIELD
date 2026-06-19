const express = require("express");
const rateLimit = require("express-rate-limit");

const authController = require("../controllers/auth.controller");
const {
  authenticate,
  requireRole,
} = require("../middleware/auth.middleware");

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many login attempts. Try again later.",
  },
});

router.post("/login", loginLimiter, authController.login);
router.post(
  "/users",
  authenticate,
  requireRole(["system_admin", "insurer_admin"]),
  authController.createUser
);

router.get("/me", authenticate, authController.me);

router.post("/logout", authenticate, authController.logout);

router.post("/logout-all", authenticate, authController.logoutAllDevices);

module.exports = router;