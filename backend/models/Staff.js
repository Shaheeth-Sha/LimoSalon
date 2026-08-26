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

    // New: staff-portal login. Optional/sparse because every existing
    // Staff record was created directly (e.g. in Atlas) purely as a
    // display profile for the customer app's staff picker, with no
    // login of its own — those records simply have no email/password
    // until credentials are provisioned for them (see
    // backend/scripts/setStaffCredentials.js). unique+sparse lets many
    // documents share an unset email without a duplicate-key clash.
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    // Bcrypt hash — never the plain password. Absent (undefined) for
    // staff who don't have portal access yet; loginStaff treats that
    // the same as "no such account" rather than letting a blank
    // compare accidentally succeed.
    password: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Staff", staffSchema);