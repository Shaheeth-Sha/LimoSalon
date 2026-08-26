/**
 * One-off CLI tool to provision staff-portal login credentials.
 *
 * Every existing Staff record was created directly (e.g. in Atlas) as
 * a plain display profile for the customer app's staff picker — none
 * of them have an email/password, so none of them can log into the
 * new staff portal yet. There's no admin UI to do this from (web-admin
 * is still an empty scaffold), so until one exists, this script is
 * how you turn an existing Staff record into a portal login: it hashes
 * the password with the exact same bcrypt settings the app uses
 * (bcrypt.hash(password, 10), matching customerController.js) and
 * saves the email + hash directly onto that Staff document.
 *
 * Usage (run from the backend/ folder):
 *   node scripts/setStaffCredentials.js <staffId> <email> <password>
 *
 * <staffId> is the Staff document's Mongo _id — find it via
 * `db.staffs.find({}, {name:1})` in Atlas/compass, or by hitting
 * GET /api/staff and reading the "_id" of the person you want to set
 * up. Re-running this for the same staffId overwrites that person's
 * email/password (e.g. to reset a forgotten password by hand).
 */

require("dotenv").config();
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const connectDB = require("../config/db");
const Staff = require("../models/Staff");

const run = async () => {
  const [, , staffId, email, password] = process.argv;

  if (!staffId || !email || !password) {
    console.error(
      "Usage: node scripts/setStaffCredentials.js <staffId> <email> <password>"
    );
    process.exitCode = 1;
    return;
  }

  if (password.length < 6) {
    console.error("Password must be at least 6 characters.");
    process.exitCode = 1;
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();

  await connectDB();

  try {
    const staff = await Staff.findById(staffId);

    if (!staff) {
      console.error(`No Staff record found with _id "${staffId}".`);
      process.exitCode = 1;
      return;
    }

    const emailTaken = await Staff.findOne({
      email: normalizedEmail,
      _id: { $ne: staff._id },
    });

    if (emailTaken) {
      console.error(
        `"${normalizedEmail}" is already the login email for another staff member (${emailTaken.name}).`
      );
      process.exitCode = 1;
      return;
    }

    staff.email = normalizedEmail;
    staff.password = await bcrypt.hash(password, 10);
    await staff.save();

    console.log(
      `Done — ${staff.name} (${staff._id}) can now log into the staff portal with ${normalizedEmail}.`
    );
  } finally {
    await mongoose.connection.close();
  }
};

run().catch((error) => {
  console.error("Failed to set staff credentials:", error);
  process.exitCode = 1;
});
