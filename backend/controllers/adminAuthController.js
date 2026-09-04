const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const Admin = require("../models/Admin");
const sendEmail = require("../utils/sendEmail");

// Mirrors customerController.js/staffAuthController.js's
// generateToken pattern, stamped with role: "admin" — see
// adminAuthMiddleware.js.
const generateAdminToken = (id) => {
  return jwt.sign({ id, role: "admin" }, process.env.JWT_SECRET || "limosalon_secret", {
    expiresIn: "7d",
  });
};

const toSafeAdmin = (admin) => ({
  id: admin._id,
  fullName: admin.fullName,
  email: admin.email,
  phone: admin.phone || "",
  username: admin.username,
});

/* =========================
   LOGIN
========================= */
const loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username/email and password are required",
      });
    }

    const normalized = String(username).toLowerCase().trim();

    // Accept either the admin's username or their email in the same
    // field — the login screen just has one "Email"/identifier box,
    // and there's only ever one admin account, so there's no reason
    // to make them remember which one they used.
    const admin = await Admin.findOne({
      $or: [{ username: normalized }, { email: normalized }],
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Login successful",
      admin: toSafeAdmin(admin),
      token: generateAdminToken(admin._id),
    });
  } catch (error) {
    console.error("Admin login error:", error);

    return res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
};

/* =========================
   FORGOT PASSWORD — email a reset LINK
   (web flow, not the mobile apps' OTP-code flow: "Check Your
   E-mail" -> the emailed link opens Reset Password directly with
   the token in the URL, no code to type in)
========================= */
const forgotAdminPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const admin = await Admin.findOne({ email: normalizedEmail });

    // Always report success, whether or not the email matches — same
    // "can't be used to probe which accounts exist" reasoning as the
    // customer/staff forgot-password endpoints.
    if (!admin) {
      return res.status(200).json({
        success: true,
        message: "If that email has an admin account, a reset link has been sent.",
      });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    admin.resetPasswordTokenHash = tokenHash;
    admin.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    await admin.save();

    const webUrl = process.env.ADMIN_WEB_URL || "http://localhost:5173";
    const resetLink = `${webUrl}/reset-password/${rawToken}`;

    await sendEmail({
      to: normalizedEmail,
      subject: "LimoSalon Admin Password Reset",
      html: `
        <h2>Reset your LimoSalon admin password</h2>
        <p>We received a request to reset your admin password. Click the link below to choose a new one:</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>This link expires in 30 minutes. If you didn't request this, you can safely ignore this email.</p>
      `,
    });

    return res.status(200).json({
      success: true,
      message: "If that email has an admin account, a reset link has been sent.",
    });
  } catch (error) {
    console.error("Admin forgot password error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to process password reset request",
      error: error.message,
    });
  }
};

/* =========================
   RESET PASSWORD — token from the emailed link
========================= */
const resetAdminPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword, confirmPassword } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Reset token is required",
      });
    }

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirmation are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const admin = await Admin.findOne({
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!admin) {
      return res.status(400).json({
        success: false,
        message: "This reset link is invalid or has expired. Please request a new one.",
      });
    }

    admin.password = await bcrypt.hash(newPassword, 10);
    admin.resetPasswordTokenHash = null;
    admin.resetPasswordExpires = null;
    await admin.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Admin reset password error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to reset password",
      error: error.message,
    });
  }
};

/* =========================
   VALIDATE RESET TOKEN
   (lets the Reset Password screen show "this link expired" up
   front, before the admin fills out the form and submits)
========================= */
const validateAdminResetToken = async (req, res) => {
  try {
    const { token } = req.params;
    const tokenHash = crypto.createHash("sha256").update(token || "").digest("hex");

    const admin = await Admin.findOne({
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpires: { $gt: new Date() },
    });

    return res.status(200).json({ success: true, valid: !!admin });
  } catch (error) {
    return res.status(500).json({ success: false, valid: false });
  }
};

/* =========================
   PROFILE — "Profile Setting" screen
========================= */
const getAdminProfile = async (req, res) => {
  return res.status(200).json({
    success: true,
    admin: toSafeAdmin(req.admin),
  });
};

const updateAdminProfile = async (req, res) => {
  try {
    const { fullName, email, phone } = req.body;
    const admin = req.admin; // set by protectAdmin

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Full name is required",
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (normalizedEmail !== admin.email) {
      const emailTaken = await Admin.findOne({
        email: normalizedEmail,
        _id: { $ne: admin._id },
      });

      if (emailTaken) {
        return res.status(400).json({
          success: false,
          message: "That email is already in use",
        });
      }
    }

    admin.fullName = fullName.trim();
    admin.email = normalizedEmail;

    if (typeof phone === "string") {
      admin.phone = phone.trim();
    }

    await admin.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      admin: toSafeAdmin(admin),
    });
  } catch (error) {
    console.error("Update admin profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message,
    });
  }
};

/* =========================
   ACCOUNT SETTINGS — username + password change
========================= */
const updateAdminAccount = async (req, res) => {
  try {
    const { username, oldPassword, newPassword, confirmNewPassword } = req.body;
    const admin = req.admin; // set by protectAdmin

    if (!username || !username.trim()) {
      return res.status(400).json({
        success: false,
        message: "Username is required",
      });
    }

    const normalizedUsername = username.trim();
    const wantsPasswordChange = !!(oldPassword || newPassword || confirmNewPassword);

    if (normalizedUsername !== admin.username) {
      const usernameTaken = await Admin.findOne({
        username: normalizedUsername,
        _id: { $ne: admin._id },
      });

      if (usernameTaken) {
        return res.status(400).json({
          success: false,
          message: "That username is already in use",
        });
      }
    }

    if (wantsPasswordChange) {
      if (!oldPassword || !newPassword || !confirmNewPassword) {
        return res.status(400).json({
          success: false,
          message: "Current password, new password and confirmation are all required to change your password",
        });
      }

      // Never allow a password change without verifying the current
      // one first — without this, anyone with a still-open/stolen
      // admin session could lock the real owner out just by knowing
      // the username, which is public in the login form's own field.
      const isMatch = await bcrypt.compare(oldPassword, admin.password);

      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      if (newPassword !== confirmNewPassword) {
        return res.status(400).json({
          success: false,
          message: "New passwords do not match",
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "New password must be at least 6 characters",
        });
      }

      admin.password = await bcrypt.hash(newPassword, 10);
    }

    admin.username = normalizedUsername;
    await admin.save();

    return res.status(200).json({
      success: true,
      message: "Account settings updated successfully",
      admin: toSafeAdmin(admin),
    });
  } catch (error) {
    console.error("Update admin account error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update account settings",
      error: error.message,
    });
  }
};

module.exports = {
  loginAdmin,
  forgotAdminPassword,
  resetAdminPassword,
  validateAdminResetToken,
  getAdminProfile,
  updateAdminProfile,
  updateAdminAccount,
};
