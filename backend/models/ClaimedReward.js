const mongoose = require("mongoose");

// A real coupon record — this is what makes "Claim" actually mean
// something. Each claim generates a unique code the customer can
// enter/apply at checkout. Single-use: once redeemedAt is set, it
// can never be applied again.
const claimedRewardSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },

    reward: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reward",
      required: true,
    },

    // Snapshot of the reward's terms at the moment it was claimed,
    // so a later change to the Reward catalog can never retroactively
    // alter a coupon a customer has already claimed.
    title: {
      type: String,
      required: true,
    },

    discountType: {
      type: String,
      enum: ["percentage", "fixed", "freeService"],
      required: true,
    },

    discountValue: {
      type: Number,
      default: 0,
    },

    freeServiceName: {
      type: String,
      default: "",
    },

    code: {
      type: String,
      required: true,
      unique: true,
    },

    pointsSpent: {
      type: Number,
      required: true,
    },

    redeemedAt: {
      type: Date,
      default: null,
    },

    redeemedOnBooking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },

    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ClaimedReward", claimedRewardSchema);