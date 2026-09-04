const express = require("express");
const router = express.Router();

const {
  getLoyaltyDashboard,
  getRewards,
  getMyClaimedRewards,
  claimReward,
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

module.exports = router;