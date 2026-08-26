const Review = require("../models/Review");
const Booking = require("../models/Booking");
const Staff = require("../models/Staff");
const { createNotification } = require("./notificationController");

const getCustomerId = (req) => {
  return req.customer?._id || req.customer?.id || null;
};

const getStaffId = (req) => {
  return req.staff?._id || req.staff?.id || null;
};

// Keeps Staff.rating (the single aggregate number every existing
// screen — customer staff picker, staff profile, staff login
// response — already reads) in sync whenever a review is written.
// Recomputed fresh from the Review collection rather than
// incrementally adjusted, so it can never drift out of sync.
const recalcStaffRating = async (staffId) => {
  if (!staffId) return;

  const reviews = await Review.find({ staffId: String(staffId) }).select("rating").lean();

  const average =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  await Staff.findByIdAndUpdate(staffId, {
    rating: Math.round(average * 10) / 10,
  });
};

/* -------------------------------------------------------------------------- */
/*            Customer leaves (or edits) a review for a Completed booking     */
/* -------------------------------------------------------------------------- */

const createOrUpdateReview = async (req, res) => {
  try {
    const customerId = getCustomerId(req);
    const { bookingId } = req.params;
    const { rating, comment } = req.body;

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "Customer authentication is required",
      });
    }

    const numericRating = Number(rating);

    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be a whole number from 1 to 5",
      });
    }

    const booking = await Booking.findOne({ _id: bookingId, customer: customerId });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.status !== "Completed") {
      return res.status(400).json({
        success: false,
        message: "You can only review a completed appointment",
      });
    }

    if (!booking.staff?.staffId) {
      return res.status(400).json({
        success: false,
        message: "This booking has no assigned staff member to review",
      });
    }

    // Upsert — lets the customer edit their review from the same
    // "Leave Feedback" entry point instead of needing a separate flow.
    const review = await Review.findOneAndUpdate(
      { booking: booking._id },
      {
        booking: booking._id,
        customer: customerId,
        staffId: booking.staff.staffId,
        rating: numericRating,
        comment: typeof comment === "string" ? comment.trim().slice(0, 500) : "",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await recalcStaffRating(booking.staff.staffId);

    // Only notify on the first submission, not every edit — createdAt
    // and updatedAt are set to the same instant on insert by
    // timestamps:true, and only updatedAt moves on a later edit, so
    // this cheaply tells insert apart from update without a second
    // query.
    const isNewReview = review.createdAt.getTime() === review.updatedAt.getTime();

    if (isNewReview) {
      await createNotification({
        staffId: booking.staff.staffId,
        type: "new_review",
        title: "New Review",
        message: `You received a ${numericRating}-star review${review.comment ? ": \"" + review.comment + "\"" : "."}`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Thanks for your feedback",
      review,
    });
  } catch (error) {
    console.error("Create/update review error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to submit your review",
    });
  }
};

/* -------------------------------------------------------------------------- */
/*                 Staff: average rating + star distribution                  */
/* -------------------------------------------------------------------------- */

const getMyReviewSummary = async (req, res) => {
  try {
    const staffId = getStaffId(req);

    if (!staffId) {
      return res.status(401).json({ success: false, message: "Staff authentication is required" });
    }

    const reviews = await Review.find({ staffId: String(staffId) }).select("rating").lean();

    const count = reviews.length;
    const average = count > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / count : 0;

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      if (distribution[r.rating] !== undefined) distribution[r.rating] += 1;
    });

    return res.status(200).json({
      success: true,
      summary: {
        average: Math.round(average * 10) / 10,
        count,
        distribution,
      },
    });
  } catch (error) {
    console.error("Get review summary error:", error);

    return res.status(500).json({ success: false, message: "Unable to load rating summary" });
  }
};

/* -------------------------------------------------------------------------- */
/*                          Staff: recent reviews list                        */
/* -------------------------------------------------------------------------- */

const getMyRecentReviews = async (req, res) => {
  try {
    const staffId = getStaffId(req);

    if (!staffId) {
      return res.status(401).json({ success: false, message: "Staff authentication is required" });
    }

    const limit = Math.min(Number(req.query.limit) || 20, 50);

    const reviews = await Review.find({ staffId: String(staffId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("customer", "name")
      .populate("booking", "services selectedDate")
      .lean();

    const formatted = reviews.map((r) => ({
      id: r._id,
      customerName: r.customer?.name || "Customer",
      rating: r.rating,
      comment: r.comment || "",
      service: (r.booking?.services || []).map((s) => s.name).filter(Boolean).join(", "),
      date: r.booking?.selectedDate || "",
      createdAt: r.createdAt,
    }));

    return res.status(200).json({
      success: true,
      reviews: formatted,
    });
  } catch (error) {
    console.error("Get recent reviews error:", error);

    return res.status(500).json({ success: false, message: "Unable to load recent reviews" });
  }
};

module.exports = {
  createOrUpdateReview,
  getMyReviewSummary,
  getMyRecentReviews,
};
