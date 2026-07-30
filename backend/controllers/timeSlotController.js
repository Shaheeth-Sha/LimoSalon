const TimeSlotConfig = require("../models/timeSlot");

// Seed values used only the very first time a config row doesn't
// exist yet for a given type — from then on, the DB row (editable by
// admin later) is the single source of truth, not this object.
const DEFAULT_CONFIGS = {
  bridal: {
    startMinutes: 4 * 60, // 4:00 am
    endMinutes: 22 * 60, // 10:00 pm
    intervalMinutes: 60,
  },
  default: {
    startMinutes: 8 * 60, // 8:00 am
    endMinutes: 18 * 60, // 6:00 pm
    intervalMinutes: 60,
  },
};

// Formats minutes-since-midnight as "08.00 am" / "12.00 pm" — the
// exact format the app already parses everywhere else (dateTime.tsx,
// bookingController.js's normalizeBookingTime), so no other code
// needs to change to consume this.
const minutesToDisplay = (totalMinutes) => {
  const hour24 = Math.floor(totalMinutes / 60) % 24;
  const minute = totalMinutes % 60;
  const period = hour24 >= 12 ? "pm" : "am";

  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;

  const hh = String(hour12).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");

  return `${hh}.${mm} ${period}`;
};

const generateTimes = (startMinutes, endMinutes, intervalMinutes) => {
  const times = [];

  for (
    let minute = startMinutes;
    minute <= endMinutes;
    minute += intervalMinutes
  ) {
    times.push(minutesToDisplay(minute));
  }

  return times;
};

// Every booking type except "bridal" shares the same "default"
// window today. If face/body/hair ever need their own separate
// hours, this is the only place that needs to change — add their
// own keys to DEFAULT_CONFIGS and stop folding them into "default"
// here.
const resolveConfigKey = (bookingType) => {
  const normalized = String(bookingType || "").trim().toLowerCase();
  return normalized === "bridal" ? "bridal" : "default";
};

const getOrCreateConfig = async (configKey) => {
  let config = await TimeSlotConfig.findOne({ bookingType: configKey });

  if (!config) {
    const fallback = DEFAULT_CONFIGS[configKey] || DEFAULT_CONFIGS.default;

    config = await TimeSlotConfig.create({
      bookingType: configKey,
      ...fallback,
    });
  }

  return config;
};

/* -------------------------------------------------------------------------- */
/*                    Customer-facing: get the offered times                  */
/* -------------------------------------------------------------------------- */

const getAvailableTimes = async (req, res) => {
  try {
    const configKey = resolveConfigKey(req.query.bookingType);
    const config = await getOrCreateConfig(configKey);

    const times = generateTimes(
      config.startMinutes,
      config.endMinutes,
      config.intervalMinutes
    );

    return res.status(200).json({
      success: true,
      bookingType: configKey,
      startMinutes: config.startMinutes,
      endMinutes: config.endMinutes,
      intervalMinutes: config.intervalMinutes,
      times,
    });
  } catch (error) {
    console.error("Get available times error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load available times",
    });
  }
};

/* -------------------------------------------------------------------------- */
/*                   Admin-only: edit the business-hours window              */
/* -------------------------------------------------------------------------- */

// NOTE: this route is intentionally left without an admin-auth guard
// wired in here, since that middleware isn't visible in this file —
// mount this behind whatever your admin equivalent of
// `protectCustomer` is called before shipping (see timeSlotRoutes.js
// for exactly where to add it).
const updateTimeConfig = async (req, res) => {
  try {
    const configKey = resolveConfigKey(req.params.bookingType);
    const { startMinutes, endMinutes, intervalMinutes } = req.body;

    const parsedStart = Number(startMinutes);
    const parsedEnd = Number(endMinutes);
    const parsedInterval = Number(intervalMinutes);

    const isValid =
      Number.isFinite(parsedStart) &&
      Number.isFinite(parsedEnd) &&
      Number.isFinite(parsedInterval) &&
      parsedStart >= 0 &&
      parsedEnd <= 1440 &&
      parsedStart < parsedEnd &&
      parsedInterval > 0;

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message:
          "startMinutes, endMinutes, and intervalMinutes must form a valid time window",
      });
    }

    const config = await TimeSlotConfig.findOneAndUpdate(
      { bookingType: configKey },
      {
        bookingType: configKey,
        startMinutes: parsedStart,
        endMinutes: parsedEnd,
        intervalMinutes: parsedInterval,
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Time settings updated",
      config,
    });
  } catch (error) {
    console.error("Update time config error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update time settings",
    });
  }
};

module.exports = {
  getAvailableTimes,
  updateTimeConfig,
};