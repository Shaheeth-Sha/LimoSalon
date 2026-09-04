const crypto = require("crypto");

const Booking = require("../models/Booking");
const BookingHold = require("../models/BookingHold");
const Customer = require("../models/Customer");
const Staff = require("../models/Staff");
const StaffAvailabilityBlock = require("../models/StaffAvailabilityBlock");
const ClaimedReward = require("../models/ClaimedReward");
const { resolveAppliedCoupon, calculateCouponDiscount } = require("../utils/couponResolver");
const Review = require("../models/Review");
const sendEmail = require("../utils/sendEmail");
const stripe = require("../utils/stripeClient");
const { createNotification } = require("./notificationController");

const HOLD_DURATION_MINUTES = 10;
const SLOT_INTERVAL_MINUTES = 15;

// Bridal-only: the trial makeup session is a second appointment with
// the same staff member, distinct from the main event slot. It goes
// through the exact same hold + conflict-check machinery as every
// other slot (createBookingHold / findConfirmedBookingConflict) so a
// staff member can never be double-booked for a trial the same way
// they can't for a haircut — this is just a fixed assumed duration
// for that second appointment, since the customer never picks one.
const TRIAL_MAKEUP_DURATION_MINUTES = 60;

const APP_TIMEZONE_OFFSET_MINUTES = Number(
  process.env.APP_TIMEZONE_OFFSET_MINUTES || 330
);

const NON_BRIDAL_ADVANCE_MINIMUM = 10000;
const BRIDAL_ADVANCE_RATE = 0.2;
const OTHER_ADVANCE_RATE = 0.1;

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

const roundMoney = (value) => {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
};

// Real-world refund handling for a booking that's just been cancelled
// (customer cancelling it themselves, or staff cancelling/declining
// it — both routes call this, see cancelBooking here and
// updateBookingStatus in staffScheduleController.js). Only a booking
// that actually had money move through Stripe — "Paid" or "Partially
// Paid" via advance/full online payment, with a real
// stripePaymentIntentId on file — has anything to refund. A "Pay at
// Salon" booking never charged anything up front, so there's nothing
// to send back.
//
// Deliberately NOT called for a No-show: that's the customer's own
// no-show, not a cancellation, and the salon held the slot for them —
// the deposit is forfeited, matching standard real-world salon policy.
//
// Mutates the passed-in (unsaved) booking document in place so the
// caller's single booking.save() picks up the refund fields alongside
// the status change — it does not save on its own.
const refundBookingPayment = async (booking) => {
  const isRefundable =
    (booking.paymentStatus === "Paid" || booking.paymentStatus === "Partially Paid") &&
    Boolean(booking.stripePaymentIntentId);

  if (!isRefundable) {
    return { refunded: false, amount: 0 };
  }

  try {
    const refundAmount = booking.amountPaid;

    const refund = await stripe.refunds.create({
      payment_intent: booking.stripePaymentIntentId,
    });

    booking.paymentStatus = "Refunded";
    booking.refundedAt = new Date();
    booking.stripeRefundId = refund.id;

    return { refunded: true, amount: refundAmount };
  } catch (error) {
    // Don't let a Stripe-side failure block the cancellation itself —
    // the booking still needs to be cancelled either way. paymentStatus
    // is deliberately left untouched on failure so the booking record
    // still honestly shows money is owed back, and staff can chase the
    // refund manually from the Stripe dashboard.
    console.error("Stripe refund failed for booking", booking._id, error.message);
    return { refunded: false, amount: 0, error: error.message };
  }
};

const formatMoneyForEmail = (amount) =>
  `LKR ${Number(amount || 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDateForEmail = (dateStr) => {
  try {
    const [year, month, day] = String(dateStr).split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

const buildBookingEmailHtml = ({ customerName, booking, isReschedule, previousDate, previousTime }) => {
  const serviceRows = (booking.services || [])
    .map(
      (service) =>
        `<tr><td style="padding:4px 0;">${service.name}</td><td style="padding:4px 0;text-align:right;">${formatMoneyForEmail(service.price)}</td></tr>`
    )
    .join("");

  const rescheduleNote = isReschedule
    ? `<p style="color:#8A1230;background:#FFF3F6;padding:10px 14px;border-radius:8px;">
         Your appointment was moved from <strong>${formatDateForEmail(previousDate)} at ${previousTime}</strong> to the new time below.
       </p>`
    : "";

  // Fixed: bookings start as Pending now, not auto-Confirmed — this
  // email used to say "Booking Confirmed" the instant a request was
  // submitted, before staff had reviewed it at all.
  const pendingNote = !isReschedule
    ? `<p style="color:#1D5FAB;background:#EAF2FF;padding:10px 14px;border-radius:8px;">
         This is a request, not a confirmed booking yet — the salon will confirm it shortly and you'll get another email once they do.
       </p>`
    : "";

  return `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#111;">
      <h2 style="color:#FF2D75;">${isReschedule ? "Your Appointment Has Been Rescheduled" : "Booking Requested"}</h2>
      <p>Hi ${customerName || "there"},</p>
      <p>${isReschedule
        ? "Here are your updated appointment details:"
        : "Thank you for booking with LimoSalon. Here are your requested appointment details:"}</p>
      ${rescheduleNote}
      ${pendingNote}
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        ${serviceRows}
      </table>
      <p><strong>Staff:</strong> ${booking.staff?.name || "-"}</p>
      <p><strong>Date:</strong> ${formatDateForEmail(booking.selectedDate)}</p>
      <p><strong>Time:</strong> ${booking.selectedTime}</p>
      <p><strong>Total:</strong> ${formatMoneyForEmail(booking.totalAmount)}</p>
      <p><strong>Amount Paid:</strong> ${formatMoneyForEmail(booking.amountPaid)}</p>
      <p><strong>Balance Due:</strong> ${formatMoneyForEmail(booking.balancePayment)}</p>
      <p><strong>Payment Status:</strong> ${booking.paymentStatus}</p>
      <p style="color:#777;font-size:13px;">Booking ID: #${String(booking._id).slice(-6).toUpperCase()}</p>
      <p style="margin-top:24px;color:#777;font-size:13px;">See you soon at LimoSalon!</p>
    </div>
  `;
};

const sendBookingEmail = async ({ customerId, booking, isReschedule, previousDate, previousTime }) => {
  try {
    const customer = await Customer.findById(customerId).select("email name").lean();

    if (!customer?.email) {
      return;
    }

    await sendEmail({
      to: customer.email,
      subject: isReschedule
        ? "Your LimoSalon Appointment Has Been Rescheduled"
        : "Your LimoSalon Booking is Confirmed",
      html: buildBookingEmailHtml({
        customerName: customer.name,
        booking,
        isReschedule,
        previousDate,
        previousTime,
      }),
    });
  } catch (emailError) {
    console.error("Booking email failed to send:", emailError);
  }
};

const escapeRegex = (value) => {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const getCustomerId = (req) => {
  return req.customer?._id || req.customer?.id || null;
};

const detectServiceCategory = (services, bookingType) => {
  const normalizedBookingType = String(bookingType || "")
    .trim()
    .toLowerCase();

  if (["bridal", "hair", "face", "body", "nail"].includes(normalizedBookingType)) {
    return normalizedBookingType;
  }

  let serviceText = "";

  try {
    serviceText = JSON.stringify(services).toLowerCase();
  } catch {
    serviceText = String(services).toLowerCase();
  }

  if (serviceText.includes("bridal")) return "bridal";
  if (serviceText.includes("face") || serviceText.includes("facial")) return "face";
  if (serviceText.includes("body")) return "body";
  if (serviceText.includes("nail")) return "nail";
  if (serviceText.includes("hair")) return "hair";

  return "hair";
};

const normalizeBookingDate = (value) => {
  const rawValue = String(value || "").trim();

  if (!rawValue) {
    throw new Error("Booking date is required");
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    const [year, month, day] = rawValue.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      throw new Error("Invalid booking date");
    }

    return rawValue;
  }

  const parsedDate = new Date(rawValue);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error("Invalid booking date");
  }

  return `${parsedDate.getFullYear()}-${String(
    parsedDate.getMonth() + 1
  ).padStart(2, "0")}-${String(parsedDate.getDate()).padStart(2, "0")}`;
};

const normalizeBookingTime = (value) => {
  const rawValue = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\./g, ":")
    .replace(/\s+/g, " ");

  if (!rawValue) {
    throw new Error("Booking time is required");
  }

  const twelveHourMatch = rawValue.match(
    /^(\d{1,2}):(\d{2})\s*(am|pm)$/
  );

  if (twelveHourMatch) {
    const hours = Number(twelveHourMatch[1]);
    const minutes = Number(twelveHourMatch[2]);
    const period = twelveHourMatch[3];

    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
      throw new Error("Invalid booking time");
    }

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period}`;
  }

  const twentyFourHourMatch = rawValue.match(/^(\d{1,2}):(\d{2})$/);

  if (twentyFourHourMatch) {
    const hours = Number(twentyFourHourMatch[1]);
    const minutes = Number(twentyFourHourMatch[2]);

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      throw new Error("Invalid booking time");
    }

    const period = hours >= 12 ? "pm" : "am";
    const twelveHour = hours % 12 || 12;

    return `${String(twelveHour).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period}`;
  }

  throw new Error("Invalid booking time. Use a format such as 09:00 am.");
};

const timeToMinutes = (value) => {
  const normalizedTime = normalizeBookingTime(value);

  const match = normalizedTime.match(/^(\d{2}):(\d{2})\s(am|pm)$/);

  if (!match) {
    throw new Error("Invalid booking time");
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3];

  if (period === "am" && hours === 12) {
    hours = 0;
  }

  if (period === "pm" && hours !== 12) {
    hours += 12;
  }

  return hours * 60 + minutes;
};

const getBookingDateTime = (selectedDate, selectedTime) => {
  const normalizedDate = normalizeBookingDate(selectedDate);
  const startMinutes = timeToMinutes(selectedTime);

  const [year, month, day] = normalizedDate.split("-").map(Number);
  const hours = Math.floor(startMinutes / 60);
  const minutes = startMinutes % 60;

  const utcMilliseconds =
    Date.UTC(year, month - 1, day, hours, minutes, 0, 0) -
    APP_TIMEZONE_OFFSET_MINUTES * 60 * 1000;

  return new Date(utcMilliseconds);
};

const ensureFutureSlot = (selectedDate, selectedTime) => {
  const bookingDateTime = getBookingDateTime(selectedDate, selectedTime);

  if (bookingDateTime.getTime() <= Date.now()) {
    throw new Error("The selected booking date and time has already passed");
  }
};

const shiftDateString = (dateStr, days) => {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate()
  ).padStart(2, "0")}`;
};

const bookingsOverlap = ({
  requestedDate,
  requestedStart,
  requestedDuration,
  existingDate,
  existingStart,
  existingDuration,
}) => {
  const requestedStartTime = getBookingDateTime(requestedDate, requestedStart).getTime();
  const existingStartTime = getBookingDateTime(existingDate, existingStart).getTime();

  const safeRequestedDuration = Math.max(Number(requestedDuration) || 0, 1) * 60 * 1000;
  const safeExistingDuration = Math.max(Number(existingDuration) || 0, 1) * 60 * 1000;

  const requestedEndTime = requestedStartTime + safeRequestedDuration;
  const existingEndTime = existingStartTime + safeExistingDuration;

  return requestedStartTime < existingEndTime && existingStartTime < requestedEndTime;
};

const generateSlotKeys = ({ staffId, selectedDate, selectedTime, estimatedDuration }) => {
  const startMinutes = timeToMinutes(selectedTime);
  const duration = Math.max(Number(estimatedDuration) || 0, 1);

  const endMinutes =
    startMinutes + Math.ceil(duration / SLOT_INTERVAL_MINUTES) * SLOT_INTERVAL_MINUTES;

  const slotKeys = [];

  for (let minute = startMinutes; minute < endMinutes; minute += SLOT_INTERVAL_MINUTES) {
    slotKeys.push(`${staffId}|${selectedDate}|${minute}`);
  }

  return slotKeys;
};

const calculateEstimatedDuration = (services) => {
  if (!Array.isArray(services) || services.length === 0) {
    throw new Error("At least one service is required");
  }

  const estimatedDuration = services.reduce((total, service) => {
    const duration = Number(service?.duration);
    return total + (Number.isFinite(duration) ? duration : 0);
  }, 0);

  if (!Number.isFinite(estimatedDuration) || estimatedDuration <= 0) {
    throw new Error("A valid service duration is required");
  }

  return estimatedDuration;
};

const findConfirmedBookingConflict = async ({
  staffId,
  selectedDate,
  selectedTime,
  estimatedDuration,
  excludeBookingId,
}) => {
  const nearbyDates = [
    shiftDateString(selectedDate, -1),
    selectedDate,
    shiftDateString(selectedDate, 1),
  ];

  // A staff member can be busy either with another customer's main
  // appointment OR with another bride's trial makeup session — the
  // requested slot (whichever kind it is) has to be checked against
  // both, since both occupy that staff member's time equally.
  const query = {
    "staff.staffId": staffId,
    // Completed and No-show excluded too, not just Cancelled — a staff
    // member can now mark a booking Completed ahead of its actual
    // scheduled time, or No-show once the customer's window has fully
    // elapsed (see staffScheduleController.js's updateBookingStatus),
    // and neither has any further claim on that slot, so they must not
    // permanently block new bookings there.
    status: { $nin: ["Cancelled", "Completed", "No-show"] },
    $or: [
      { selectedDate: { $in: nearbyDates } },
      { wantsTrialMakeup: true, trialMakeupDate: { $in: nearbyDates } },
    ],
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  const existingBookings = await Booking.find(query)
    .select(
      "selectedDate selectedTime estimatedDuration status wantsTrialMakeup trialMakeupDate trialMakeupTime"
    )
    .lean();

  return (
    existingBookings.find((booking) => {
      const mainSlotOverlap = bookingsOverlap({
        requestedDate: selectedDate,
        requestedStart: selectedTime,
        requestedDuration: estimatedDuration,
        existingDate: booking.selectedDate,
        existingStart: booking.selectedTime,
        existingDuration: booking.estimatedDuration,
      });

      if (mainSlotOverlap) return true;

      if (
        booking.wantsTrialMakeup &&
        booking.trialMakeupDate &&
        booking.trialMakeupTime
      ) {
        return bookingsOverlap({
          requestedDate: selectedDate,
          requestedStart: selectedTime,
          requestedDuration: estimatedDuration,
          existingDate: booking.trialMakeupDate,
          existingStart: booking.trialMakeupTime,
          existingDuration: TRIAL_MAKEUP_DURATION_MINUTES,
        });
      }

      return false;
    }) || null
  );
};

const findActiveHoldConflict = async ({
  customerId,
  staffId,
  selectedDate,
  selectedTime,
  estimatedDuration,
  excludeHoldId,
}) => {
  const query = {
    staffId,
    selectedDate: {
      $in: [
        shiftDateString(selectedDate, -1),
        selectedDate,
        shiftDateString(selectedDate, 1),
      ],
    },
    expiresAt: { $gt: new Date() },
  };

  if (excludeHoldId) {
    query._id = { $ne: excludeHoldId };
  }

  const holds = await BookingHold.find(query)
    .select("customer selectedDate selectedTime estimatedDuration expiresAt staffId")
    .lean();

  return (
    holds.find((hold) => {
      if (customerId && String(hold.customer) === String(customerId)) {
        return false;
      }

      return bookingsOverlap({
        requestedDate: selectedDate,
        requestedStart: selectedTime,
        requestedDuration: estimatedDuration,
        existingDate: hold.selectedDate,
        existingStart: hold.selectedTime,
        existingDuration: hold.estimatedDuration,
      });
    }) || null
  );
};

const calculatePaymentDetails = ({
  totalAmount,
  services,
  bookingType,
  requestedPaymentOption,
  requestedPaymentMethod,
  paymentConfirmed,
  appliedCoupon,
}) => {
  // originalTotal is the real, undiscounted service value — used for
  // policy decisions (the mandatory-advance threshold) so a coupon
  // can never be used to dodge that requirement. The discounted
  // amount (below) is what's actually charged.
  const originalTotal = Number(totalAmount);

  if (!Number.isFinite(originalTotal) || originalTotal <= 0) {
    throw new Error("A valid total amount is required");
  }

  let discountAmount = 0;

  if (appliedCoupon) {
    if (appliedCoupon.discountType === "freeService") {
      // freeService coupons don't reduce a total automatically —
      // there's no way to know which selected service should be
      // "free" without additional UI for the customer to specify
      // that. For now this type must be honored in person at the
      // salon rather than applied online; flag it clearly rather
      // than silently doing nothing while still burning the coupon.
      throw new Error(
        "This reward type must be redeemed in person at the salon and can't be applied online yet"
      );
    }

    // Shared with paymentController.js's createPaymentIntent — both
    // must compute the exact same discount for the same code, or the
    // Stripe charge and this booking's own amountPaid would disagree.
    discountAmount = calculateCouponDiscount(originalTotal, appliedCoupon);
  }

  const total = roundMoney(originalTotal - discountAmount);

  const serviceCategory = detectServiceCategory(services, bookingType);
  const isBridal = serviceCategory === "bridal";

  const normalizedBookingType = serviceCategory;

  const paymentOption = String(requestedPaymentOption || "").trim().toLowerCase();

  if (!["advance", "full", "salon"].includes(paymentOption)) {
    throw new Error("Invalid payment option");
  }

  const allowedPaymentMethods = ["Credit/Debit Card", "Stripe", "Pay at Salon"];

  if (requestedPaymentMethod && !allowedPaymentMethods.includes(requestedPaymentMethod)) {
    throw new Error("Invalid payment method");
  }

  const advanceAvailable = isBridal || (!isBridal && originalTotal >= NON_BRIDAL_ADVANCE_MINIMUM);

  const payAtSalonAllowed = !isBridal && originalTotal < NON_BRIDAL_ADVANCE_MINIMUM;

  if (paymentOption === "salon" && !payAtSalonAllowed) {
    if (isBridal) {
      throw new Error("Bridal bookings require a 20% advance or full online payment");
    }

    throw new Error("Bookings of LKR 10,000 or more require a 10% advance or full online payment");
  }

  if (paymentOption === "advance" && !advanceAvailable) {
    throw new Error(
      "The advance option is available only for bridal bookings or non-bridal bookings of LKR 10,000 or more"
    );
  }

  const advanceRate = isBridal ? BRIDAL_ADVANCE_RATE : advanceAvailable ? OTHER_ADVANCE_RATE : 0;

  const advancePercentage = paymentOption === "advance" ? Math.round(advanceRate * 100) : 0;

  let amountPaid = 0;
  let advancePayment = 0;
  let balancePayment = total;
  let paymentStatus = "Pending";
  let paymentMethod = "Pay at Salon";
  let paymentRequired = false;
  let paymentVerified = false;

  const isOnlinePaymentConfirmed = paymentConfirmed === true && paymentOption !== "salon";

  if (paymentOption === "advance") {
    advancePayment = roundMoney(total * advanceRate);
    amountPaid = isOnlinePaymentConfirmed ? advancePayment : 0;
    balancePayment = roundMoney(total - amountPaid);
    paymentStatus = isOnlinePaymentConfirmed ? "Partially Paid" : "Pending";
    paymentMethod = requestedPaymentMethod || "Credit/Debit Card";
    paymentRequired = true;
    paymentVerified = isOnlinePaymentConfirmed;
  }

  if (paymentOption === "full") {
    amountPaid = isOnlinePaymentConfirmed ? total : 0;
    balancePayment = isOnlinePaymentConfirmed ? 0 : roundMoney(total);
    paymentStatus = isOnlinePaymentConfirmed ? "Paid" : "Pending";
    paymentMethod = requestedPaymentMethod || "Credit/Debit Card";
    paymentRequired = true;
    paymentVerified = isOnlinePaymentConfirmed;
  }

  if (paymentOption === "salon") {
    amountPaid = 0;
    advancePayment = 0;
    balancePayment = roundMoney(total);
    paymentStatus = "Pending";
    paymentMethod = "Pay at Salon";
    paymentRequired = false;
    paymentVerified = false;
  }

  if (paymentOption !== "salon" && ["Credit/Debit Card", "Stripe"].includes(requestedPaymentMethod)) {
    paymentMethod = requestedPaymentMethod;
  }

  return {
    bookingType: normalizedBookingType,
    isBridal,
    paymentOption,
    paymentMethod,
    advancePercentage,
    advancePayment,
    amountPaid,
    balancePayment,
    paymentRequired,
    paymentStatus,
    paymentVerified,
    totalAmount: roundMoney(total),
    originalAmount: roundMoney(originalTotal),
    discountAmount,
    couponCode: appliedCoupon ? appliedCoupon.code : null,
  };
};

/* -------------------------------------------------------------------------- */
/*                           Temporary hold creation                          */
/* -------------------------------------------------------------------------- */

const createBookingHold = async (req, res) => {
  try {
    const customerId = getCustomerId(req);

    if (!customerId) {
      return res.status(401).json({ success: false, message: "Customer authentication is required" });
    }

    const {
      staffId,
      selectedDate,
      selectedTime,
      estimatedDuration,
      excludeBookingId,
      // Bridal-only: when reserving the trial makeup slot, pass the
      // main event's holdId here (and vice versa when refreshing the
      // main slot after the trial hold already exists) so the
      // stale-hold cleanup below doesn't delete the OTHER slot's
      // still-active hold for this same customer.
      keepHoldId,
    } = req.body;

    const normalizedStaffId = String(staffId || "").trim();

    if (!normalizedStaffId) {
      return res.status(400).json({ success: false, message: "Staff ID is required" });
    }

    const normalizedDate = normalizeBookingDate(selectedDate);
    const normalizedTime = normalizeBookingTime(selectedTime);
    const duration = Number(estimatedDuration);

    if (!Number.isFinite(duration) || duration <= 0) {
      return res.status(400).json({ success: false, message: "A valid estimated duration is required" });
    }

    ensureFutureSlot(normalizedDate, normalizedTime);

    await BookingHold.deleteMany({ expiresAt: { $lte: new Date() } });

    const confirmedConflict = await findConfirmedBookingConflict({
      staffId: normalizedStaffId,
      selectedDate: normalizedDate,
      selectedTime: normalizedTime,
      estimatedDuration: duration,
      excludeBookingId: excludeBookingId || undefined,
    });

    if (confirmedConflict) {
      return res.status(409).json({
        success: false,
        message: "This staff member is already booked during the selected time",
      });
    }

    const activeHoldConflict = await findActiveHoldConflict({
      customerId,
      staffId: normalizedStaffId,
      selectedDate: normalizedDate,
      selectedTime: normalizedTime,
      estimatedDuration: duration,
    });

    if (activeHoldConflict) {
      return res.status(409).json({
        success: false,
        message: "This time is temporarily reserved by another customer. Please choose another time or staff member.",
      });
    }

    await BookingHold.deleteMany({
      customer: customerId,
      expiresAt: { $gt: new Date() },
      ...(keepHoldId ? { _id: { $ne: keepHoldId } } : {}),
    });

    const slotKeys = generateSlotKeys({
      staffId: normalizedStaffId,
      selectedDate: normalizedDate,
      selectedTime: normalizedTime,
      estimatedDuration: duration,
    });

    const expiresAt = new Date(Date.now() + HOLD_DURATION_MINUTES * 60 * 1000);

    let hold;

    try {
      hold = await BookingHold.create({
        customer: customerId,
        staffId: normalizedStaffId,
        selectedDate: normalizedDate,
        selectedTime: normalizedTime,
        estimatedDuration: duration,
        slotKeys,
        expiresAt,
      });
    } catch (error) {
      if (error?.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "This time was just reserved by another customer. Please select another time or staff member.",
        });
      }

      throw error;
    }

    return res.status(201).json({
      success: true,
      message: "Booking slot reserved temporarily",
      hold: {
        holdId: hold._id,
        staffId: hold.staffId,
        selectedDate: hold.selectedDate,
        selectedTime: hold.selectedTime,
        estimatedDuration: hold.estimatedDuration,
        expiresAt: hold.expiresAt,
        expiresInSeconds: HOLD_DURATION_MINUTES * 60,
      },
    });
  } catch (error) {
    console.error("Create booking hold error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Unable to reserve the booking slot",
    });
  }
};

/* -------------------------------------------------------------------------- */
/*                              Hold cancellation                             */
/* -------------------------------------------------------------------------- */

const cancelBookingHold = async (req, res) => {
  try {
    const customerId = getCustomerId(req);
    const { holdId } = req.params;

    if (!customerId) {
      return res.status(401).json({ success: false, message: "Customer authentication is required" });
    }

    const deletedHold = await BookingHold.findOneAndDelete({ _id: holdId, customer: customerId });

    if (!deletedHold) {
      return res.status(404).json({ success: false, message: "Active booking hold not found" });
    }

    return res.status(200).json({ success: true, message: "Booking hold released" });
  } catch (error) {
    console.error("Cancel booking hold error:", error);

    return res.status(500).json({ success: false, message: "Unable to release the booking hold" });
  }
};

/* -------------------------------------------------------------------------- */
/*                            Availability checking                           */
/* -------------------------------------------------------------------------- */

const getBookingAvailability = async (req, res) => {
  try {
    const customerId = getCustomerId(req);

    const { date, time, duration, staffId, staffIds } = req.query;

    const normalizedDate = normalizeBookingDate(date);
    const normalizedTime = normalizeBookingTime(time);
    const estimatedDuration = Number(duration);

    if (!Number.isFinite(estimatedDuration) || estimatedDuration <= 0) {
      return res.status(400).json({ success: false, message: "A valid duration is required" });
    }

    let requestedStaffIds = [];

    if (staffIds) {
      requestedStaffIds = String(staffIds).split(",").map((id) => id.trim()).filter(Boolean);
    } else if (staffId) {
      requestedStaffIds = [String(staffId).trim()];
    }

    if (requestedStaffIds.length === 0) {
      return res.status(400).json({ success: false, message: "At least one staff ID is required" });
    }

    let isPast = false;

    try {
      ensureFutureSlot(normalizedDate, normalizedTime);
    } catch {
      isPast = true;
    }

    if (isPast) {
      return res.status(200).json({
        success: true,
        selectedDate: normalizedDate,
        selectedTime: normalizedTime,
        estimatedDuration,
        isPast: true,
        hasAvailableStaff: false,
        availableStaffIds: [],
        unavailableStaffIds: requestedStaffIds,
      });
    }

    await BookingHold.deleteMany({ expiresAt: { $lte: new Date() } });

    // Fixed: the staff member's own "Available for new bookings"
    // toggle (Staff.available, set via update-availability.tsx on the
    // staff app) was never actually consulted here — this endpoint
    // only ever checked for a slot conflict, so switching yourself off
    // did nothing on the customer side; you'd still show up as
    // "Available" for every open time slot. Real-world behavior: a
    // staff member who's toggled themselves off shouldn't be bookable
    // at all, regardless of what the calendar looks like.
    const staffDocs = await Staff.find({ _id: { $in: requestedStaffIds } })
      .select("available")
      .lean();

    const globallyUnavailable = new Set(
      staffDocs.filter((s) => s.available === false).map((s) => String(s._id))
    );

    // Real-world granular counterpart to the toggle above: a staff
    // member can be globally available but still have blocked off this
    // specific date+time from update-availability.tsx on the staff app
    // (see StaffAvailabilityBlock.js). Without this check that screen
    // was purely cosmetic — nothing on the customer side ever actually
    // respected a blocked slot.
    const blockedDocs = await StaffAvailabilityBlock.find({
      staffId: { $in: requestedStaffIds.map(String) },
      date: normalizedDate,
      blockedTimes: normalizedTime,
    })
      .select("staffId")
      .lean();

    const blockedForThisSlot = new Set(blockedDocs.map((b) => String(b.staffId)));

    const availableStaffIds = [];
    const unavailableStaffIds = [];

    for (const currentStaffId of requestedStaffIds) {
      if (globallyUnavailable.has(String(currentStaffId)) || blockedForThisSlot.has(String(currentStaffId))) {
        unavailableStaffIds.push(currentStaffId);
        continue;
      }

      const confirmedConflict = await findConfirmedBookingConflict({
        staffId: currentStaffId,
        selectedDate: normalizedDate,
        selectedTime: normalizedTime,
        estimatedDuration,
      });

      const holdConflict = await findActiveHoldConflict({
        customerId,
        staffId: currentStaffId,
        selectedDate: normalizedDate,
        selectedTime: normalizedTime,
        estimatedDuration,
      });

      if (confirmedConflict || holdConflict) {
        unavailableStaffIds.push(currentStaffId);
      } else {
        availableStaffIds.push(currentStaffId);
      }
    }

    return res.status(200).json({
      success: true,
      selectedDate: normalizedDate,
      selectedTime: normalizedTime,
      estimatedDuration,
      isPast: false,
      hasAvailableStaff: availableStaffIds.length > 0,
      availableStaffIds,
      unavailableStaffIds,
    });
  } catch (error) {
    console.error("Get booking availability error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Unable to check staff availability",
    });
  }
};

/* -------------------------------------------------------------------------- */
/*                             Booking confirmation                           */
/* -------------------------------------------------------------------------- */

const createBooking = async (req, res) => {
  let consumedHold = null;
  let consumedTrialHold = null;

  try {
    const {
      holdId,
      services,
      hairLength,
      staff,
      selectedDate,
      selectedTime,
      totalAmount,
      bookingType,
      paymentOption,
      paymentMethod,
      paymentIntentId,
      paymentConfirmed,
      couponCode,
      wantsTrialMakeup,
      trialMakeupDate,
      trialMakeupTime,
      trialHoldId,
      notes,
    } = req.body;

    const customerId = getCustomerId(req);

    if (!customerId) {
      return res.status(401).json({ success: false, message: "Customer authentication is required" });
    }

    if (!holdId) {
      return res.status(400).json({
        success: false,
        message: "A valid temporary booking hold is required before confirming the booking",
      });
    }

    const selectedStaffId = String(staff?.staffId || staff?._id || "").trim();

    if (!selectedStaffId) {
      return res.status(400).json({ success: false, message: "Please select a staff member" });
    }

    const normalizedDate = normalizeBookingDate(selectedDate);
    const normalizedTime = normalizeBookingTime(selectedTime);
    const estimatedDuration = calculateEstimatedDuration(services);

    ensureFutureSlot(normalizedDate, normalizedTime);

    const hold = await BookingHold.findOne({
      _id: holdId,
      customer: customerId,
      expiresAt: { $gt: new Date() },
    });

    if (!hold) {
      return res.status(409).json({
        success: false,
        message: "Your temporary booking hold has expired. Please select the time again.",
      });
    }

    const holdMatchesRequest =
      String(hold.staffId) === String(selectedStaffId) &&
      hold.selectedDate === normalizedDate &&
      normalizeBookingTime(hold.selectedTime) === normalizedTime &&
      Number(hold.estimatedDuration) === Number(estimatedDuration);

    if (!holdMatchesRequest) {
      return res.status(400).json({
        success: false,
        message: "The selected booking details do not match the reserved slot",
      });
    }

    // Resolves to either the customer's own claimed loyalty reward or a
    // salon-wide promotional Coupon — see couponResolver.js. `applied`
    // here is the resolver's wrapper ({ source, doc, discountType,
    // discountValue, code }); calculatePaymentDetails below only needs
    // the discount fields, so it's passed through as `appliedCoupon`.
    let applied = null;

    if (couponCode) {
      try {
        applied = await resolveAppliedCoupon(couponCode, customerId);
      } catch (error) {
        return res.status(error.statusCode || 400).json({
          success: false,
          message: error.message,
        });
      }
    }

    let paymentDetails;

    try {
      paymentDetails = calculatePaymentDetails({
        totalAmount,
        services,
        bookingType,
        requestedPaymentOption: paymentOption,
        requestedPaymentMethod: paymentMethod,
        paymentConfirmed,
        appliedCoupon: applied,
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    const confirmedConflict = await findConfirmedBookingConflict({
      staffId: selectedStaffId,
      selectedDate: normalizedDate,
      selectedTime: normalizedTime,
      estimatedDuration,
    });

    if (confirmedConflict) {
      return res.status(409).json({
        success: false,
        message: "This staff member is no longer available for the selected time",
      });
    }

    consumedHold = await BookingHold.findOneAndDelete({
      _id: holdId,
      customer: customerId,
      expiresAt: { $gt: new Date() },
    });

    if (!consumedHold) {
      return res.status(409).json({
        success: false,
        message: "The booking slot is no longer reserved. Please select it again.",
      });
    }

    // Bridal-only: the trial makeup session is a second appointment
    // for the same staff member, protected by the exact same
    // hold-then-consume machinery as the main event slot above — so a
    // staff member can't end up double-booked for a trial either.
    const wantsTrial = Boolean(wantsTrialMakeup);
    const normalizedTrialDate =
      wantsTrial && trialMakeupDate ? normalizeBookingDate(trialMakeupDate) : "";
    const normalizedTrialTime =
      wantsTrial && trialMakeupTime ? normalizeBookingTime(trialMakeupTime) : "";

    if (wantsTrial && normalizedTrialDate && normalizedTrialTime) {
      ensureFutureSlot(normalizedTrialDate, normalizedTrialTime);

      if (!trialHoldId) {
        const missingTrialHoldError = new Error(
          "A valid temporary hold on your trial makeup slot is required before confirming the booking"
        );
        missingTrialHoldError.statusCode = 400;
        throw missingTrialHoldError;
      }

      const trialConflict = await findConfirmedBookingConflict({
        staffId: selectedStaffId,
        selectedDate: normalizedTrialDate,
        selectedTime: normalizedTrialTime,
        estimatedDuration: TRIAL_MAKEUP_DURATION_MINUTES,
      });

      if (trialConflict) {
        const trialConflictError = new Error(
          "This staff member is no longer available for the selected trial makeup time"
        );
        trialConflictError.statusCode = 409;
        throw trialConflictError;
      }

      consumedTrialHold = await BookingHold.findOneAndDelete({
        _id: trialHoldId,
        customer: customerId,
        staffId: selectedStaffId,
        selectedDate: normalizedTrialDate,
        selectedTime: normalizedTrialTime,
        expiresAt: { $gt: new Date() },
      });

      if (!consumedTrialHold) {
        const trialHoldGoneError = new Error(
          "Your trial makeup slot is no longer reserved. Please select it again."
        );
        trialHoldGoneError.statusCode = 409;
        throw trialHoldGoneError;
      }
    }

    const isOnlinePayment = paymentDetails.paymentOption !== "salon";

    const transactionReference = isOnlinePayment
      ? `SIM-${crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`
      : null;

    const booking = await Booking.create({
      customer: customerId,
      services,

      hairLength: hairLength || {
        hairLengthId: "",
        name: "",
        description: "",
        extraPrice: 0,
      },

      staff: {
        staffId: selectedStaffId,
        name: String(staff?.name || ""),
        role: String(staff?.role || ""),
        image: String(staff?.image || ""),
      },

      selectedDate: normalizedDate,
      selectedTime: normalizedTime,
      estimatedDuration,

      bookingType: paymentDetails.bookingType,
      totalAmount: paymentDetails.totalAmount,
      originalAmount: paymentDetails.originalAmount,
      discountAmount: paymentDetails.discountAmount,
      couponCode: paymentDetails.couponCode,

      paymentOption: paymentDetails.paymentOption,
      paymentMethod: paymentDetails.paymentMethod,

      advancePercentage: paymentDetails.advancePercentage,

      advancePayment: paymentDetails.advancePayment,
      amountPaid: paymentDetails.amountPaid,
      balancePayment: paymentDetails.balancePayment,

      paymentRequired: paymentDetails.paymentRequired,
      paymentStatus: paymentDetails.paymentStatus,
      paymentVerified: paymentDetails.paymentVerified,

      paymentVerifiedAt: paymentDetails.paymentVerified ? new Date() : null,

      stripePaymentIntentId: paymentIntentId || null,
      transactionReference,
      // Real-world flow (per product decision): a new booking starts
      // as Pending, not auto-Confirmed — the staff member it's
      // assigned to has to explicitly confirm or decline it before
      // it's a real commitment. See staffScheduleController.js's
      // updateBookingStatus for the confirm/decline/complete rules.
      status: "Pending",

      // Bridal-only trial makeup add-on. Harmless defaults for every
      // other booking type, since those screens are never visited and
      // these arrive undefined/false in req.body.
      wantsTrialMakeup: Boolean(wantsTrialMakeup),
      trialMakeupDate: trialMakeupDate ? String(trialMakeupDate) : "",
      trialMakeupTime: trialMakeupTime ? String(trialMakeupTime) : "",
      notes: notes ? String(notes).trim().slice(0, 200) : "",
    });

    // Mark the coupon redeemed only now that the booking genuinely
    // exists — if anything above had failed, the coupon must remain
    // usable, not get silently burned for nothing. Only a claimed
    // loyalty reward is single-use like this; a salon-wide promo
    // Coupon is meant to be reusable by any customer until it expires,
    // so it's never marked redeemed here.
    if (applied?.source === "claimedReward") {
      applied.doc.redeemedAt = new Date();
      applied.doc.redeemedOnBooking = booking._id;
      await applied.doc.save();
    }

    await sendBookingEmail({ customerId, booking });

    await createNotification({
      customerId,
      type: "booking_pending",
      title: "Booking Requested",
      message: `Your booking request for ${booking.selectedDate} at ${booking.selectedTime} has been sent and is waiting for staff confirmation.`,
      relatedBooking: booking._id,
    });

    if (booking.staff?.staffId) {
      const serviceNames = (booking.services || []).map((s) => s.name).filter(Boolean).join(", ");

      await createNotification({
        staffId: booking.staff.staffId,
        type: "new_booking",
        title: "New Booking Request",
        message: `${serviceNames || "A new appointment"} requested for ${booking.selectedDate} at ${booking.selectedTime}. Please confirm or decline.`,
        relatedBooking: booking._id,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Booking created successfully",
      booking,

      paymentSummary: {
        bookingType: booking.bookingType,
        paymentOption: booking.paymentOption,
        paymentMethod: booking.paymentMethod,
        advancePercentage: booking.advancePercentage,
        totalAmount: booking.totalAmount,
        originalAmount: booking.originalAmount,
        discountAmount: booking.discountAmount,
        couponCode: booking.couponCode,
        amountPaid: booking.amountPaid,
        balancePayment: booking.balancePayment,
        paymentStatus: booking.paymentStatus,
        transactionReference: booking.transactionReference,
      },
    });
  } catch (error) {
    console.error("Booking creation error:", error);

    if (consumedHold && consumedHold.expiresAt.getTime() > Date.now()) {
      try {
        await BookingHold.create({
          customer: consumedHold.customer,
          staffId: consumedHold.staffId,
          selectedDate: consumedHold.selectedDate,
          selectedTime: consumedHold.selectedTime,
          estimatedDuration: consumedHold.estimatedDuration,
          slotKeys: consumedHold.slotKeys,
          expiresAt: consumedHold.expiresAt,
        });
      } catch (restoreError) {
        console.error("Unable to restore booking hold:", restoreError);
      }
    }

    if (consumedTrialHold && consumedTrialHold.expiresAt.getTime() > Date.now()) {
      try {
        await BookingHold.create({
          customer: consumedTrialHold.customer,
          staffId: consumedTrialHold.staffId,
          selectedDate: consumedTrialHold.selectedDate,
          selectedTime: consumedTrialHold.selectedTime,
          estimatedDuration: consumedTrialHold.estimatedDuration,
          slotKeys: consumedTrialHold.slotKeys,
          expiresAt: consumedTrialHold.expiresAt,
        });
      } catch (restoreError) {
        console.error("Unable to restore trial makeup hold:", restoreError);
      }
    }

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This booking slot is already reserved or booked",
      });
    }

    if (error?.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Booking creation failed",
      error: error.message,
    });
  }
};

/* -------------------------------------------------------------------------- */
/*                    Get the logged-in customer's bookings                   */
/* -------------------------------------------------------------------------- */

const getMyBookings = async (req, res) => {
  try {
    const customerId = getCustomerId(req);

    if (!customerId) {
      return res.status(401).json({ success: false, message: "Customer authentication is required" });
    }

    const bookings = await Booking.find({ customer: customerId })
      .sort({ selectedDate: -1, createdAt: -1 })
      .lean();

    // Batch-fetch this customer's own reviews for these bookings in one
    // query, so bookings.tsx can tell "Leave Feedback" (no review yet)
    // apart from "View Your Feedback" (already reviewed) without a
    // second round trip per card.
    const reviews = await Review.find({
      booking: { $in: bookings.map((b) => b._id) },
    })
      .select("booking rating comment")
      .lean();

    const reviewByBookingId = new Map(
      reviews.map((r) => [String(r.booking), { rating: r.rating, comment: r.comment }])
    );

    const now = Date.now();

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

      // Cancelled is always "done"; Completed and No-show are too,
      // even when a staff member marks it done/no-show ahead of the
      // actual scheduled time (isPast otherwise stays false until
      // that time passes, which was hiding same-day completed
      // appointments from the Past tab here).
      if (booking.status === "Cancelled" || booking.status === "Completed" || booking.status === "No-show") {
        isPast = true;
      }

      // Renamed from "Awaiting Confirmation" — that label now belongs
      // to the real Pending status (a new request the salon hasn't
      // confirmed or declined yet). This is a different moment: a
      // CONFIRMED appointment whose time has passed but the staff
      // member hasn't marked it Completed yet.
      const effectiveStatus =
        booking.status === "Confirmed" && isPast ? "Awaiting Completion" : booking.status;

      return {
        ...booking,
        isPast,
        effectiveStatus,
        review: reviewByBookingId.get(String(booking._id)) || null,
      };
    });

    return res.status(200).json({ success: true, bookings: withComputedTiming });
  } catch (error) {
    console.error("Get my bookings error:", error);

    return res.status(500).json({ success: false, message: "Unable to load bookings" });
  }
};

/* -------------------------------------------------------------------------- */
/*                    Cancel an already-confirmed booking                     */
/* -------------------------------------------------------------------------- */

const cancelBooking = async (req, res) => {
  try {
    const customerId = getCustomerId(req);
    const { bookingId } = req.params;

    if (!customerId) {
      return res.status(401).json({ success: false, message: "Customer authentication is required" });
    }

    const booking = await Booking.findOne({ _id: bookingId, customer: customerId });

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.status === "Cancelled") {
      return res.status(400).json({ success: false, message: "This booking has already been cancelled" });
    }

    if (booking.status === "Completed") {
      return res.status(400).json({ success: false, message: "Completed bookings cannot be cancelled" });
    }

    // Fixed: this used to be the only two checks here, unlike the
    // staff-side cancel path (updateBookingStatus in
    // staffScheduleController.js), which also refuses to cancel once
    // the appointment's scheduled time has already passed. Without
    // this, a customer could "cancel" — and trigger a real refund on
    // — a booking that already happened but hadn't been marked
    // Completed yet, or one staff had already marked a "No-show"
    // specifically because they forfeit their deposit for not
    // showing up. Either way, the customer would get their money back
    // for a slot the salon had already honored or held open for them.
    if (booking.status === "No-show") {
      return res.status(400).json({
        success: false,
        message: "This appointment was already marked as a no-show and can't be cancelled",
      });
    }

    try {
      const bookingDateTime = getBookingDateTime(booking.selectedDate, booking.selectedTime);

      if (bookingDateTime.getTime() <= Date.now()) {
        return res.status(400).json({
          success: false,
          message: "This appointment's scheduled time has already passed and can no longer be cancelled. Please contact the salon directly.",
        });
      }
    } catch (parseError) {
      // An unparsable date/time shouldn't block a legitimate
      // cancellation — same "don't crash over one bad record"
      // tolerance the reminder service and staff-side checks use.
      console.error("Failed to parse booking date/time for cancel check:", parseError.message);
    }

    booking.status = "Cancelled";
    const refund = await refundBookingPayment(booking);
    await booking.save();

    const customerMessage = refund.refunded
      ? `Your appointment on ${booking.selectedDate} at ${booking.selectedTime} has been cancelled. LKR ${refund.amount.toLocaleString()} has been refunded to your original payment method.`
      : `Your appointment on ${booking.selectedDate} at ${booking.selectedTime} has been cancelled.`;

    await createNotification({
      customerId,
      type: "booking_cancelled",
      title: "Booking Cancelled",
      message: customerMessage,
      relatedBooking: booking._id,
    });

    if (booking.staff?.staffId) {
      const staffMessage = refund.refunded
        ? `The appointment on ${booking.selectedDate} at ${booking.selectedTime} was cancelled by the customer. LKR ${refund.amount.toLocaleString()} was automatically refunded.`
        : `The appointment on ${booking.selectedDate} at ${booking.selectedTime} was cancelled by the customer.`;

      await createNotification({
        staffId: booking.staff.staffId,
        type: "booking_cancelled_by_customer",
        title: "Booking Cancelled",
        message: staffMessage,
        relatedBooking: booking._id,
      });
    }

    return res.status(200).json({ success: true, message: "Booking cancelled", booking, refund });
  } catch (error) {
    console.error("Cancel booking error:", error);

    return res.status(500).json({ success: false, message: "Unable to cancel the booking" });
  }
};

/* -------------------------------------------------------------------------- */
/*                    Preview a coupon code before checkout                   */
/* -------------------------------------------------------------------------- */

// Lets payment.tsx show the real discount the moment the customer taps
// "Apply", before they've picked a payment method or created a Stripe
// hold — doesn't touch Stripe or burn the coupon, just resolves the
// code and reports what createBooking (or createPaymentIntent, for a
// card payment) would actually apply. The authoritative discount is
// still always recomputed server-side at the point of charge/booking —
// this is a preview only, never trusted on its own for the real total.
const validateCoupon = async (req, res) => {
  try {
    const customerId = getCustomerId(req);

    if (!customerId) {
      return res.status(401).json({ success: false, message: "Customer authentication is required" });
    }

    const { couponCode, totalAmount } = req.body;

    const originalTotal = Number(totalAmount);

    if (!Number.isFinite(originalTotal) || originalTotal <= 0) {
      return res.status(400).json({ success: false, message: "A valid total amount is required" });
    }

    let applied;

    try {
      applied = await resolveAppliedCoupon(couponCode, customerId);
    } catch (error) {
      return res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }

    if (!applied) {
      return res.status(400).json({ success: false, message: "Enter a coupon code" });
    }

    if (applied.discountType === "freeService") {
      return res.status(400).json({
        success: false,
        message: "This reward must be redeemed in person at the salon and can't be applied online yet",
      });
    }

    const discountAmount = calculateCouponDiscount(originalTotal, applied);

    return res.status(200).json({
      success: true,
      code: applied.code,
      discountType: applied.discountType,
      discountValue: applied.discountValue,
      discountAmount,
      discountedTotal: roundMoney(originalTotal - discountAmount),
    });
  } catch (error) {
    console.error("Validate coupon error:", error);

    return res.status(500).json({ success: false, message: "Unable to validate this coupon code" });
  }
};

/* -------------------------------------------------------------------------- */
/*                         Reschedule an existing booking                     */
/* -------------------------------------------------------------------------- */

const rescheduleBooking = async (req, res) => {
  let consumedHold = null;

  try {
    const customerId = getCustomerId(req);
    const { bookingId } = req.params;
    // holdId reschedules the main event slot; trialHoldId (bridal
    // only) reschedules the trial makeup slot instead. Exactly one is
    // expected per request — the mobile app always sends just the one
    // that matches whichever "Choose New Time" button the customer
    // used, on reschedule.tsx's bridal branch.
    const { holdId, trialHoldId } = req.body;
    const isTrialReschedule = !holdId && Boolean(trialHoldId);
    const activeHoldId = isTrialReschedule ? trialHoldId : holdId;

    if (!customerId) {
      return res.status(401).json({ success: false, message: "Customer authentication is required" });
    }

    if (!activeHoldId) {
      return res.status(400).json({ success: false, message: "A valid temporary hold on the new time is required" });
    }

    const booking = await Booking.findOne({ _id: bookingId, customer: customerId });

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.status === "Cancelled") {
      return res.status(400).json({ success: false, message: "Cancelled bookings cannot be rescheduled" });
    }

    if (booking.status === "Completed") {
      return res.status(400).json({ success: false, message: "Completed bookings cannot be rescheduled" });
    }

    if (isTrialReschedule && !booking.wantsTrialMakeup) {
      return res.status(400).json({
        success: false,
        message: "This booking doesn't have a trial makeup session to reschedule",
      });
    }

    const hold = await BookingHold.findOne({
      _id: activeHoldId,
      customer: customerId,
      expiresAt: { $gt: new Date() },
    });

    if (!hold) {
      return res.status(409).json({
        success: false,
        message: "Your temporary hold on the new time has expired. Please pick a time again.",
      });
    }

    if (String(hold.staffId) !== String(booking.staff.staffId)) {
      return res.status(400).json({
        success: false,
        message: "The reserved time is for a different staff member than this booking",
      });
    }

    const confirmedConflict = await findConfirmedBookingConflict({
      staffId: booking.staff.staffId,
      selectedDate: hold.selectedDate,
      selectedTime: hold.selectedTime,
      estimatedDuration: hold.estimatedDuration,
      excludeBookingId: booking._id,
    });

    if (confirmedConflict) {
      return res.status(409).json({
        success: false,
        message: "This staff member is no longer available for the selected time",
      });
    }

    // A trial has to stay before the actual event — mirrors the
    // client-side cap trialMakeupDate.tsx already enforces when
    // picking the date, checked again here since this is the last
    // point before the change is actually committed.
    if (isTrialReschedule && booking.selectedDate && hold.selectedDate >= booking.selectedDate) {
      return res.status(400).json({
        success: false,
        message: "The trial makeup date must be before the event date",
      });
    }

    if (!isTrialReschedule && booking.wantsTrialMakeup && booking.trialMakeupDate && hold.selectedDate <= booking.trialMakeupDate) {
      return res.status(400).json({
        success: false,
        message: "The event date must be after the trial makeup date",
      });
    }

    consumedHold = await BookingHold.findOneAndDelete({
      _id: activeHoldId,
      customer: customerId,
      expiresAt: { $gt: new Date() },
    });

    if (!consumedHold) {
      return res.status(409).json({
        success: false,
        message: "The reserved time is no longer available. Please select it again.",
      });
    }

    const previousDate = isTrialReschedule ? booking.trialMakeupDate : booking.selectedDate;
    const previousTime = isTrialReschedule ? booking.trialMakeupTime : booking.selectedTime;

    booking.rescheduleHistory = booking.rescheduleHistory || [];
    booking.rescheduleHistory.push({
      previousDate,
      previousTime,
      kind: isTrialReschedule ? "trial" : "event",
      rescheduledAt: new Date(),
    });

    if (isTrialReschedule) {
      booking.trialMakeupDate = consumedHold.selectedDate;
      booking.trialMakeupTime = consumedHold.selectedTime;
    } else {
      booking.selectedDate = consumedHold.selectedDate;
      booking.selectedTime = consumedHold.selectedTime;
    }

    await booking.save();

    await sendBookingEmail({
      customerId,
      booking,
      isReschedule: true,
      previousDate,
      previousTime,
    });

    await createNotification({
      customerId,
      type: "booking_rescheduled",
      title: "Booking Rescheduled",
      message: isTrialReschedule
        ? `Your trial makeup was moved to ${booking.trialMakeupDate} at ${booking.trialMakeupTime}.`
        : `Your appointment was moved to ${booking.selectedDate} at ${booking.selectedTime}.`,
      relatedBooking: booking._id,
    });

    if (booking.staff?.staffId) {
      await createNotification({
        staffId: booking.staff.staffId,
        type: "booking_rescheduled_by_customer",
        title: "Booking Rescheduled",
        message: isTrialReschedule
          ? `A customer moved their trial makeup to ${booking.trialMakeupDate} at ${booking.trialMakeupTime}.`
          : `A customer moved their appointment to ${booking.selectedDate} at ${booking.selectedTime}.`,
        relatedBooking: booking._id,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Booking rescheduled successfully",
      booking,
    });
  } catch (error) {
    console.error("Reschedule booking error:", error);

    if (consumedHold && consumedHold.expiresAt.getTime() > Date.now()) {
      try {
        await BookingHold.create({
          customer: consumedHold.customer,
          staffId: consumedHold.staffId,
          selectedDate: consumedHold.selectedDate,
          selectedTime: consumedHold.selectedTime,
          estimatedDuration: consumedHold.estimatedDuration,
          slotKeys: consumedHold.slotKeys,
          expiresAt: consumedHold.expiresAt,
        });
      } catch (restoreError) {
        console.error("Unable to restore booking hold:", restoreError);
      }
    }

    return res.status(500).json({ success: false, message: "Unable to reschedule the booking" });
  }
};

module.exports = {
  createBooking,
  createBookingHold,
  cancelBookingHold,
  getBookingAvailability,
  getMyBookings,
  cancelBooking,
  rescheduleBooking,
  getBookingDateTime,
  normalizeBookingTime,
  refundBookingPayment,
  validateCoupon,
};