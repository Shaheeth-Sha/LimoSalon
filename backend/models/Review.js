const mongoose = require("mongoose");

// One review per booking — a customer can only rate a service they
// actually had, and only after it's marked Completed (enforced in
// reviewController.js, not here). staffId is a plain String snapshot
// (mirrors Booking.staff.staffId, which is itself the Staff
// document's own _id.toString()) so review queries can filter the
// same way staffScheduleController.js already filters bookings,
// without an extra populate.
const reviewSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true,
      index: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },

    staffId: {
      type: String,
      required: true,
      index: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    comment: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Review", reviewSchema);
