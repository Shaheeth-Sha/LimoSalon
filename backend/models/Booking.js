const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },

    services: [
      {
        serviceId: {
          type: String,
          required: true,
        },

        name: {
          type: String,
          required: true,
          trim: true,
        },

        price: {
          type: Number,
          required: true,
          min: 0,
        },

        duration: {
          type: Number,
          default: 0,
          min: 0,
        },

        durationText: {
          type: String,
          default: "",
        },
      },
    ],

    hairLength: {
      hairLengthId: {
        type: String,
        default: "",
      },

      name: {
        type: String,
        default: "",
      },

      description: {
        type: String,
        default: "",
      },

      extraPrice: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    staff: {
      staffId: {
        type: String,
        default: "",
      },

      name: {
        type: String,
        default: "",
      },

      role: {
        type: String,
        default: "",
      },
    },

    selectedDate: {
      type: String,
      required: true,
    },

    selectedTime: {
      type: String,
      required: true,
    },

    estimatedDuration: {
      type: Number,
      default: 0,
      min: 0,
    },

    bookingType: {
      type: String,
      enum: ["hair", "bridal", "face", "body", "nail"],
      default: "hair",
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentOption: {
      type: String,
      enum: ["advance", "full", "salon"],
      default: "salon",
    },

    paymentMethod: {
      type: String,
      enum: [
        "Credit/Debit Card",
        "Stripe",
        "Pay at Salon",
      ],
      default: "Pay at Salon",
    },

    advancePercentage: {
      type: Number,
      default: 0,
      enum: [0, 10, 20],
    },

    advancePayment: {
      type: Number,
      default: 0,
      min: 0,
    },

    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },

    balancePayment: {
      type: Number,
      default: 0,
      min: 0,
    },

    paymentRequired: {
      type: Boolean,
      default: false,
    },

    paymentStatus: {
      type: String,
      enum: [
        "Pending",
        "Partially Paid",
        "Paid",
        "Failed",
        "Refunded",
      ],
      default: "Pending",
    },

    paymentVerified: {
      type: Boolean,
      default: false,
    },

    paymentVerifiedAt: {
      type: Date,
      default: null,
    },

    stripePaymentIntentId: {
      type: String,
      default: null,
    },

    transactionReference: {
      type: String,
      default: null,
    },

      reminderOneHourSent: {
      type: Boolean,
      default: false,
    },
 
    reminderThirtyMinSent: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: [
        "Pending",
        "Confirmed",
        "Completed",
        "Cancelled",
      ],
      // Real-world flow: a booking starts as Pending until the
      // assigned staff member explicitly confirms it (see
      // staffScheduleController.js's updateBookingStatus). Was
      // "Confirmed" — every booking used to auto-confirm itself with
      // no staff review step at all.
      default: "Pending",
    },

    // New: records what this booking's date/time was each time it
    // gets rescheduled, for dispute resolution, support lookups, and
    // any future reschedule-limit policy. Purely additive — only
    // ever appended to by rescheduleBooking in the controller, never
    // read or required anywhere else, so it can't break anything
    // existing.
    rescheduleHistory: {
      type: [
        {
          previousDate: String,
          previousTime: String,
          // "event" (default, for every pre-existing entry) or
          // "trial" — lets a bridal booking's reschedule history tell
          // the two kinds of reschedule apart instead of conflating a
          // trial-slot move with a main-event move.
          kind: {
            type: String,
            enum: ["event", "trial"],
            default: "event",
          },
          rescheduledAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },

    // New: bridal-only trial makeup add-on, collected by the
    // trialMakeup.tsx / trialMakeupDate.tsx / additionalNotes.tsx
    // mini-flow inserted between staff selection and confirm.tsx.
    // Left at their defaults for every other booking type.
    wantsTrialMakeup: {
      type: Boolean,
      default: false,
    },

    trialMakeupDate: {
      type: String,
      default: "",
    },

    trialMakeupTime: {
      type: String,
      default: "",
    },

    notes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 200,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Booking", bookingSchema);











