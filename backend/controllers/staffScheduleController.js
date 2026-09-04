const Booking = require("../models/Booking");
const Staff = require("../models/Staff");
const Customer = require("../models/Customer");
const Review = require("../models/Review");
const LoyaltyAccount = require("../models/LoyaltyAccount");
const StaffAvailabilityBlock = require("../models/StaffAvailabilityBlock");
const { getBookingDateTime, normalizeBookingTime, refundBookingPayment } = require("./bookingController");
const { createNotification } = require("./notificationController");
const { awardPointsForBooking } = require("./loyaltyController");

const getStaffId = (req) => {
  return req.staff?._id || req.staff?.id || null;
};

/* -------------------------------------------------------------------------- */
/*                    A staff member's own upcoming/past bookings             */
/* -------------------------------------------------------------------------- */

// Booking.staff.staffId is stored as a plain string (see Booking.js) —
// it's always the Staff document's own _id.toString(), set wherever a
// customer picks a stylist off the /api/staff listing. Filtering on
// it here is what makes this genuinely "my schedule" rather than
// every booking in the salon.
const getMyBookings = async (req, res) => {
  try {
    const staffId = getStaffId(req);

    if (!staffId) {
      return res.status(401).json({ success: false, message: "Staff authentication is required" });
    }

    // Optional — set by the Customer Profile screen's "View Appointment
    // History" button (via appointment-history.tsx's customerId param)
    // to narrow this staff member's own bookings down to just one
    // customer. Omitted everywhere else, which keeps the existing
    // "every one of my bookings" behavior unchanged.
    const query = { "staff.staffId": String(staffId) };
    if (req.query.customerId) {
      query.customer = req.query.customerId;
    }

    // Booking only stores a customer ObjectId ref (no name/phone
    // snapshot) — populate the bits the staff-side cards actually
    // display so home.tsx/my-schedule.tsx don't need a second round
    // trip per booking.
    const bookings = await Booking.find(query)
      .populate("customer", "name email phone avatar")
      .sort({ selectedDate: -1, selectedTime: -1 })
      .lean();

    const now = Date.now();

    // Same isPast/effectiveStatus computation bookingController.js's
    // getMyBookings uses for the customer app — kept in sync so a
    // booking that's aged out of its slot reads the same way ("Awaiting
    // Confirmation" for a Confirmed booking whose time has passed) on
    // both sides.
    const withComputedTiming = bookings.map((booking) => {
      let isPast = true;

      try {
        const bookingDateTime = getBookingDateTime(booking.selectedDate, booking.selectedTime);
        isPast = bookingDateTime.getTime() <= now;
      } catch (parseError) {
        console.error(
          "Failed to compute isPast for booking",
          booking._id,
          "date:", booking.selectedDate,
          "time:", booking.selectedTime,
          "error:", parseError.message
        );
        isPast = true;
      }

      // Same fix as bookingController.js's getMyBookings: Completed
      // (and now No-show) must force isPast too, not just Cancelled,
      // since a staff member can mark a booking Completed before its
      // scheduled time actually arrives — otherwise it stays stuck out
      // of the Appointment History screen (which filters on isPast)
      // until the original slot time passes.
      if (booking.status === "Cancelled" || booking.status === "Completed" || booking.status === "No-show") {
        isPast = true;
      }

      // Renamed from "Awaiting Confirmation" — that label now belongs
      // exclusively to the real Pending status below (a brand new
      // booking request that hasn't been confirmed or declined yet).
      // This derived label covers a different moment: a CONFIRMED
      // appointment whose time has already passed but hasn't been
      // marked Completed yet. Reusing the same words for both would
      // have staff and customers reading "Awaiting Confirmation" for
      // two unrelated situations.
      const effectiveStatus =
        booking.status === "Confirmed" && isPast ? "Awaiting Completion" : booking.status;

      return { ...booking, isPast, effectiveStatus };
    });

    return res.status(200).json({ success: true, bookings: withComputedTiming });
  } catch (error) {
    console.error("Get staff bookings error:", error);

    return res.status(500).json({ success: false, message: "Unable to load your schedule" });
  }
};

/* -------------------------------------------------------------------------- */
/*                    Full detail for one of staff's own bookings             */
/* -------------------------------------------------------------------------- */

// Fixed: schedule.tsx (the screen staff use to review a request and
// Confirm/Decline it, or later mark it Completed/No-show) never
// fetched anything of its own — every field it showed came from
// whatever the calling list screen (Today's Jobs, My Schedule,
// Upcoming Appointments, Appointment History, Home) happened to pass
// as route params: customer name, service names, date/time, status.
// That meant staff were confirming or declining brand new booking
// requests with zero visibility into price, payment status, contact
// info, or special notes — a real gap for a production app. This
// endpoint gives that screen its own authoritative source of truth
// instead of depending on every entry point to carry full state.
const getBookingById = async (req, res) => {
  try {
    const staffId = getStaffId(req);
    const { bookingId } = req.params;

    if (!staffId) {
      return res.status(401).json({ success: false, message: "Staff authentication is required" });
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      "staff.staffId": String(staffId),
    })
      .populate("customer", "name email phone avatar")
      .lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found, or it isn't assigned to you",
      });
    }

    return res.status(200).json({ success: true, booking });
  } catch (error) {
    console.error("Get staff booking by id error:", error);

    return res.status(500).json({ success: false, message: "Unable to load this appointment" });
  }
};

/* -------------------------------------------------------------------------- */
/*                 Staff marks a booking Completed / Cancelled                */
/* -------------------------------------------------------------------------- */

// Real-world flow (per product decision): a customer's booking starts
// life as "Pending" (see Booking.js's default). Staff must explicitly
// Confirm or Cancel/decline it — only once it's Confirmed can staff go
// on to mark it Completed or No-show. A Pending booking can be
// declined the same way a Confirmed one can be cancelled, so
// "Cancelled" stays reachable from either state; "Confirmed" is only
// reachable from "Pending"; "Completed" is only reachable from
// "Confirmed", and only once the appointment's actual scheduled time
// has arrived; and "No-show" is only reachable from "Confirmed", and
// only once the customer's ENTIRE scheduled window has elapsed with
// nothing recorded — see the per-status checks below.
const ALLOWED_STAFF_STATUSES = ["Confirmed", "Completed", "Cancelled", "No-show"];

// Fallback appointment length when a booking's own estimatedDuration
// is missing/zero (shouldn't normally happen — every booking sets it
// from its services' durations at creation — but a bad/legacy record
// shouldn't be able to make a no-show unreachable forever). Matches
// the business-hours default interval in timeSlotController.js.
const DEFAULT_APPOINTMENT_DURATION_MINUTES = 60;

const updateBookingStatus = async (req, res) => {
  try {
    const staffId = getStaffId(req);
    const { bookingId } = req.params;
    const { status } = req.body;

    if (!staffId) {
      return res.status(401).json({ success: false, message: "Staff authentication is required" });
    }

    if (!ALLOWED_STAFF_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${ALLOWED_STAFF_STATUSES.join(", ")}`,
      });
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      "staff.staffId": String(staffId),
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found, or it isn't assigned to you",
      });
    }

    const previousStatus = booking.status;

    if (previousStatus === "Cancelled") {
      return res.status(400).json({ success: false, message: "This booking has already been cancelled" });
    }

    if (previousStatus === "Completed") {
      return res.status(400).json({ success: false, message: "This booking is already marked completed" });
    }

    if (previousStatus === "No-show") {
      return res.status(400).json({ success: false, message: "This booking has already been marked as a no-show" });
    }

    if (status === "Confirmed" && previousStatus !== "Pending") {
      return res.status(400).json({ success: false, message: "This booking is already confirmed" });
    }

    // Parsed once, reused by the Completed/Cancelled/No-show checks
    // below — every one of them cares where "now" sits relative to
    // this appointment's scheduled window.
    let bookingDateTime;
    try {
      bookingDateTime = getBookingDateTime(booking.selectedDate, booking.selectedTime);
    } catch (parseError) {
      console.error("Failed to parse booking date/time for status check:", parseError.message);
      bookingDateTime = null;
    }

    const durationMinutes = Number(booking.estimatedDuration) > 0
      ? Number(booking.estimatedDuration)
      : DEFAULT_APPOINTMENT_DURATION_MINUTES;
    const bookingEndDateTime = bookingDateTime
      ? new Date(bookingDateTime.getTime() + durationMinutes * 60 * 1000)
      : null;

    if (status === "Completed") {
      // A booking that hasn't been accepted yet can't be completed —
      // staff has to confirm it first so the customer actually knows
      // the salon is expecting them.
      if (previousStatus !== "Confirmed") {
        return res.status(400).json({
          success: false,
          message: "Confirm this booking before marking it completed.",
        });
      }

      // Fixed (per product decision): a service can't be marked done
      // before it's actually started — not even earlier the same day.
      // A 5pm appointment can't be completed at 4pm. Compares the
      // full scheduled date+time against right now, not just the
      // calendar date, so this also still catches a booking dated for
      // a future day entirely.
      if (bookingDateTime && bookingDateTime.getTime() > Date.now()) {
        return res.status(400).json({
          success: false,
          message: `This appointment hasn't started yet — it's scheduled for ${booking.selectedTime} on ${booking.selectedDate}. You can mark it completed once that time arrives.`,
        });
      }
    }

    if (status === "Cancelled") {
      // Real-world flow (per product decision, following the same
      // reasoning as the Completed check above): cancelling means
      // preventing something from happening — once the appointment's
      // scheduled start time has actually arrived, there's nothing
      // left to prevent. From that point on the only honest outcomes
      // are Completed (it happened) or No-show (the customer never
      // came), not Cancelled.
      if (bookingDateTime && bookingDateTime.getTime() <= Date.now()) {
        return res.status(400).json({
          success: false,
          message: "This appointment's scheduled time has already passed — mark it completed, or as a no-show if the customer never arrived, instead of cancelling it.",
        });
      }
    }

    if (status === "No-show") {
      // Same "must be accepted first" rule as Completed — a request
      // that was never confirmed gets declined (Cancelled), not
      // marked as a no-show.
      if (previousStatus !== "Confirmed") {
        return res.status(400).json({
          success: false,
          message: "Confirm this booking before marking it as a no-show.",
        });
      }

      // The customer gets their FULL scheduled window to arrive —
      // this can't be marked the moment the start time ticks over,
      // only once the appointment would have already finished had
      // they shown up on time.
      if (bookingEndDateTime && bookingEndDateTime.getTime() > Date.now()) {
        return res.status(400).json({
          success: false,
          message: `This appointment's scheduled window hasn't ended yet — it runs until ${bookingEndDateTime.toLocaleTimeString()}. Wait until then, or mark it completed if the customer is here.`,
        });
      }
    }

    booking.status = status;

    // Same refund handling the customer's own cancelBooking uses
    // (bookingController.js) — a staff-side cancel/decline is just as
    // real a cancellation as a customer-initiated one, and this
    // booking may have already been paid for online before staff ever
    // reviewed it (advance/full payment happens at booking creation,
    // before the Pending review step). No-show deliberately skips
    // this — see refundBookingPayment's own comment.
    const refund = status === "Cancelled"
      ? await refundBookingPayment(booking)
      : { refunded: false, amount: 0 };

    await booking.save();

    // The real, trustworthy trigger for loyalty points: staff — not
    // the customer — confirming the service actually happened. This
    // used to only exist as a customer-facing self-report endpoint
    // (markBookingCompleted, now removed from loyaltyController.js)
    // built before this staff app existed; nothing in the app ever
    // called it, so points never accrued through actual use. This is
    // its real home now.
    let loyaltyResult = null;

    if (status === "Completed") {
      loyaltyResult = await awardPointsForBooking(booking.customer, booking.totalAmount);
    }

    // Customer-facing notification — distinct copy per transition,
    // including a softer "declined" message when a still-Pending
    // request gets cancelled rather than an already-accepted booking.
    let notification;

    if (status === "Confirmed") {
      notification = {
        type: "booking_confirmed",
        title: "Booking Confirmed",
        message: `Great news! Your appointment on ${booking.selectedDate} at ${booking.selectedTime} has been confirmed by the salon.`,
      };
    } else if (status === "Completed") {
      notification = {
        type: "booking_confirmed",
        title: "Appointment Completed",
        message: loyaltyResult
          ? `Your appointment on ${booking.selectedDate} has been marked completed. You earned ${loyaltyResult.earnedPoints} points. Thank you for visiting LimoSalon!`
          : `Your appointment on ${booking.selectedDate} has been marked completed. Thank you for visiting LimoSalon!`,
      };
    } else if (status === "No-show") {
      notification = {
        type: "booking_no_show",
        title: "Missed Appointment",
        message: `You were marked as a no-show for your appointment on ${booking.selectedDate} at ${booking.selectedTime}. Please contact the salon if you think this is a mistake.`,
      };
    } else if (previousStatus === "Pending") {
      notification = {
        type: "booking_cancelled",
        title: "Booking Request Declined",
        message: refund.refunded
          ? `Sorry, your booking request for ${booking.selectedDate} at ${booking.selectedTime} couldn't be confirmed by the salon. LKR ${refund.amount.toLocaleString()} has been refunded to your original payment method.`
          : `Sorry, your booking request for ${booking.selectedDate} at ${booking.selectedTime} couldn't be confirmed by the salon.`,
      };
    } else {
      notification = {
        type: "booking_cancelled",
        title: "Booking Cancelled",
        message: refund.refunded
          ? `Your appointment on ${booking.selectedDate} at ${booking.selectedTime} was cancelled by the salon. LKR ${refund.amount.toLocaleString()} has been refunded to your original payment method.`
          : `Your appointment on ${booking.selectedDate} at ${booking.selectedTime} was cancelled by the salon.`,
      };
    }

    await createNotification({
      customerId: booking.customer,
      relatedBooking: booking._id,
      ...notification,
    });

    if (loyaltyResult?.tierChanged) {
      await createNotification({
        customerId: booking.customer,
        type: "tier_upgraded",
        title: "Tier Upgraded!",
        message: `Congratulations, you've reached ${loyaltyResult.account.tier} tier!`,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Booking marked ${status}`,
      booking,
      refund,
      loyalty: loyaltyResult
        ? { earnedPoints: loyaltyResult.earnedPoints, points: loyaltyResult.account.points, tier: loyaltyResult.account.tier }
        : null,
    });
  } catch (error) {
    console.error("Update booking status error:", error);

    return res.status(500).json({ success: false, message: "Unable to update this booking" });
  }
};

/* -------------------------------------------------------------------------- */
/*                       Staff toggles their own availability                 */
/* -------------------------------------------------------------------------- */

// Deliberately minimal for now — a single on/off switch on the Staff
// record itself (already existed as `available`, previously only ever
// set by hand in the database). Per-date/per-slot blocking is a
// bigger feature (its own data model) left for when that's the
// specific thing being worked on, per update-availability.tsx.
const updateMyAvailability = async (req, res) => {
  try {
    const staffId = getStaffId(req);
    const { available } = req.body;

    if (!staffId) {
      return res.status(401).json({ success: false, message: "Staff authentication is required" });
    }

    if (typeof available !== "boolean") {
      return res.status(400).json({ success: false, message: "available must be true or false" });
    }

    const staff = await Staff.findByIdAndUpdate(
      staffId,
      { available },
      { new: true }
    ).select("-password");

    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff account not found" });
    }

    return res.status(200).json({
      success: true,
      message: `You're now marked as ${available ? "available" : "unavailable"}`,
      available: staff.available,
    });
  } catch (error) {
    console.error("Update staff availability error:", error);

    return res.status(500).json({ success: false, message: "Unable to update availability" });
  }
};

/* -------------------------------------------------------------------------- */
/*        Per-date/per-slot availability blocks (the granular feature)        */
/* -------------------------------------------------------------------------- */

const DATE_STRING_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// A staff member is "booked" (not just "blocked") at a slot when they
// already have a real Pending or Confirmed appointment there — those
// slots are shown as booked/disabled in the UI rather than toggleable,
// since blocking or unblocking them wouldn't change anything real.
const getBookedTimesForDate = async (staffId, date) => {
  const bookings = await Booking.find({
    "staff.staffId": String(staffId),
    selectedDate: date,
    status: { $in: ["Pending", "Confirmed"] },
  })
    .select("selectedTime")
    .lean();

  return bookings.map((b) => b.selectedTime);
};

// GET /api/staff/availability/:date — everything update-availability.tsx
// needs to render one day's timeslot grid: the staff member's own
// blocked slots (toggleable) and already-booked slots (shown, but not
// toggleable) for that date.
const getAvailabilityForDate = async (req, res) => {
  try {
    const staffId = getStaffId(req);
    const { date } = req.params;

    if (!staffId) {
      return res.status(401).json({ success: false, message: "Staff authentication is required" });
    }

    if (!DATE_STRING_PATTERN.test(date || "")) {
      return res.status(400).json({ success: false, message: "date must be in YYYY-MM-DD format" });
    }

    const [staff, block, bookedTimes] = await Promise.all([
      Staff.findById(staffId).select("available").lean(),
      StaffAvailabilityBlock.findOne({ staffId: String(staffId), date }).lean(),
      getBookedTimesForDate(staffId, date),
    ]);

    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff account not found" });
    }

    return res.status(200).json({
      success: true,
      date,
      available: staff.available !== false,
      blockedTimes: block?.blockedTimes || [],
      bookedTimes,
    });
  } catch (error) {
    console.error("Get staff availability for date error:", error);

    return res.status(500).json({ success: false, message: "Unable to load availability for that date" });
  }
};

// PUT /api/staff/availability/:date — replaces the full set of blocked
// slots for this staff+date with whatever the app sends (the UI always
// submits the complete current selection, not a diff). Booked slots
// aren't rejected if accidentally included — a staff member blocking a
// slot they're already booked for is harmless, it just has no
// additional effect since getBookingAvailability already treats a
// booked slot as unavailable regardless.
const updateAvailabilityForDate = async (req, res) => {
  try {
    const staffId = getStaffId(req);
    const { date } = req.params;
    const { blockedTimes } = req.body;

    if (!staffId) {
      return res.status(401).json({ success: false, message: "Staff authentication is required" });
    }

    if (!DATE_STRING_PATTERN.test(date || "")) {
      return res.status(400).json({ success: false, message: "date must be in YYYY-MM-DD format" });
    }

    if (!Array.isArray(blockedTimes)) {
      return res.status(400).json({ success: false, message: "blockedTimes must be an array" });
    }

    let normalizedTimes;

    try {
      // Accepts either "08.00 am" (the /api/time-slots display format)
      // or "08:00 am" — normalizeBookingTime handles both — and
      // dedupes, so the stored set always matches Booking.selectedTime's
      // own format exactly.
      normalizedTimes = [...new Set(blockedTimes.map((t) => normalizeBookingTime(t)))];
    } catch (parseError) {
      return res.status(400).json({ success: false, message: parseError.message || "Invalid time in blockedTimes" });
    }

    const block = await StaffAvailabilityBlock.findOneAndUpdate(
      { staffId: String(staffId), date },
      { staffId: String(staffId), date, blockedTimes: normalizedTimes },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: normalizedTimes.length
        ? "Your blocked slots for this date have been saved"
        : "All slots on this date are now open",
      date,
      blockedTimes: block.blockedTimes,
    });
  } catch (error) {
    console.error("Update staff availability for date error:", error);

    return res.status(500).json({ success: false, message: "Unable to update availability for that date" });
  }
};

/* -------------------------------------------------------------------------- */
/*                    Shared date helpers for the stats endpoints             */
/* -------------------------------------------------------------------------- */

// Same convention bookingController.js uses (APP_TIMEZONE_OFFSET_MINUTES,
// defaulting to +330 = Sri Lanka) — kept in sync so "today"/"this week"
// here means the same thing the booking flow's own date math means.
const APP_TIMEZONE_OFFSET_MINUTES = Number(
  process.env.APP_TIMEZONE_OFFSET_MINUTES || 330
);

const getLocalNow = () => {
  const utcNow = Date.now();
  return new Date(utcNow + APP_TIMEZONE_OFFSET_MINUTES * 60 * 1000);
};

const toDateString = (date) => {
  return (
    `${date.getUTCFullYear()}-` +
    `${String(date.getUTCMonth() + 1).padStart(2, "0")}-` +
    `${String(date.getUTCDate()).padStart(2, "0")}`
  );
};

// Monday-Sunday week containing `localNow`, as ["YYYY-MM-DD", "YYYY-MM-DD"].
// selectedDate is stored as a plain "YYYY-MM-DD" string, so a lexical
// >= / <= range comparison against these is exact — no timezone math
// needed at query time.
const getWeekRange = (localNow, weeksOffset = 0) => {
  const day = localNow.getUTCDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(localNow);
  monday.setUTCDate(monday.getUTCDate() + diffToMonday + weeksOffset * 7);

  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);

  return { start: toDateString(monday), end: toDateString(sunday), mondayDate: monday };
};

/* -------------------------------------------------------------------------- */
/*                       Weekly summary (jobs / revenue)                      */
/* -------------------------------------------------------------------------- */

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const getWeeklySummary = async (req, res) => {
  try {
    const staffId = getStaffId(req);

    if (!staffId) {
      return res.status(401).json({ success: false, message: "Staff authentication is required" });
    }

    // offset=0 is the current week, -1 is last week, etc. — lets the
    // Weekly Summary screen page backward without a new endpoint.
    const weeksOffset = Number(req.query.offset) || 0;
    const { start, end, mondayDate } = getWeekRange(getLocalNow(), weeksOffset);

    const bookings = await Booking.find({
      "staff.staffId": String(staffId),
      selectedDate: { $gte: start, $lte: end },
    })
      .select("selectedDate status totalAmount customer")
      .lean();

    const completed = bookings.filter((b) => b.status === "Completed");
    const cancelled = bookings.filter((b) => b.status === "Cancelled");
    const revenue = completed.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

    // "New customer" = someone whose FIRST EVER booking with this staff
    // member falls inside this week — i.e. they had no booking with
    // this staff before this week started. Real, queryable data (not
    // a made-up figure like a "products sold" count would be, since
    // this app has no retail/product-sales feature at all).
    const weekCustomerIds = [...new Set(bookings.map((b) => String(b.customer)).filter(Boolean))];

    const customersWithEarlierBookings = weekCustomerIds.length
      ? await Booking.distinct("customer", {
          "staff.staffId": String(staffId),
          customer: { $in: weekCustomerIds },
          selectedDate: { $lt: start },
        })
      : [];

    const earlierCustomerSet = new Set(customersWithEarlierBookings.map(String));
    const newCustomers = weekCustomerIds.filter((id) => !earlierCustomerSet.has(id)).length;

    // Rating is a lifetime figure (same one Home's stat tiles show),
    // not week-scoped — shown here the way a real weekly digest would,
    // as "here's where your rating stands as of this report."
    const staff = await Staff.findById(staffId).select("rating").lean();

    const byDay = DAY_LABELS.map((label, index) => {
      const dayDate = new Date(mondayDate);
      dayDate.setUTCDate(dayDate.getUTCDate() + index);
      const dateStr = toDateString(dayDate);

      const dayBookings = bookings.filter((b) => b.selectedDate === dateStr);
      const dayCompleted = dayBookings.filter((b) => b.status === "Completed");

      return {
        label,
        date: dateStr,
        jobs: dayBookings.length,
        revenue: dayCompleted.reduce((sum, b) => sum + (b.totalAmount || 0), 0),
      };
    });

    return res.status(200).json({
      success: true,
      summary: {
        weekStart: start,
        weekEnd: end,
        totalJobs: bookings.length,
        completedJobs: completed.length,
        cancelledJobs: cancelled.length,
        revenue,
        newCustomers,
        averageRating: staff?.rating || 0,
        byDay,
      },
    });
  } catch (error) {
    console.error("Get weekly summary error:", error);

    return res.status(500).json({ success: false, message: "Unable to load weekly summary" });
  }
};

/* -------------------------------------------------------------------------- */
/*                                Top customer                                */
/* -------------------------------------------------------------------------- */

// "Top" = most completed visits with this staff member (ties broken by
// total spend) — visit frequency is also what LoyaltyAccount itself
// uses for tier, so this reads consistently with the loyalty program
// rather than introducing a second, different notion of "top".
const getTopCustomer = async (req, res) => {
  try {
    const staffId = getStaffId(req);

    if (!staffId) {
      return res.status(401).json({ success: false, message: "Staff authentication is required" });
    }

    const completedBookings = await Booking.find({
      "staff.staffId": String(staffId),
      status: "Completed",
    })
      .select("customer totalAmount selectedDate")
      .lean();

    if (completedBookings.length === 0) {
      return res.status(200).json({ success: true, topCustomer: null });
    }

    const byCustomer = new Map();

    completedBookings.forEach((b) => {
      const key = String(b.customer);
      const existing = byCustomer.get(key) || { visits: 0, totalSpent: 0, lastVisit: null };

      existing.visits += 1;
      existing.totalSpent += b.totalAmount || 0;
      if (!existing.lastVisit || b.selectedDate > existing.lastVisit) {
        existing.lastVisit = b.selectedDate;
      }

      byCustomer.set(key, existing);
    });

    let topCustomerId = null;
    let topStats = null;

    for (const [customerId, stats] of byCustomer.entries()) {
      if (
        !topStats ||
        stats.visits > topStats.visits ||
        (stats.visits === topStats.visits && stats.totalSpent > topStats.totalSpent)
      ) {
        topCustomerId = customerId;
        topStats = stats;
      }
    }

    const [customer, loyaltyAccount] = await Promise.all([
      Customer.findById(topCustomerId).select("name email phone avatar createdAt").lean(),
      LoyaltyAccount.findOne({ customer: topCustomerId }).select("tier points memberSince").lean(),
    ]);

    if (!customer) {
      return res.status(200).json({ success: true, topCustomer: null });
    }

    return res.status(200).json({
      success: true,
      topCustomer: {
        customerId: String(customer._id),
        name: customer.name,
        email: customer.email,
        phone: customer.phone || "",
        avatar: customer.avatar || "",
        visits: topStats.visits,
        totalSpent: topStats.totalSpent,
        lastVisit: topStats.lastVisit,
        tier: loyaltyAccount?.tier || "Bronze",
        loyaltyPoints: loyaltyAccount?.points || 0,
        memberSince: loyaltyAccount?.memberSince || customer.createdAt || null,
      },
    });
  } catch (error) {
    console.error("Get top customer error:", error);

    return res.status(500).json({ success: false, message: "Unable to load top customer" });
  }
};

/* -------------------------------------------------------------------------- */
/*                      Home screen stat tiles (bundled)                      */
/* -------------------------------------------------------------------------- */

const getHomeStats = async (req, res) => {
  try {
    const staffId = getStaffId(req);

    if (!staffId) {
      return res.status(401).json({ success: false, message: "Staff authentication is required" });
    }

    const localNow = getLocalNow();
    const todayStr = toDateString(localNow);
    const { start: weekStart, end: weekEnd } = getWeekRange(localNow, 0);

    const [staff, weekBookings, todaysJobsCount, reviewStats] = await Promise.all([
      Staff.findById(staffId).select("rating").lean(),
      Booking.find({
        "staff.staffId": String(staffId),
        selectedDate: { $gte: weekStart, $lte: weekEnd },
      })
        .select("status totalAmount selectedDate")
        .lean(),
      Booking.countDocuments({
        "staff.staffId": String(staffId),
        selectedDate: todayStr,
        status: { $ne: "Cancelled" },
      }),
      Review.find({ staffId: String(staffId) }).select("rating").lean(),
    ]);

    const weekCompleted = weekBookings.filter((b) => b.status === "Completed");
    const weekRevenue = weekCompleted.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

    return res.status(200).json({
      success: true,
      stats: {
        todaysJobs: todaysJobsCount,
        weekJobs: weekBookings.length,
        weekRevenue,
        rating: staff?.rating || 0,
        reviewCount: reviewStats.length,
      },
    });
  } catch (error) {
    console.error("Get staff home stats error:", error);

    return res.status(500).json({ success: false, message: "Unable to load dashboard stats" });
  }
};

module.exports = {
  getMyBookings,
  getBookingById,
  updateBookingStatus,
  updateMyAvailability,
  getAvailabilityForDate,
  updateAvailabilityForDate,
  getWeeklySummary,
  getTopCustomer,
  getHomeStats,
};
