const express = require("express");
const router = express.Router();

const {
  getServices,
  getServicesForAdmin,
  createService,
  updateService,
  deleteService,
} = require("../controllers/serviceController");

const { protectAdmin } = require("../middleware/adminAuthMiddleware");

// Public — used by the customer app.
router.get("/", getServices);

// Admin — service catalog management.
router.get("/admin/all", protectAdmin, getServicesForAdmin);
router.post("/admin", protectAdmin, createService);
router.put("/admin/:serviceId", protectAdmin, updateService);
router.delete("/admin/:serviceId", protectAdmin, deleteService);

module.exports = router;