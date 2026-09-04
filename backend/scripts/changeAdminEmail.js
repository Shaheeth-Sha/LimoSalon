/**
 * One-off CLI tool to change the salon's admin login email.
 *
 * There's no "change email" admin-signup-style flow outside the app
 * itself (Settings → Profile settings does this too, once you can
 * log in) — this script exists as a terminal fallback, e.g. while
 * still troubleshooting login. Mirrors createAdmin.js's shape.
 *
 * Usage (run from the backend/ folder):
 *   node scripts/changeAdminEmail.js <current-email-or-username> <new-email>
 *
 * Example:
 *   node scripts/changeAdminEmail.js admin shaheeth2004@gmail.com
 */

require("dotenv").config();
const mongoose = require("mongoose");

const connectDB = require("../config/db");
const Admin = require("../models/Admin");

const run = async () => {
  const [, , currentIdentifier, newEmail] = process.argv;

  if (!currentIdentifier || !newEmail) {
    console.error(
      "Usage: node scripts/changeAdminEmail.js <current-email-or-username> <new-email>"
    );
    process.exitCode = 1;
    return;
  }

  const normalizedIdentifier = currentIdentifier.toLowerCase().trim();
  const normalizedNewEmail = newEmail.toLowerCase().trim();

  await connectDB();

  try {
    const admin = await Admin.findOne({
      $or: [{ email: normalizedIdentifier }, { username: normalizedIdentifier }],
    });

    if (!admin) {
      console.error(`No admin account found for "${currentIdentifier}".`);
      process.exitCode = 1;
      return;
    }

    if (admin.email === normalizedNewEmail) {
      console.log(`Admin account already uses ${normalizedNewEmail}. Nothing to change.`);
      return;
    }

    const emailTaken = await Admin.findOne({
      email: normalizedNewEmail,
      _id: { $ne: admin._id },
    });

    if (emailTaken) {
      console.error(`Email "${normalizedNewEmail}" is already used by another admin account.`);
      process.exitCode = 1;
      return;
    }

    const oldEmail = admin.email;
    admin.email = normalizedNewEmail;
    await admin.save();

    console.log(`Updated admin email: ${oldEmail} -> ${normalizedNewEmail}. Log in with username "${admin.username}" or the new email.`);
  } finally {
    await mongoose.connection.close();
  }
};

run().catch((error) => {
  console.error("Failed to change admin email:", error);
  process.exitCode = 1;
});
