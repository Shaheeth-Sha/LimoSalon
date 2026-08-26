const express = require("express");
const router = express.Router();

const {
  getLoyaltyDashboard,
  getRewards,
  getMyClaimedRewards,
  claimReward,
  markBookingCompleted,
} = require("../controllers/loyaltyController");

const {
  protectCustomer,
} = require("../middleware/authMiddleware");

router.get(
  "/dashboard",
  protectCustomer,
  getLoyaltyDashboard
);

router.get(
  "/rewards",
  protectCustomer,
  getRewards
);

router.get(
  "/my-rewards",
  protectCustomer,
  getMyClaimedRewards
);

router.post(
  "/rewards/:rewardId/claim",
  protectCustomer,
  claimReward
);

// NOTE: temporary stand-in until a real staff-side app exists — see
// the comment above markBookingCompleted in loyaltyController.js.
router.patch(
  "/bookings/:bookingId/complete",
  protectCustomer,
  markBookingCompleted
);

module.exports = router;