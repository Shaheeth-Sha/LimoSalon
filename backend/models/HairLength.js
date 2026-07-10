const mongoose = require("mongoose");

const hairLengthSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    extraPrice: { type: Number, default: 0 },
    description: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("HairLength", hairLengthSchema);