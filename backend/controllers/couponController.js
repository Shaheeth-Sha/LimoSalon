const Coupon = require("../models/Coupon");

const NEW_WINDOW_DAYS = 14;
const EXPIRING_SOON_WINDOW_DAYS = 14;

// Figma's "New" / "Expiring Soon" tabs are computed here from dates
// rather than stored as a field on the coupon itself — this way a
// coupon automatically moves between categories as time passes,
// without anything needing to manually update it.
const getCouponCategory = (coupon) => {
  const now = Date.now();
  const createdAt = new Date(coupon.createdAt).getTime();
  const validUntil = new Date(coupon.validUntil).getTime();

  const daysSinceCreated = (now - createdAt) / (1000 * 60 * 60 * 24);
  const daysUntilExpiry = (validUntil - now) / (1000 * 60 * 60 * 24);

  const categories = [];

  if (daysSinceCreated <= NEW_WINDOW_DAYS) {
    categories.push("New");
  }

  if (daysUntilExpiry >= 0 && daysUntilExpiry <= EXPIRING_SOON_WINDOW_DAYS) {
    categories.push("Expiring Soon");
  }

  return categories;
};

const getCoupons = async (req, res) => {
  try {
    const now = new Date();

    const coupons = await Coupon.find({
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now },
    })
      .sort({ createdAt: -1 })
      .lean();

    const withCategories = coupons.map((coupon) => ({
      ...coupon,
      categories: getCouponCategory(coupon),
    }));

    return res.status(200).json({
      success: true,
      coupons: withCategories,
    });
  } catch (error) {
    console.error("Get coupons error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load coupons",
    });
  }
};

module.exports = {
  getCoupons,
};