const express = require("express");
const router = express.Router();

const {
  loginAdmin,
  forgotAdminPassword,
  resetAdminPassword,
  validateAdminResetToken,
  getAdminProfile,
  updateAdminProfile,
  updateAdminAccount,
} = require("../controllers/adminAuthController");

const { getDashboardStats } = require("../controllers/adminDashboardController");

const {
  getAppointmentSummary,
  getRevenueSummary,
} = require("../controllers/adminReportController");

const { protectAdmin } = require("../middleware/adminAuthMiddleware");

// Auth
router.post("/login", loginAdmin);
router.post("/forgot-password", forgotAdminPassword);
router.get("/reset-password/:token/valid", validateAdminResetToken);
router.post("/reset-password/:token", resetAdminPassword);

// Self-service (Settings screens)
router.get("/profile", protectAdmin, getAdminProfile);
router.put("/profile", protectAdmin, updateAdminProfile);
router.put("/account", protectAdmin, updateAdminAccount);

// Dashboard
router.get("/dashboard", protectAdmin, getDashboardStats);

// Reports
router.get("/reports/appointments", protectAdmin, getAppointmentSummary);
router.get("/reports/revenue", protectAdmin, getRevenueSummary);

// Note: Services and Staff CRUD live under /api/services/admin/* and
// /api/staff/admin/* respectively (see serviceRoutes.js / staffRoutes.js)
// rather than here, since they extend those existing resource routers.

module.exports = router;
