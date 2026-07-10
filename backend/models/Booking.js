const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    services: [
      {
        serviceId: String,
        name: String,
        price: Number,
        duration: Number,
        durationText: String,
      },
    ],

    hairLength: {
      hairLengthId: String,
      name: String,
      description: String,
      extraPrice: Number,
    },

    staff: {
      staffId: String,
      name: String,
      role: String,
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
    },

    totalAmount: {
      type: Number,
      required: true,
    },

    advancePayment: {
      type: Number,
      default: 0,
    },

    paymentRequired: {
      type: Boolean,
      default: false,
    },

    paymentStatus: {
      type: String,
      default: "Pending",
    },

    bookingType: {
      type: String,
      default: "hair",
    },

    status: {
      type: String,
      default: "Confirmed",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);