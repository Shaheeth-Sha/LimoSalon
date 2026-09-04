/**
 * One-off CLI tool to change the salon's admin login password.
 *
 * Same idea as changeAdminEmail.js — a terminal fallback for
 * resetting your own password while troubleshooting login, without
 * touching your email or username. (Settings → Account settings
 * does this too, once you can log in, but that requires knowing the
 * current password first.)
 *
 * Usage (run from the backend/ folder):
 *   node scripts/changeAdminPassword.js <email-or-username> <new-password>
 *
 * Example:
 *   node scripts/changeAdminPassword.js admin sha123
 */

require("dotenv").config();
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const connectDB = require("../config/db");
const Admin = require("../models/Admin");

const run = async () => {
  const [, , identifier, newPassword] = process.argv;

  if (!identifier || !newPassword) {
    console.error("Usage: node scripts/changeAdminPassword.js <email-or-username> <new-password>");
    process.exitCode = 1;
    return;
  }

  if (newPassword.length < 6) {
    console.error("Password must be at least 6 characters.");
    process.exitCode = 1;
    return;
  }

  const normalizedIdentifier = identifier.toLowerCase().trim();

  await connectDB();

  try {
    const admin = await Admin.findOne({
      $or: [{ email: normalizedIdentifier }, { username: normalizedIdentifier }],
    });

    if (!admin) {
      console.error(`No admin account found for "${identifier}".`);
      process.exitCode = 1;
      return;
    }

    admin.password = await bcrypt.hash(newPassword, 10);
    await admin.save();

    console.log(`Password updated for admin "${admin.username}" (${admin.email}). Log in with the new password.`);
  } finally {
    await mongoose.connection.close();
  }
};

run().catch((error) => {
  console.error("Failed to change admin password:", error);
  process.exitCode = 1;
});
