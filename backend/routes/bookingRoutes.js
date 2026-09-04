const express = require("express");
const router = express.Router();


const {
  createBooking,
  createBookingHold,
  cancelBookingHold,
  getBookingAvailability,
  getMyBookings,
  cancelBooking,
  rescheduleBooking,
  validateCoupon,
} = require("../controllers/bookingController");

const {
  createOrUpdateReview,
} = require("../controllers/reviewController");

const {
  protectCustomer,
} = require("../middleware/authMiddleware");

router.get(
  "/availability",
  protectCustomer,
  getBookingAvailability
);

router.post(
  "/hold",
  protectCustomer,
  createBookingHold
);

// New: lets payment.tsx preview a coupon code's real discount before
// the customer commits to a payment method — see validateCoupon's own
// comment in bookingController.js.
router.post(
  "/validate-coupon",
  protectCustomer,
  validateCoupon
);

router.delete(
  "/hold/:holdId",
  protectCustomer,
  cancelBookingHold
);

router.post(
  "/",
  protectCustomer,
  createBooking
);

// New: fetches the logged-in customer's own bookings, used by the
// Bookings screen (Upcoming/Past tabs).
router.get(
  "/my-bookings",
  protectCustomer,
  getMyBookings
);

// New: cancels an already-confirmed booking (separate from
// cancelBookingHold above, which only releases a temporary hold).
router.patch(
  "/:bookingId/cancel",
  protectCustomer,
  cancelBooking
);

router.patch(
     "/:bookingId/reschedule",
     protectCustomer,
     rescheduleBooking
   );

// New: customer leaves (or edits) a review for a Completed booking —
// upsert, so this same endpoint backs both "Leave Feedback" and
// "View/Edit Your Feedback" in bookings.tsx.
router.post(
  "/:bookingId/review",
  protectCustomer,
  createOrUpdateReview
);

module.exports = router;