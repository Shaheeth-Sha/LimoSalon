const mongoose = require("mongoose");

const staffSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    experience: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    image: { type: String, default: "" },
    available: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Staff", staffSchema);