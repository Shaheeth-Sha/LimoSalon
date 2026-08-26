const Booking = require("../models/Booking");
const Customer = require("../models/Customer");
const sendEmail = require("../utils/sendEmail");
const { createNotification } = require("../controllers/notificationController");
const { getBookingDateTime } = require("../controllers/bookingController");

// How often to check for upcoming appointments needing a reminder.
// 5 minutes is frequent enough to catch both reminder windows
// reliably without hammering the database.
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

// Each window is generous enough to guarantee it's caught by at
// least one check cycle even if the exact minute is missed between
// runs, but narrow enough that a booking won't accidentally match
// both the "around 1 hour" and "around 30 minutes" windows in the
// same run.
const ONE_HOUR_WINDOW = { min: 50, max: 65 };
const THIRTY_MIN_WINDOW = { min: 20, max: 35 };

const buildReminderEmailHtml = ({ customerName, booking, minutesLabel }) => {
  const serviceNames = (booking.services || [])
    .map((service) => service.name)
    .filter(Boolean)
    .join(", ");

  return `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#111;">
      <h2 style="color:#FF2D75;">Your Appointment is Coming Up</h2>
      <p>Hi ${customerName || "there"},</p>
      <p>Just a reminder — your appointment is in about <strong>${minutesLabel}</strong>.</p>
      <p><strong>Service:</strong> ${serviceNames || "-"}</p>
      <p><strong>Staff:</strong> ${booking.staff?.name || "-"}</p>
      <p><strong>Date:</strong> ${booking.selectedDate}</p>
      <p><strong>Time:</strong> ${booking.selectedTime}</p>
      <p style="margin-top:24px;color:#777;font-size:13px;">See you soon at LimoSalon!</p>
    </div>
  `;
};

const sendReminder = async ({ booking, minutesLabel, flagField }) => {
  try {
    // Both the in-app notification and the email are best-effort —
    // a failure in either must never crash the whole reminder check
    // loop or stop other bookings' reminders from being processed.
    await createNotification({
      customerId: booking.customer,
      type: "appointment_reminder",
      title: "Appointment Reminder",
      message: `Your appointment is in about ${minutesLabel}.`,
      relatedBooking: booking._id,
    });

    const customer = await Customer.findById(booking.customer).select("email name").lean();

    if (customer?.email) {
      await sendEmail({
        to: customer.email,
        subject: `Reminder: Your LimoSalon appointment is in ${minutesLabel}`,
        html: buildReminderEmailHtml({
          customerName: customer.name,
          booking,
          minutesLabel,
        }),
      });
    }

    booking[flagField] = true;
    await booking.save();
  } catch (error) {
    console.error(
      `Failed to send ${minutesLabel} reminder for booking ${booking._id}:`,
      error
    );
  }
};

const checkAppointmentReminders = async () => {
  try {
    const candidates = await Booking.find({
      status: "Confirmed",
      $or: [
        { reminderOneHourSent: { $ne: true } },
        { reminderThirtyMinSent: { $ne: true } },
      ],
    });

    const now = Date.now();

    for (const booking of candidates) {
      let bookingDateTime;

      try {
        bookingDateTime = getBookingDateTime(booking.selectedDate, booking.selectedTime);
      } catch {
        // Skip a booking with unparsable date/time rather than crash
        // the whole check cycle over one bad record.
        continue;
      }

      const minutesUntil = (bookingDateTime.getTime() - now) / 60000;

      if (
        !booking.reminderOneHourSent &&
        minutesUntil >= ONE_HOUR_WINDOW.min &&
        minutesUntil <= ONE_HOUR_WINDOW.max
      ) {
        await sendReminder({
          booking,
          minutesLabel: "1 hour",
          flagField: "reminderOneHourSent",
        });
      }

      if (
        !booking.reminderThirtyMinSent &&
        minutesUntil >= THIRTY_MIN_WINDOW.min &&
        minutesUntil <= THIRTY_MIN_WINDOW.max
      ) {
        await sendReminder({
          booking,
          minutesLabel: "30 minutes",
          flagField: "reminderThirtyMinSent",
        });
      }
    }
  } catch (error) {
    console.error("Appointment reminder check failed:", error);
  }
};

// Called once from index.js on server startup. Runs the check
// immediately on boot (so a freshly-started server doesn't wait a
// full 5 minutes before the first check), then repeats on the
// interval for as long as the process stays alive.
//
// LIMITATION: this only runs while the Node process itself is
// running. On a host that spins the process down during inactivity
// (e.g. Render's free tier), no reminders fire while it's asleep —
// they'll only resume once something wakes the server back up. Fine
// for local development and demos; a production deployment on a
// tier that sleeps would need an external scheduled trigger instead.
const startReminderService = () => {
  checkAppointmentReminders();
  setInterval(checkAppointmentReminders, CHECK_INTERVAL_MS);
  console.log("Appointment reminder service started (checking every 5 minutes)");
};

module.exports = { startReminderService };