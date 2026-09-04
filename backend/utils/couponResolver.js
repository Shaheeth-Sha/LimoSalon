const ClaimedReward = require("../models/ClaimedReward");
const Coupon = require("../models/Coupon");

const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

// Resolves a code typed in at checkout to either a customer's own
// claimed loyalty reward (ClaimedReward — single-use, tied to that one
// customer) or a salon-wide promotional coupon (Coupon — reusable by
// any customer until it expires, e.g. "BRIDAL20"). Checked in that
// order since a claimed-reward code is always personal to the customer
// entering it.
//
// Shared by paymentController.js (so the Stripe charge is for the
// correct, already-discounted amount) and bookingController.js (so the
// booking record's own amountPaid/discountAmount matches) — both MUST
// resolve the same code to the same discount, or the Stripe charge and
// the booking would disagree.
const resolveAppliedCoupon = async (couponCode, customerId) => {
  if (!couponCode) return null;

  const normalizedCode = String(couponCode).trim().toUpperCase();

  const claimedReward = await ClaimedReward.findOne({
    code: normalizedCode,
    customer: customerId,
    redeemedAt: null,
  });

  if (claimedReward) {
    if (claimedReward.expiresAt && claimedReward.expiresAt.getTime() < Date.now()) {
      const error = new Error("This coupon code has expired");
      error.statusCode = 400;
      throw error;
    }

    return {
      source: "claimedReward",
      doc: claimedReward,
      code: claimedReward.code,
      discountType: claimedReward.discountType,
      discountValue: claimedReward.discountValue,
    };
  }

  const now = new Date();

  const promoCoupon = await Coupon.findOne({
    code: normalizedCode,
    isActive: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now },
  });

  if (promoCoupon) {
    return {
      source: "promoCoupon",
      doc: promoCoupon,
      code: promoCoupon.code,
      discountType: promoCoupon.discountType,
      discountValue: promoCoupon.discountValue,
    };
  }

  // Give a more specific reason when the code IS this customer's own
  // claimed reward but it's already been used — "invalid or expired"
  // would be confusing/misleading there, since the code was perfectly
  // valid, it's just already spent. Doesn't distinguish a code that
  // belongs to someone else vs. one that was never issued at all,
  // which is the right amount of vagueness for that case (no need to
  // confirm someone else's code exists).
  const alreadyUsed = await ClaimedReward.findOne({
    code: normalizedCode,
    customer: customerId,
    redeemedAt: { $ne: null },
  });

  if (alreadyUsed) {
    const error = new Error("This coupon code has already been used");
    error.statusCode = 400;
    throw error;
  }

  const error = new Error("Invalid or expired coupon code");
  error.statusCode = 400;
  throw error;
};

// discountType "freeService" deliberately doesn't reduce the total —
// there's no way to know which selected service should be free without
// dedicated UI for the customer to specify that, so it's still honored
// in person at the salon instead (matches the pre-existing rule for
// loyalty-claimed freeService rewards).
const calculateCouponDiscount = (originalTotal, appliedCoupon) => {
  if (!appliedCoupon) return 0;

  if (appliedCoupon.discountType === "percentage") {
    return roundMoney(originalTotal * (Number(appliedCoupon.discountValue) / 100));
  }

  if (appliedCoupon.discountType === "fixed") {
    return Math.min(roundMoney(Number(appliedCoupon.discountValue)), originalTotal);
  }

  return 0;
};

module.exports = { resolveAppliedCoupon, calculateCouponDiscount };
