
const mongoose = require("mongoose");

const emailOtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    otp: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: [
        "registration",
        "payment",
        "password-reset",
        // Staff-portal login's own password reset — kept distinct
        // from the customer "password-reset" purpose so a customer
        // and a staff member who happen to share an email can never
        // consume/interfere with each other's reset token.
        "staff-password-reset",
      ],
      default: "registration",
    },
    verified: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("EmailOtp", emailOtpSchema);