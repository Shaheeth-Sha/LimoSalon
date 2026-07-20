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
      enum: ["hair", "bridal", "face", "body"],
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

    status: {
      type: String,
      enum: [
        "Pending",
        "Confirmed",
        "Completed",
        "Cancelled",
      ],
      default: "Confirmed",
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
          rescheduledAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Booking", bookingSchema);











