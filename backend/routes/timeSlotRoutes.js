const express = require("express");
const router = express.Router();

const {
  getAvailableTimes,
  updateTimeConfig,
} = require("../controllers/timeSlotController");

// Public — the dateTime screen calls this before the customer is
// necessarily logged in, same as the staff list endpoint.
// e.g. GET /api/time-slots?bookingType=bridal
router.get("/", getAvailableTimes);

// Admin-only once wired up. PUT /api/time-slots/bridal
// Body: { startMinutes, endMinutes, intervalMinutes }
//
// TODO: add your admin auth middleware here before shipping, e.g.:
//   const { protectAdmin } = require("../middleware/adminAuthMiddleware");
//   router.put("/:bookingType", protectAdmin, updateTimeConfig);
router.put("/:bookingType", updateTimeConfig);

module.exports = router;