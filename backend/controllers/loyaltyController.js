const crypto = require("crypto");

const LoyaltyAccount = require("../models/LoyaltyAccount");
const Reward = require("../models/Reward");
const ClaimedReward = require("../models/ClaimedReward");
const { createNotification } = require("./notificationController");

// Real-world standard: 1 point per LKR 100 spent, rounded down.
// Change this single constant to adjust the whole program's earn
// rate — nothing else needs updating.
const POINTS_PER_LKR = 1 / 100;

const getCustomerId = (req) => {
  return req.customer?._id || req.customer?.id || null;
};

const getOrCreateLoyaltyAccount = async (customerId) => {
  let account = await LoyaltyAccount.findOne({ customer: customerId });

  if (!account) {
    account = await LoyaltyAccount.create({ customer: customerId });
  }

  return account;
};

const generateCouponCode = () => {
  return `LMS-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
};

/* -------------------------------------------------------------------------- */
/*                              Loyalty Dashboard                             */
/* -------------------------------------------------------------------------- */

const getLoyaltyDashboard = async (req, res) => {
  try {
    const customerId = getCustomerId(req);

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "Customer authentication is required",
      });
    }

    const account = await getOrCreateLoyaltyAccount(customerId);

    const currentThresholdIndex = LoyaltyAccount.TIER_THRESHOLDS.findIndex(
      (level) => level.tier === account.tier
    );

    // TIER_THRESHOLDS is ordered highest-to-lowest, so the "next"
    // tier up is the entry immediately before the current one.
    const nextTierEntry =
      currentThresholdIndex > 0
        ? LoyaltyAccount.TIER_THRESHOLDS[currentThresholdIndex - 1]
        : null;

    const visitsToNextTier = nextTierEntry
      ? Math.max(nextTierEntry.minVisits - account.completedAppointments, 0)
      : 0;

    // New: matches Figma's "Next Reward: X Appointments Away" stat,
    // which the dashboard was missing entirely. Finds the cheapest
    // active reward the customer can't yet afford, then estimates how
    // many more completed appointments it'll take based on their own
    // average points earned per completed appointment so far.
    const cheapestUnaffordableReward = await Reward.findOne({
      isActive: true,
      pointsCost: { $gt: account.points },
    }).sort({ pointsCost: 1 });

    let nextReward = null;

    if (cheapestUnaffordableReward) {
      const pointsNeeded = cheapestUnaffordableReward.pointsCost - account.points;

      const averagePointsPerAppointment =
        account.completedAppointments > 0
          ? account.lifetimePoints / account.completedAppointments
          : 0;

      const appointmentsAway =
        averagePointsPerAppointment > 0
          ? Math.ceil(pointsNeeded / averagePointsPerAppointment)
          : null; // Not enough history yet to estimate meaningfully.

      nextReward = {
        title: cheapestUnaffordableReward.title,
        pointsCost: cheapestUnaffordableReward.pointsCost,
        pointsNeeded,
        appointmentsAway,
      };
    }

    return res.status(200).json({
      success: true,
      loyalty: {
        tier: account.tier,
        points: account.points,
        lifetimePoints: account.lifetimePoints,
        completedAppointments: account.completedAppointments,
        memberSince: account.memberSince,
        nextTier: nextTierEntry?.tier || null,
        visitsToNextTier,
        nextTierThreshold: nextTierEntry?.minVisits || null,
        nextReward,
      },
    });
  } catch (error) {
    console.error("Get loyalty dashboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load loyalty dashboard",
    });
  }
};

/* -------------------------------------------------------------------------- */
/*                                Rewards catalog                             */
/* -------------------------------------------------------------------------- */

const getRewards = async (req, res) => {
  try {
    const rewards = await Reward.find({ isActive: true }).sort({
      pointsCost: 1,
    });

    return res.status(200).json({
      success: true,
      rewards,
    });
  } catch (error) {
    console.error("Get rewards error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load rewards",
    });
  }
};

/* -------------------------------------------------------------------------- */
/*                          Claimed rewards (customer's own)                  */
/* -------------------------------------------------------------------------- */

const getMyClaimedRewards = async (req, res) => {
  try {
    const customerId = getCustomerId(req);

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "Customer authentication is required",
      });
    }

    const claimed = await ClaimedReward.find({ customer: customerId }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      claimedRewards: claimed,
    });
  } catch (error) {
    console.error("Get claimed rewards error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load your claimed rewards",
    });
  }
};

/* -------------------------------------------------------------------------- */
/*                                Claim a reward                              */
/* -------------------------------------------------------------------------- */

const claimReward = async (req, res) => {
  try {
    const customerId = getCustomerId(req);
    const { rewardId } = req.params;

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "Customer authentication is required",
      });
    }

    const reward = await Reward.findOne({ _id: rewardId, isActive: true });

    if (!reward) {
      return res.status(404).json({
        success: false,
        message: "Reward not found",
      });
    }

    const account = await getOrCreateLoyaltyAccount(customerId);

    if (account.points < reward.pointsCost) {
      return res.status(400).json({
        success: false,
        message: "You don't have enough points to claim this reward",
      });
    }

    // Deduct points and create the coupon atomically enough for this
    // use case — a real high-concurrency system would wrap this in a
    // transaction, but a single customer can't realistically double
    // click into a race condition that matters here.
    account.points -= reward.pointsCost;
    await account.save();

    let code = generateCouponCode();

    // Extremely unlikely, but guard against a code collision anyway
    // rather than trust randomness blindly.
    while (await ClaimedReward.findOne({ code })) {
      code = generateCouponCode();
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 60); // 60-day validity

    const claimed = await ClaimedReward.create({
      customer: customerId,
      reward: reward._id,
      title: reward.title,
      discountType: reward.discountType,
      discountValue: reward.discountValue,
      freeServiceName: reward.freeServiceName,
      code,
      pointsSpent: reward.pointsCost,
      expiresAt,
    });

    await createNotification({
      customerId,
      type: "reward_claimed",
      title: "Reward Claimed",
      message: `You claimed "${reward.title}". Your coupon code is ${code}.`,
    });

    return res.status(201).json({
      success: true,
      message: "Reward claimed successfully",
      claimedReward: claimed,
      remainingPoints: account.points,
    });
  } catch (error) {
    console.error("Claim reward error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to claim this reward",
    });
  }
};

/* -------------------------------------------------------------------------- */
/*           Award points — called when staff marks a booking Completed      */
/* -------------------------------------------------------------------------- */

// The real trigger for loyalty points: a staff member marking the
// booking Completed (staffScheduleController.js's updateBookingStatus),
// never the customer. A customer-facing "mark my own booking completed"
// endpoint used to live here as a temporary stand-in from before the
// staff app existed — removed now that the real trigger exists, since
// leaving it in place would let a customer award themselves points for
// a visit that never happened.
const awardPointsForBooking = async (customerId, totalAmount) => {
  const account = await getOrCreateLoyaltyAccount(customerId);

  const previousTier = account.tier;

  const earnedPoints = Math.floor(Number(totalAmount || 0) * POINTS_PER_LKR);

  account.points += earnedPoints;
  account.lifetimePoints += earnedPoints;
  account.completedAppointments += 1;
  account.recalculateTier();

  await account.save();

  await createNotification({
    customerId,
    type: "points_earned",
    title: "Points Earned",
    message: `You earned ${earnedPoints} points for your completed appointment.`,
  });

  return { earnedPoints, account, previousTier, tierChanged: previousTier !== account.tier };
};

module.exports = {
  getLoyaltyDashboard,
  getRewards,
  getMyClaimedRewards,
  claimReward,
  awardPointsForBooking,
};