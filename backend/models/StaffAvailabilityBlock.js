const mongoose = require("mongoose");

// Per-date, per-timeslot "I'm blocking myself off" records for a staff
// member — the real-world granular counterpart to Staff.available
// (which is an all-or-nothing switch). A staff member can be globally
// available but still block off specific slots on specific dates (e.g.
// a dentist appointment at 2pm on the 14th), and this is what the
// customer-facing booking-availability check (bookingController.js's
// getBookingAvailability) now also consults so a blocked slot is
// genuinely un-bookable, not just cosmetic on the staff app.
const staffAvailabilityBlockSchema = new mongoose.Schema(
  {
    staffId: {
      type: String,
      required: true,
      index: true,
    },
    // "YYYY-MM-DD" — same plain lexical-string convention Booking.js
    // already uses for selectedDate, so date-range/equality queries
    // stay simple string comparisons across the whole codebase.
    date: {
      type: String,
      required: true,
    },
    // Normalized "hh:mm am/pm" strings (via the same normalizeBookingTime
    // convention bookingController.js uses for Booking.selectedTime) —
    // e.g. "02:00 pm". Only the slots this staff member has chosen to
    // block are stored here; everything else is implicitly open.
    blockedTimes: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

// One document per staff+date — updateAvailabilityForDate always
// upserts against this exact pair rather than ever creating duplicates.
staffAvailabilityBlockSchema.index({ staffId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model(
  "StaffAvailabilityBlock",
  staffAvailabilityBlockSchema
);
