const crypto = require("crypto");

const Booking = require("../models/Booking");
const BookingHold = require("../models/BookingHold");
const Customer = require("../models/Customer");
const sendEmail = require("../utils/sendEmail");

const HOLD_DURATION_MINUTES = 10;
const SLOT_INTERVAL_MINUTES = 15;

// Sri Lanka = UTC+05:30.
// Change through .env later if required.
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

// New: sends a booking confirmation/reschedule email using the
// existing sendEmail util (same Nodemailer transporter already used
// for OTP emails). Wrapped in try/catch wherever it's called so an
// email failure can NEVER cause the booking/reschedule itself to
// fail — the booking is the important transaction, the email is a
// notification on top of it.
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

  return `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#111;">
      <h2 style="color:#FF2D75;">${isReschedule ? "Your Appointment Has Been Rescheduled" : "Booking Confirmed"}</h2>
      <p>Hi ${customerName || "there"},</p>
      <p>${isReschedule
        ? "Here are your updated appointment details:"
        : "Thank you for booking with LimoSalon. Here are your appointment details:"}</p>
      ${rescheduleNote}
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
    // Deliberately swallowed: a failed confirmation email should
    // never cause the booking/reschedule itself to fail or roll back.
    console.error("Booking email failed to send:", emailError);
  }
};

const escapeRegex = (value) => {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// New: shifts a "YYYY-MM-DD" date string by a number of days (can be
// negative). Needed so conflict checks can also look at the day
// before/after a booking's date — required once bookingsOverlap
// compares real timestamps instead of "minutes since midnight",
// since a late booking's duration can push its end time past
// midnight into the next calendar day (and, symmetrically, an
// existing booking from the previous evening can spill into today).
const shiftDateString = (dateStr, deltaDays) => {
  const [year, month, day] = String(dateStr).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + deltaDays);

  return `${date.getUTCFullYear()}-${String(
    date.getUTCMonth() + 1
  ).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
};

const getCustomerId = (req) => {
  return req.customer?._id || req.customer?.id || null;
};

// Fixed: previously this only ever detected "bridal" vs. everything
// else, so Face and Body bookings were silently saved as "hair" —
// and the schema's enum used to only allow "hair"/"bridal" anyway,
// so this couldn't have worked even if it tried. Now that the schema
// accepts "face"/"body" too, this properly classifies all four.
// Checks bookingType directly first (most reliable, since the
// frontend should be sending the actual category), and only falls
// back to scanning the service data as a backup.
const detectServiceCategory = (services, bookingType) => {
  const normalizedBookingType = String(bookingType || "")
    .trim()
    .toLowerCase();

  if (["bridal", "hair", "face", "body"].includes(normalizedBookingType)) {
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
).padStart(2, "0")}-${String(
  parsedDate.getDate()
).padStart(2, "0")}`;
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

    if (
      hours < 1 ||
      hours > 12 ||
      minutes < 0 ||
      minutes > 59
    ) {
      throw new Error("Invalid booking time");
    }

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )} ${period}`;
  }

  const twentyFourHourMatch = rawValue.match(/^(\d{1,2}):(\d{2})$/);

  if (twentyFourHourMatch) {
    const hours = Number(twentyFourHourMatch[1]);
    const minutes = Number(twentyFourHourMatch[2]);

    if (
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      throw new Error("Invalid booking time");
    }

    const period = hours >= 12 ? "pm" : "am";
    const twelveHour = hours % 12 || 12;

    return `${String(twelveHour).padStart(2, "0")}:${String(
      minutes
    ).padStart(2, "0")} ${period}`;
  }

  throw new Error(
    "Invalid booking time. Use a format such as 09:00 am."
  );
};

const timeToMinutes = (value) => {
  const normalizedTime = normalizeBookingTime(value);

  const match = normalizedTime.match(
    /^(\d{2}):(\d{2})\s(am|pm)$/
  );

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
  const bookingDateTime = getBookingDateTime(
    selectedDate,
    selectedTime
  );

  if (bookingDateTime.getTime() <= Date.now()) {
    throw new Error(
      "The selected booking date and time has already passed"
    );
  }
};

// Fixed: this previously compared "minutes since midnight" for both
// bookings, and treated anything whose end time crossed past 1440
// minutes (past midnight) as automatically NOT a conflict — the
// opposite of correct. A 10:00 pm booking with a 240-minute (4-hour)
// duration ends at 2:00 am the next day; that guard clause silently
// waved through any real double-booking in that window.
//
// Now both bookings' start/end are converted to real absolute
// timestamps via getBookingDateTime (which already correctly handles
// date + time + timezone), so overlap is just a normal interval
// comparison — no artificial day boundary, correct regardless of how
// far past midnight a booking runs.
const bookingsOverlap = ({
  requestedDate,
  requestedStart,
  requestedDuration,
  existingDate,
  existingStart,
  existingDuration,
}) => {
  const safeRequestedDuration = Math.max(
    Number(requestedDuration) || 0,
    1
  );

  const safeExistingDuration = Math.max(
    Number(existingDuration) || 0,
    1
  );

  const requestedStartDateTime = getBookingDateTime(
    requestedDate,
    requestedStart
  );

  const existingStartDateTime = getBookingDateTime(
    existingDate,
    existingStart
  );

  const requestedEndDateTime = new Date(
    requestedStartDateTime.getTime() +
      safeRequestedDuration * 60 * 1000
  );

  const existingEndDateTime = new Date(
    existingStartDateTime.getTime() +
      safeExistingDuration * 60 * 1000
  );

  return (
    requestedStartDateTime < existingEndDateTime &&
    existingStartDateTime < requestedEndDateTime
  );
};

const generateSlotKeys = ({
  staffId,
  selectedDate,
  selectedTime,
  estimatedDuration,
}) => {
  const startMinutes = timeToMinutes(selectedTime);
  const duration = Math.max(Number(estimatedDuration) || 0, 1);

  // Round the occupied period up to the nearest 15-minute segment.
  const endMinutes =
    startMinutes +
    Math.ceil(duration / SLOT_INTERVAL_MINUTES) *
      SLOT_INTERVAL_MINUTES;

  const slotKeys = [];

  for (
    let minute = startMinutes;
    minute < endMinutes;
    minute += SLOT_INTERVAL_MINUTES
  ) {
    slotKeys.push(`${staffId}|${selectedDate}|${minute}`);
  }

  return slotKeys;
};

const calculateEstimatedDuration = (services) => {
  if (!Array.isArray(services) || services.length === 0) {
    throw new Error("At least one service is required");
  }

  const estimatedDuration = services.reduce(
    (total, service) =>{

      const duration = Number(service?.duration);

      return total + (
        Number.isFinite(duration)
        ? duration
        : 0
      );
    } ,0);

  if (
    !Number.isFinite(estimatedDuration) ||
    estimatedDuration <= 0
  ) {
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
  // Fixed: previously only matched bookings on this exact calendar
  // date, via a regex anchored to selectedDate. That meant a booking
  // whose duration spills past midnight into the next day (or an
  // existing booking from the previous evening spilling into today)
  // was never even fetched for comparison — regardless of whether
  // bookingsOverlap's math was correct. Now the query pulls in the
  // day before and the day after as well; bookingsOverlap (using
  // real timestamps) filters out anything that doesn't genuinely
  // overlap, so the extra candidates are harmless.
  const query = {
    "staff.staffId": staffId,
    selectedDate: {
      $in: [
        shiftDateString(selectedDate, -1),
        selectedDate,
        shiftDateString(selectedDate, 1),
      ],
    },
    status: {
      $nin: ["Cancelled"],
    },
  };

  // New: when rescheduling, the booking being moved still exists in
  // the database under its OLD date/time. If the new date happens to
  // be the same calendar day, this query would otherwise find the
  // booking's own current record and could incorrectly treat it as a
  // conflict with itself. Excluding it here only affects callers that
  // explicitly pass excludeBookingId (i.e. reschedule) — every
  // existing call site is unaffected.
  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  const existingBookings = await Booking.find(query)
    .select("selectedDate selectedTime estimatedDuration status")
    .lean();

  return (
    existingBookings.find((booking) =>
      bookingsOverlap({
        requestedDate: selectedDate,
        requestedStart: selectedTime,
        requestedDuration: estimatedDuration,
        existingDate: booking.selectedDate,
        existingStart: booking.selectedTime,
        existingDuration: booking.estimatedDuration,
      })
    ) || null
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
  // Fixed: same cross-midnight gap as findConfirmedBookingConflict —
  // previously matched only holds on the exact same calendar date,
  // so a hold whose duration spills past midnight (or one held the
  // previous evening spilling into today) was never checked against.
  const query = {
    staffId,
    selectedDate: {
      $in: [
        shiftDateString(selectedDate, -1),
        selectedDate,
        shiftDateString(selectedDate, 1),
      ],
    },
    expiresAt: {
      $gt: new Date(),
    },
  };

  if (excludeHoldId) {
    query._id = {
      $ne: excludeHoldId,
    };
  }

  const holds = await BookingHold.find(query)
    .select(
      "customer selectedTime estimatedDuration expiresAt staffId selectedDate"
    )
    .lean();

  return (
    holds.find((hold) => {
      // The customer's own current hold is not treated as a conflict.
      if (
        customerId &&
        String(hold.customer) === String(customerId)
      ) {
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
}) => {
  const total = Number(totalAmount);

  if (!Number.isFinite(total) || total <= 0) {
    throw new Error("A valid total amount is required");
  }

  const serviceCategory = detectServiceCategory(services, bookingType);
  const isBridal = serviceCategory === "bridal";

  const normalizedBookingType = serviceCategory;

  const paymentOption = String(
    requestedPaymentOption || ""
  )
    .trim()
    .toLowerCase();

  if (!["advance", "full", "salon"].includes(paymentOption)) {
    throw new Error("Invalid payment option");
  }
   
  const allowedPaymentMethods = [
  "Credit/Debit Card",
  "Stripe",
  "Pay at Salon",
];

if (
  requestedPaymentMethod &&
  !allowedPaymentMethods.includes(requestedPaymentMethod)
) {
  throw new Error("Invalid payment method");
}


  const advanceAvailable =
    isBridal ||
    (!isBridal && total >= NON_BRIDAL_ADVANCE_MINIMUM);

  // Pay at Salon is allowed only for non-bridal totals below LKR 10,000.
  const payAtSalonAllowed =
    !isBridal && total < NON_BRIDAL_ADVANCE_MINIMUM;

  if (paymentOption === "salon" && !payAtSalonAllowed) {
    if (isBridal) {
      throw new Error(
        "Bridal bookings require a 20% advance or full online payment"
      );
    }

    throw new Error(
      "Bookings of LKR 10,000 or more require a 10% advance or full online payment"
    );
  }

  if (
    paymentOption === "advance" &&
    !advanceAvailable
  ) {
    throw new Error(
      "The advance option is available only for bridal bookings or non-bridal bookings of LKR 10,000 or more"
    );
  }

  const advanceRate = isBridal
    ? BRIDAL_ADVANCE_RATE
    : advanceAvailable
      ? OTHER_ADVANCE_RATE
      : 0;

  const advancePercentage =
    paymentOption === "advance"
      ? Math.round(advanceRate * 100)
      : 0;

  let amountPaid = 0;
  let advancePayment = 0;
  let balancePayment = total;
  let paymentStatus = "Pending";
  let paymentMethod = "Pay at Salon";
  let paymentRequired = false;
  let paymentVerified = false;

  // Fixed: previously "advance" and "full" always saved as
  // Pending/unpaid/unverified regardless of what actually happened,
  // because nothing ever told this function whether the online
  // payment genuinely succeeded. cardPayment.tsx now sends
  // paymentConfirmed: true only after Stripe's presentPaymentSheet()
  // returns success — so this only marks a booking as paid when the
  // client has verified a real successful charge, not automatically
  // for every advance/full selection. "salon" always stays
  // Pending/unpaid regardless, since that payment genuinely hasn't
  // happened yet.
  const isOnlinePaymentConfirmed =
    paymentConfirmed === true && paymentOption !== "salon";

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

  if (
    paymentOption !== "salon" &&
    ["Credit/Debit Card", "Stripe"].includes(
      requestedPaymentMethod
    )
  ) {
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
  };
};

/* -------------------------------------------------------------------------- */
/*                           Temporary hold creation                          */
/* -------------------------------------------------------------------------- */

const createBookingHold = async (req, res) => {
  try {
    const customerId = getCustomerId(req);

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "Customer authentication is required",
      });
    }

    const {
      staffId,
      selectedDate,
      selectedTime,
      estimatedDuration,
      excludeBookingId,
    } = req.body;

    const normalizedStaffId = String(staffId || "").trim();

    if (!normalizedStaffId) {
      return res.status(400).json({
        success: false,
        message: "Staff ID is required",
      });
    }

    const normalizedDate = normalizeBookingDate(selectedDate);
    const normalizedTime = normalizeBookingTime(selectedTime);
    const duration = Number(estimatedDuration);

    if (!Number.isFinite(duration) || duration <= 0) {
      return res.status(400).json({
        success: false,
        message: "A valid estimated duration is required",
      });
    }

    ensureFutureSlot(normalizedDate, normalizedTime);

    // Remove expired documents immediately instead of waiting for TTL.
    await BookingHold.deleteMany({
      expiresAt: {
        $lte: new Date(),
      },
    });

    const confirmedConflict =
      await findConfirmedBookingConflict({
        staffId: normalizedStaffId,
        selectedDate: normalizedDate,
        selectedTime: normalizedTime,
        estimatedDuration: duration,
        // New: when this hold is being created as part of a
        // reschedule, the booking being moved should not count as a
        // conflict against its own current slot.
        excludeBookingId: excludeBookingId || undefined,
      });

    if (confirmedConflict) {
      return res.status(409).json({
        success: false,
        message:
          "This staff member is already booked during the selected time",
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
        message:
          "This time is temporarily reserved by another customer. Please choose another time or staff member.",
      });
    }

    /*
     * A customer should have only one active hold.
     * Creating a new one releases their previous hold.
     */
    await BookingHold.deleteMany({
      customer: customerId,
      expiresAt:{
        $gt:new Date()
      }
    });

    const slotKeys = generateSlotKeys({
      staffId: normalizedStaffId,
      selectedDate: normalizedDate,
      selectedTime: normalizedTime,
      estimatedDuration: duration,
    });

    const expiresAt = new Date(
      Date.now() + HOLD_DURATION_MINUTES * 60 * 1000
    );

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
          message:
            "This time was just reserved by another customer. Please select another time or staff member.",
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
      message:
        error.message || "Unable to reserve the booking slot",
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
      return res.status(401).json({
        success: false,
        message: "Customer authentication is required",
      });
    }

    const deletedHold = await BookingHold.findOneAndDelete({
      _id: holdId,
      customer: customerId,
    });

    if (!deletedHold) {
      return res.status(404).json({
        success: false,
        message: "Active booking hold not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Booking hold released",
    });
  } catch (error) {
    console.error("Cancel booking hold error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to release the booking hold",
    });
  }
};

/* -------------------------------------------------------------------------- */
/*                            Availability checking                           */
/* -------------------------------------------------------------------------- */

const getBookingAvailability = async (req, res) => {
  try {
    const customerId = getCustomerId(req);

    const {
      date,
      time,
      duration,
      staffId,
      staffIds,
    } = req.query;

    const normalizedDate = normalizeBookingDate(date);
    const normalizedTime = normalizeBookingTime(time);
    const estimatedDuration = Number(duration);

    if (
      !Number.isFinite(estimatedDuration) ||
      estimatedDuration <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid duration is required",
      });
    }

    let requestedStaffIds = [];

    if (staffIds) {
      requestedStaffIds = String(staffIds)
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
    } else if (staffId) {
      requestedStaffIds = [String(staffId).trim()];
    }

    if (requestedStaffIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one staff ID is required",
      });
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

    await BookingHold.deleteMany({
      expiresAt: {
        $lte: new Date(),
      },
    });

    const availableStaffIds = [];
    const unavailableStaffIds = [];

    for (const currentStaffId of requestedStaffIds) {
      const confirmedConflict =
        await findConfirmedBookingConflict({
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
      message:
        error.message || "Unable to check staff availability",
    });
  }
};

/* -------------------------------------------------------------------------- */
/*                             Booking confirmation                           */
/* -------------------------------------------------------------------------- */

const createBooking = async (req, res) => {
  let consumedHold = null;

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
    } = req.body;

    const customerId = getCustomerId(req);

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "Customer authentication is required",
      });
    }

    if (!holdId) {
      return res.status(400).json({
        success: false,
        message:
          "A valid temporary booking hold is required before confirming the booking",
      });
    }

    const selectedStaffId = String(
      staff?.staffId || staff?._id || ""
    ).trim();

    if (!selectedStaffId) {
      return res.status(400).json({
        success: false,
        message: "Please select a staff member",
      });
    }

    const normalizedDate = normalizeBookingDate(selectedDate);
    const normalizedTime = normalizeBookingTime(selectedTime);
    const estimatedDuration = calculateEstimatedDuration(services);

    ensureFutureSlot(normalizedDate, normalizedTime);

    const hold = await BookingHold.findOne({
      _id: holdId,
      customer: customerId,
      expiresAt: {
        $gt: new Date(),
      },
    });

    if (!hold) {
      return res.status(409).json({
        success: false,
        message:
          "Your temporary booking hold has expired. Please select the time again.",
      });
    }

    const holdMatchesRequest = String (hold.staffId) === String (selectedStaffId) &&
      hold.selectedDate === normalizedDate &&
      normalizeBookingTime(hold.selectedTime) === normalizedTime &&
      Number(hold.estimatedDuration) === Number(estimatedDuration);

    if (!holdMatchesRequest) {
      return res.status(400).json({
        success: false,
        message:
          "The selected booking details do not match the reserved slot",
      });
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
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    const confirmedConflict =
      await findConfirmedBookingConflict({
        staffId: selectedStaffId,
        selectedDate: normalizedDate,
        selectedTime: normalizedTime,
        estimatedDuration,
      });

    if (confirmedConflict) {
      return res.status(409).json({
        success: false,
        message:
          "This staff member is no longer available for the selected time",
      });
    }

    

    /*
     * Atomically consume the hold.
     * If two identical confirmation requests arrive together,
     * only one request can successfully delete and use the hold.
     */
    consumedHold = await BookingHold.findOneAndDelete({
      _id: holdId,
      customer: customerId,
      expiresAt: {
        $gt: new Date(),
      },
    });

    if (!consumedHold) {
      return res.status(409).json({
        success: false,
        message:
          "The booking slot is no longer reserved. Please select it again.",
      });
    }

    const isOnlinePayment =
      paymentDetails.paymentOption !== "salon";

    const transactionReference = isOnlinePayment
      ? `SIM-${crypto
          .randomUUID()
          .replace(/-/g, "")
          .slice(0, 16)
          .toUpperCase()}`
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
      },

      selectedDate: normalizedDate,
      selectedTime: normalizedTime,
      estimatedDuration,

      bookingType: paymentDetails.bookingType,
      totalAmount: paymentDetails.totalAmount,

      paymentOption: paymentDetails.paymentOption,
      paymentMethod: paymentDetails.paymentMethod,

      advancePercentage:
        paymentDetails.advancePercentage,

      advancePayment: paymentDetails.advancePayment,
      amountPaid: paymentDetails.amountPaid,
      balancePayment: paymentDetails.balancePayment,

      paymentRequired: paymentDetails.paymentRequired,
      paymentStatus: paymentDetails.paymentStatus,
      paymentVerified: paymentDetails.paymentVerified,

      paymentVerifiedAt: paymentDetails.paymentVerified
        ? new Date()
        : null,

      stripePaymentIntentId: paymentIntentId || null,
      transactionReference,
      status: "Confirmed",
    });

    
    // New: send a booking confirmation email. Wrapped internally so
    // any email failure can't affect this response.
    await sendBookingEmail({ customerId, booking });

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
        amountPaid: booking.amountPaid,
        balancePayment: booking.balancePayment,
        paymentStatus: booking.paymentStatus,
        transactionReference: booking.transactionReference,
      },
    });
  } catch (error) {
    console.error("Booking creation error:", error);

    /*
     * Restore the consumed hold when booking creation unexpectedly fails
     * and the original expiry time has not yet passed.
     */
    if (
      consumedHold &&
      consumedHold.expiresAt.getTime() > Date.now()
    ) {
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
        console.error(
          "Unable to restore booking hold:",
          restoreError
        );
      }
    }

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "This booking slot is already reserved or booked",
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

// New: needed so the Bookings screen has a real data source. Returns
// everything for this customer, newest first; each booking gets an
// isPast flag computed from its date+time so the app can split them
// into Upcoming/Past tabs.
const getMyBookings = async (req, res) => {
  try {
    const customerId = getCustomerId(req);

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "Customer authentication is required",
      });
    }

    const bookings = await Booking.find({ customer: customerId })
      .sort({ selectedDate: -1, createdAt: -1 })
      .lean();

    const now = Date.now();

    const withComputedTiming = bookings.map((booking) => {
      let isPast = true;

      try {
        const bookingDateTime = getBookingDateTime(
          booking.selectedDate,
          booking.selectedTime
        );
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

      if (booking.status === "Cancelled") {
        isPast = true;
      }

      const effectiveStatus =
        booking.status === "Confirmed" && isPast
          ? "Awaiting Confirmation"
          : booking.status;

      return { ...booking, isPast, effectiveStatus };
    });

    return res.status(200).json({
      success: true,
      bookings: withComputedTiming,
    });
  } catch (error) {
    console.error("Get my bookings error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load bookings",
    });
  }
};

/* -------------------------------------------------------------------------- */
/*                    Cancel an already-confirmed booking                     */
/* -------------------------------------------------------------------------- */

// New: separate from cancelBookingHold above, which only releases a
// temporary hold before a booking exists. This cancels a booking that
// has already been confirmed and saved — what the Bookings screen's
// "Cancel" button needs.
const cancelBooking = async (req, res) => {
  try {
    const customerId = getCustomerId(req);
    const { bookingId } = req.params;

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "Customer authentication is required",
      });
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      customer: customerId,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "This booking has already been cancelled",
      });
    }

    if (booking.status === "Completed") {
      return res.status(400).json({
        success: false,
        message: "Completed bookings cannot be cancelled",
      });
    }

    booking.status = "Cancelled";
    await booking.save();

    return res.status(200).json({
      success: true,
      message: "Booking cancelled",
      booking,
    });
  } catch (error) {
    console.error("Cancel booking error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to cancel the booking",
    });
  }
};

/* -------------------------------------------------------------------------- */
/*                         Reschedule an existing booking                     */
/* -------------------------------------------------------------------------- */

// New: reuses the same hold system as the original booking flow.
// Expected client flow:
//   1. Customer picks a new date/time for the SAME staff member
//      (staff and services stay the same — only date/time change).
//   2. Client calls POST /hold (createBookingHold, already existing)
//      with that staffId/date/time/duration to temporarily reserve it,
//      passing excludeBookingId so it never conflicts with its own
//      current slot.
//   3. Client calls this endpoint with { holdId } to atomically move
//      the existing booking to the held slot.
const rescheduleBooking = async (req, res) => {
  let consumedHold = null;

  try {
    const customerId = getCustomerId(req);
    const { bookingId } = req.params;
    const { holdId } = req.body;

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "Customer authentication is required",
      });
    }

    if (!holdId) {
      return res.status(400).json({
        success: false,
        message: "A valid temporary hold on the new time is required",
      });
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      customer: customerId,
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled bookings cannot be rescheduled",
      });
    }

    if (booking.status === "Completed") {
      return res.status(400).json({
        success: false,
        message: "Completed bookings cannot be rescheduled",
      });
    }

    const hold = await BookingHold.findOne({
      _id: holdId,
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

    // New: block "rescheduling" to the exact same date/time the
    // booking already has. The booking being moved is deliberately
    // excluded from the conflict search below (so it doesn't block
    // against its own current slot) — but that means picking the
    // identical slot again would otherwise find zero conflicts and
    // silently "succeed", adding a pointless reschedule history entry
    // and mislabeling an unchanged booking as "Rescheduled".
    if (
      hold.selectedDate === booking.selectedDate &&
      normalizeBookingTime(hold.selectedTime) ===
        normalizeBookingTime(booking.selectedTime)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This is already your current appointment time. Please choose a different date or time.",
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

    consumedHold = await BookingHold.findOneAndDelete({
      _id: holdId,
      customer: customerId,
      expiresAt: { $gt: new Date() },
    });

    if (!consumedHold) {
      return res.status(409).json({
        success: false,
        message: "The reserved time is no longer available. Please select it again.",
      });
    }

    // New: keep a record of what this booking's date/time was before
    // this reschedule, for dispute resolution / support / policy
    // enforcement later. Purely additive — an array that only ever
    // gets appended to, never mutated.
    const previousDate = booking.selectedDate;
    const previousTime = booking.selectedTime;

    booking.rescheduleHistory = booking.rescheduleHistory || [];
    booking.rescheduleHistory.push({
      previousDate: booking.selectedDate,
      previousTime: booking.selectedTime,
      rescheduledAt: new Date(),
    });

    booking.selectedDate = consumedHold.selectedDate;
    booking.selectedTime = consumedHold.selectedTime;
    await booking.save();

    // New: send a reschedule notification email with the old and new
    // times. Wrapped internally so any email failure can't affect
    // this response.
    await sendBookingEmail({
      customerId,
      booking,
      isReschedule: true,
      previousDate,
      previousTime,
    });

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

    return res.status(500).json({
      success: false,
      message: "Unable to reschedule the booking",
    });
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
};