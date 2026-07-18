const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
{
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
  },

  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking",
    required: false,
  },

  stripePaymentIntentId: {
    type: String,
    required: true,
  },

  amount: {
    type: Number,
    required: true,
  },

  currency: {
    type: String,
    default: "lkr",
  },

  status: {
    type: String,
    enum: [
      "pending",
      "paid",
      "failed",
    ],
    default: "pending",
  },
},
{
  timestamps: true,
}
);


module.exports = mongoose.model(
  "Payment",
  paymentSchema
);