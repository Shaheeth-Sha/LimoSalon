const express = require("express");
const router = express.Router();

const {
  createBooking,
  createBookingHold,
  cancelBookingHold,
  getBookingAvailability,
  getMyBookings,
  cancelBooking,
} = require("../controllers/bookingController");

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

module.exports = router;