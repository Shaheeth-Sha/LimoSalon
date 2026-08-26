const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Staff = require("../models/Staff");
const EmailOtp = require("../models/EmailOtp");
const sendEmail = require("../utils/sendEmail");
const { saveBase64Avatar, deleteAvatarFile } = require("../utils/avatarStorage");

// Mirrors customerController.js's generateToken, but stamps role:
// "staff" onto the payload — that's what lets staffAuthMiddleware
// reject a customer's own token if it's ever pointed at a staff-only
// route (see the comment there).
const generateStaffToken = (id) => {
  return jwt.sign({ id, role: "staff" }, process.env.JWT_SECRET || "limosalon_secret", {
    expiresIn: "7d",
  });
};

// Never hand back the password hash, even under "-password"-style
// select() slips elsewhere — every response goes through this.
const toSafeStaff = (staff) => ({
  id: staff._id,
  name: staff.name,
  email: staff.email || "",
  phone: staff.phone || "",
  role: staff.role,
  category: staff.category,
  experience: staff.experience,
  rating: staff.rating,
  image: staff.image,
  available: staff.available,
});

/* =========================
   LOGIN STAFF
========================= */
const loginStaff = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const staff = await Staff.findOne({ email: normalizedEmail });

    // No account, or an account that exists purely as a display
    // profile and was never given portal credentials — both look the
    // same to the caller, deliberately, so this can't be used to
    // probe which staff emails have portal access.
    if (!staff || !staff.password) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!staff.isActive) {
      return res.status(403).json({
        success: false,
        message: "This staff account has been deactivated. Please contact the salon admin.",
      });
    }

    const isMatch = await bcrypt.compare(password, staff.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Login successful",
      staff: toSafeStaff(staff),
      token: generateStaffToken(staff._id),
    });
  } catch (error) {
    console.error("Staff login error:", error);

    return res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
};

/* =========================
   STAFF PROFILE
========================= */
const getStaffProfile = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      staff: toSafeStaff(req.staff),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load profile",
      error: error.message,
    });
  }
};

const updateStaffProfile = async (req, res) => {
  try {
    const { name, phone, image } = req.body;
    const staff = req.staff; // set by protectStaff

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    staff.name = name.trim();

    if (typeof phone === "string") {
      staff.phone = phone.trim();
    }

    if (typeof image === "string") {
      staff.image = image.trim();
    }

    await staff.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      staff: toSafeStaff(staff),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message,
    });
  }
};

/* =========================
   FORGOT PASSWORD - SEND OTP
   (wired to forgot.tsx -> email.tsx -> new-password.tsx)
========================= */
const forgotStaffPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const staff = await Staff.findOne({ email: normalizedEmail });

    // Same "always say success" shape as the customer flow — this
    // endpoint can't be used to check which emails have staff accounts.
    if (!staff || !staff.password) {
      return res.status(200).json({
        success: true,
        message: "If that email has a staff account, a reset code has been sent.",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await EmailOtp.deleteMany({
      email: normalizedEmail,
      purpose: "staff-password-reset",
    });

    await EmailOtp.create({
      email: normalizedEmail,
      otp,
      purpose: "staff-password-reset",
      verified: false,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    await sendEmail({
      to: normalizedEmail,
      subject: "LimoSalon Staff Portal Password Reset",
      html: `
        <h2>Reset your LimoSalon staff portal password</h2>
        <p>Your verification code is:</p>
        <h1>${otp}</h1>
        <p>This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
      `,
    });

    return res.status(200).json({
      success: true,
      message: "If that email has a staff account, a reset code has been sent.",
    });
  } catch (error) {
    console.error("Staff forgot password error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to process password reset request",
      error: error.message,
    });
  }
};

/* =========================
   VERIFY RESET OTP
========================= */
const verifyStaffResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and code are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const record = await EmailOtp.findOne({
      email: normalizedEmail,
      otp,
      purpose: "staff-password-reset",
    });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: "Invalid code",
      });
    }

    if (record.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Code expired",
      });
    }

    record.verified = true;
    await record.save();

    return res.status(200).json({
      success: true,
      message: "Code verified",
    });
  } catch (error) {
    console.error("Verify staff reset OTP error:", error);

    return res.status(500).json({
      success: false,
      message: "Verification failed",
      error: error.message,
    });
  }
};

/* =========================
   RESET PASSWORD - VERIFY OTP + SET NEW PASSWORD
========================= */
const resetStaffPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, code and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const record = await EmailOtp.findOne({
      email: normalizedEmail,
      otp,
      purpose: "staff-password-reset",
      verified: true,
    });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: "Invalid or unverified code",
      });
    }

    if (record.expiresAt < new Date()) {
      await record.deleteOne();
      return res.status(400).json({
        success: false,
        message: "Code has expired. Please request a new one.",
      });
    }

    const staff = await Staff.findOne({ email: normalizedEmail });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    staff.password = await bcrypt.hash(newPassword, 10);
    await staff.save();

    // Single-use — remove it once used, same as the customer flow.
    await EmailOtp.deleteMany({
      email: normalizedEmail,
      purpose: "staff-password-reset",
    });

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Staff reset password error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to reset password",
      error: error.message,
    });
  }
};

/* =========================
   UPDATE / REMOVE PROFILE PHOTO
========================= */
const updateStaffAvatar = async (req, res) => {
  try {
    const { image } = req.body;
    const staff = req.staff; // set by protectStaff

    if (!image) {
      return res.status(400).json({ success: false, message: "No image provided" });
    }

    const savedPath = saveBase64Avatar(image);
    const previousImage = staff.image;

    staff.image = savedPath;
    await staff.save();

    // Only clean up the old file once the new one has actually saved —
    // if anything above had failed, staff keeps their existing photo
    // instead of ending up with neither.
    if (previousImage) {
      deleteAvatarFile(previousImage);
    }

    return res.status(200).json({
      success: true,
      message: "Profile photo updated successfully",
      staff: toSafeStaff(staff),
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to update profile photo",
      error: error.message,
    });
  }
};

const removeStaffAvatar = async (req, res) => {
  try {
    const staff = req.staff;
    const previousImage = staff.image;

    staff.image = "";
    await staff.save();

    if (previousImage) {
      deleteAvatarFile(previousImage);
    }

    return res.status(200).json({
      success: true,
      message: "Profile photo removed",
      staff: toSafeStaff(staff),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to remove profile photo",
      error: error.message,
    });
  }
};

module.exports = {
  loginStaff,
  getStaffProfile,
  updateStaffProfile,
  updateStaffAvatar,
  removeStaffAvatar,
  forgotStaffPassword,
  verifyStaffResetOtp,
  resetStaffPassword,
};
