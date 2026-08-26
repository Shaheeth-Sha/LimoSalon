const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    // Who this notification is for. Kept as two optional fields rather
    // than a single polymorphic "recipient" ref so existing customer
    // notifications (and every query filtering on `customer`) keep
    // working untouched — recipientType just tells getMyNotifications
    // (customer) and getMyStaffNotifications (staff) which bucket a
    // given row belongs to.
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: function () {
        return this.recipientType !== "staff";
      },
      index: true,
    },

    // Plain String, same convention as Booking.staff.staffId — the
    // Staff document's own _id.toString(), so this can be queried the
    // same way staffScheduleController.js already queries bookings.
    staffId: {
      type: String,
      default: null,
      index: true,
    },

    recipientType: {
      type: String,
      enum: ["customer", "staff"],
      default: "customer",
    },

    type: {
      type: String,
      enum: [
        "booking_pending",
        "booking_confirmed",
        "booking_rescheduled",
        "booking_cancelled",
        "points_earned",
        "reward_claimed",
        "tier_upgraded",
        "appointment_reminder",
        // Staff-facing types — mirror the customer-facing ones above,
        // but from the staff member's point of view.
        "new_booking",
        "booking_cancelled_by_customer",
        "booking_rescheduled_by_customer",
        "new_review",
      ],
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    message: {
      type: String,
      required: true,
    },

    // Optional reference back to the booking that triggered this,
    // so the notification can eventually link/deep-link to it.
    relatedBooking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },

    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Notification", notificationSchema);