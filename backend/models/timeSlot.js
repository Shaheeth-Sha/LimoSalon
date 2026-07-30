const mongoose = require("mongoose");

// Stores the salon's offerable time window per booking-type family.
// Currently only two rows ever exist: "bridal" and "default" (the
// latter covers hair/face/body — they share one window today, but
// keeping bookingType as a free string rather than a fixed enum
// means a future admin screen could split face/body/hair into their
// own separate windows later without a schema migration.
const timeSlotConfigSchema = new mongoose.Schema(
  {
    bookingType: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    // Minutes since midnight, e.g. 8:00 am = 480, 6:00 pm = 1080.
    startMinutes: {
      type: Number,
      required: true,
      min: 0,
      max: 1439,
    },

    endMinutes: {
      type: Number,
      required: true,
      min: 1,
      max: 1440,
    },

    // Spacing between offered slots. 60 = hourly, matching the
    // current fixed list; admin can later shorten this to e.g. 30
    // for more granular booking without any app update.
    intervalMinutes: {
      type: Number,
      required: true,
      default: 60,
      min: 5,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TimeSlotConfig", timeSlotConfigSchema);