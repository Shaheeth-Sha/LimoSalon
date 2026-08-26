const mongoose = require("mongoose");

// Salon-wide promotional coupons (e.g. "Bridal Season 20% off"),
// distinct from loyalty Rewards — these aren't earned with points,
// they're just active discounts any customer can view and apply.
// "New" and "Expiring Soon" (matching Figma's tabs) are computed from
// dates at query time, not stored as a field — see couponController.
const couponSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },

    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },

    validFrom: {
      type: Date,
      default: Date.now,
    },

    validUntil: {
      type: Date,
      required: true,
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

module.exports = mongoose.model("Coupon", couponSchema);