const mongoose = require("mongoose");

// The salon's single admin/owner account. Deliberately not a
// multi-user/role system — the web-admin screens show one "Admin"
// identity with no user-management UI, so a single document is the
// honest model for what's actually being built. If multi-admin
// access is ever needed, this can grow a role field later without
// breaking anything that already depends on it.
const adminSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // Bcrypt hash — never the plain password.
    password: {
      type: String,
      required: true,
    },

    // Forgot-password flow (web, so a clicked email LINK rather than
    // an entered OTP code is the natural pattern — see
    // adminAuthController.js). Only the SHA-256 hash of the raw token
    // is ever stored, same reasoning as never storing a plaintext
    // password: a database read alone can never hand out a usable
    // reset link.
    resetPasswordTokenHash: {
      type: String,
      default: null,
    },

    resetPasswordExpires: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Admin", adminSchema);
