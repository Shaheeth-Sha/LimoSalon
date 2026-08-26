const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    name: {
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
      unique: true,
      sparse: true, // allows many docs with no phone (Google users) without unique-conflicting
      trim: true,
      required: function () {
        return this.authProvider !== "google";
      },
    },

    password: {
      type: String,
      required: function () {
        return this.authProvider !== "google";
      },
    },

    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    phoneVerified: {
      type: Boolean,
      default: false,
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    // Server-relative path to an uploaded profile photo (e.g.
    // "/uploads/avatars/xxxx.jpg"), set via PUT
    // /api/customers/profile/photo — see backend/utils/avatarStorage.js.
    // Blank means "no photo, show initials instead" on the client.
    avatar: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Customer", customerSchema);