const mongoose = require("mongoose");

// One loyalty account per customer. Points and tier live here rather
// than on the Customer model directly, so this stays isolated and
// easy to reason about (and easy to remove/rework later without
// touching auth-related fields).
const loyaltyAccountSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      unique: true,
      index: true,
    },

    // Current spendable balance — decreases when a reward is claimed.
    // Used ONLY for reward affordability, never for tier progress —
    // see the note on TIER_THRESHOLDS below for why.
    points: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Never decreases. Kept for reference/reporting (total points
    // ever earned), but — same as `points` — no longer drives tier.
    lifetimePoints: {
      type: Number,
      default: 0,
      min: 0,
    },

    tier: {
      type: String,
      enum: ["Bronze", "Silver", "Gold", "Platinum"],
      default: "Bronze",
    },

    completedAppointments: {
      type: Number,
      default: 0,
      min: 0,
    },

    memberSince: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Fixed: tier used to be based on lifetimePoints, the same unit
// ("points") shown right next to reward-redemption progress
// ("X points to go") in the same screen — two genuinely different
// concepts that happened to share a label, which reads as confusing
// or even broken to a real user (a common, well-documented pitfall in
// loyalty program design). Real programs like Sephora/Starbucks
// deliberately use a DIFFERENT unit for tier status than for
// redeemable rewards. Tier is now based on completedAppointments
// (visit frequency) instead — a genuinely different unit, and
// arguably more appropriate for a salon anyway, since it rewards
// loyalty/frequency rather than just spend.
const TIER_THRESHOLDS = [
  { tier: "Platinum", minVisits: 30 },
  { tier: "Gold", minVisits: 15 },
  { tier: "Silver", minVisits: 5 },
  { tier: "Bronze", minVisits: 0 },
];

loyaltyAccountSchema.methods.recalculateTier = function () {
  const matched = TIER_THRESHOLDS.find(
    (level) => this.completedAppointments >= level.minVisits
  );

  this.tier = matched ? matched.tier : "Bronze";
};

module.exports = mongoose.model("LoyaltyAccount", loyaltyAccountSchema);
module.exports.TIER_THRESHOLDS = TIER_THRESHOLDS;