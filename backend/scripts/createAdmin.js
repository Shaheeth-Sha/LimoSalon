/**
 * One-off CLI tool to create the salon's single admin account.
 *
 * There's no admin signup screen (by design — see Admin.js) so this
 * is how the very first (and normally only) admin login gets
 * created. Mirrors setStaffCredentials.js's shape/conventions.
 *
 * Usage (run from the backend/ folder):
 *   node scripts/createAdmin.js <fullName> <email> <username> <password>
 *
 * Example:
 *   node scripts/createAdmin.js "Nadeesha Perera" admin@limosalon.com admin MyStrongPass123
 *
 * Re-running this with a different password for the same email
 * updates that admin's credentials in place (e.g. to reset a
 * forgotten password by hand) instead of erroring on a duplicate.
 */

require("dotenv").config();
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const connectDB = require("../config/db");
const Admin = require("../models/Admin");

const run = async () => {
  const [, , fullName, email, username, password] = process.argv;

  if (!fullName || !email || !username || !password) {
    console.error(
      'Usage: node scripts/createAdmin.js "<fullName>" <email> <username> <password>'
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
  const normalizedUsername = username.trim();

  await connectDB();

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const existing = await Admin.findOne({ email: normalizedEmail });

    if (existing) {
      existing.fullName = fullName;
      existing.username = normalizedUsername;
      existing.password = passwordHash;
      await existing.save();

      console.log(`Updated existing admin account for ${normalizedEmail}.`);
      return;
    }

    const usernameTaken = await Admin.findOne({ username: normalizedUsername });

    if (usernameTaken) {
      console.error(`Username "${normalizedUsername}" is already taken by ${usernameTaken.email}.`);
      process.exitCode = 1;
      return;
    }

    await Admin.create({
      fullName,
      email: normalizedEmail,
      username: normalizedUsername,
      password: passwordHash,
    });

    console.log(`Admin account created — log in with username "${normalizedUsername}" or email "${normalizedEmail}".`);
  } finally {
    await mongoose.connection.close();
  }
};

run().catch((error) => {
  console.error("Failed to create admin account:", error);
  process.exitCode = 1;
});
