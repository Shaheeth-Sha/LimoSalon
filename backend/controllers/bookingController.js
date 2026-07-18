const crypto = require("crypto");

const Booking = require("../models/Booking");
const BookingHold = require("../models/BookingHold");

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

const escapeRegex = (value) => {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const getCustomerId = (req) => {
  return req.customer?._id || req.customer?.id || null;
};

const containsBridalService = (services, bookingType) => {
  const normalizedBookingType = String(bookingType || "")
    .trim()
    .toLowerCase();

  if (normalizedBookingType === "bridal") {
    return true;
  }

  if (!services) {
    return false;
  }

  try {
    return JSON.stringify(services)
      .toLowerCase()
      .includes("bridal");
  } catch {
    return String(services)
      .toLowerCase()
      .includes("bridal");
  }
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

const bookingsOverlap = ({
  requestedStart,
  requestedDuration,
  existingStart,
  existingDuration,
}) => {
  const requestedStartMinutes = timeToMinutes(requestedStart);
  const existingStartMinutes = timeToMinutes(existingStart);

  const safeRequestedDuration = Math.max(
    Number(requestedDuration) || 0,
    1
  );

  const safeExistingDuration = Math.max(
    Number(existingDuration) || 0,
    1
  );

  const requestedEndMinutes =
    requestedStartMinutes + safeRequestedDuration;

  const existingEndMinutes =
    existingStartMinutes + safeExistingDuration;

    if(requestedEndMinutes > 1440){
    return false;
}

if(existingEndMinutes > 1440){
    return false;
}

  return (
    requestedStartMinutes < existingEndMinutes &&
    existingStartMinutes < requestedEndMinutes
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
}) => {
  const existingBookings = await Booking.find({
    "staff.staffId": staffId,
    selectedDate: {
      $regex: `^${escapeRegex(selectedDate)}`,
    },
    status: {
      $nin: ["Cancelled"],
    },
  })
    .select("selectedTime estimatedDuration status")
    .lean();

  return (
    existingBookings.find((booking) =>
      bookingsOverlap({
        requestedStart: selectedTime,
        requestedDuration: estimatedDuration,
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
  const query = {
    staffId,
    selectedDate,
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
        requestedStart: selectedTime,
        requestedDuration: estimatedDuration,
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
}) => {
  const total = Number(totalAmount);

  if (!Number.isFinite(total) || total <= 0) {
    throw new Error("A valid total amount is required");
  }

  const isBridal = containsBridalService(
    services,
    bookingType
  );

  const normalizedBookingType = isBridal
    ? "bridal"
    : "hair";

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

  if (paymentOption === "advance") {
    advancePayment = roundMoney(total * advanceRate);
    amountPaid = advancePayment;
    balancePayment = roundMoney(total - advancePayment);
    paymentStatus = "Partially Paid";
    paymentMethod = requestedPaymentMethod || "Credit/Debit Card";
    paymentRequired = true;
    paymentVerified = false;
  }

  if (paymentOption === "full") {
    amountPaid = 0;
    balancePayment = roundMoney(total);
    paymentStatus = "Pending";
    paymentMethod =  requestedPaymentMethod || "Credit/Debit Card";
    paymentRequired = true;
    paymentVerified = false;
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
      } catch {
        isPast = true;
      }

      if (booking.status === "Cancelled") {
        isPast = true;
      }

      return { ...booking, isPast };
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

module.exports = {
  createBooking,
  createBookingHold,
  cancelBookingHold,
  getBookingAvailability,
  getMyBookings,
  cancelBooking,
};