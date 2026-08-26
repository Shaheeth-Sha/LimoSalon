const mongoose = require("mongoose");

// The catalog of claimable rewards (matches your Figma "My Rewards"
// screen: "Free Hair Wash", "15% OFF on Any Services", etc.). For
// now these are seeded/managed directly in MongoDB — a real admin
// panel to manage this list is planned as a later phase.
const rewardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    pointsCost: {
      type: Number,
      required: true,
      min: 0,
    },

    discountType: {
      type: String,
      enum: ["percentage", "fixed", "freeService"],
      required: true,
    },

    // Meaning depends on discountType:
    //   percentage  -> e.g. 15 means 15% off
    //   fixed       -> e.g. 500 means LKR 500 off
    //   freeService -> ignored; freeServiceName below is used instead
    discountValue: {
      type: Number,
      default: 0,
      min: 0,
    },

    freeServiceName: {
      type: String,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Reward", rewardSchema);