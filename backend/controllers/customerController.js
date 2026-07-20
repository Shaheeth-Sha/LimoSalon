const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const Customer = require("../models/Customer");
const EmailOtp = require("../models/EmailOtp");
const sendEmail = require("../utils/sendEmail");
const { OAuth2Client } = require("google-auth-library");

const googleClient = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID);
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "limosalon_secret", {
    expiresIn: "7d",
  });
};

/* =========================
   SEND REGISTRATION EMAIL OTP
========================= */
const sendRegistrationOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingCustomer = await Customer.findOne({
      email: normalizedEmail,
    });

    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: "Email already registered. Please login.",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await EmailOtp.deleteMany({
      email: normalizedEmail,
      purpose: "registration",
    });

    await EmailOtp.create({
      email: normalizedEmail,
      otp,
      purpose: "registration",
      verified: false,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    await sendEmail({
      to: normalizedEmail,
      subject: "LimoSalon Registration Verification OTP",
      html: `
        <h2>LimoSalon Registration Verification</h2>
        <p>Your registration OTP is:</p>
        <h1>${otp}</h1>
        <p>This OTP expires in 10 minutes.</p>
      `,
    });

    res.status(200).json({
      success: true,
      message: "Registration OTP sent successfully",
    });
  } catch (error) {
    console.error("Send registration OTP error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to send registration OTP",
      error: error.message,
    });
  }
};

/* =========================
   VERIFY REGISTRATION EMAIL OTP
========================= */
const verifyRegistrationOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const record = await EmailOtp.findOne({
      email: normalizedEmail,
      otp,
      purpose: "registration",
      verified: false,
    });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (record.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    record.verified = true;
    await record.save();

    res.status(200).json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    console.error("Verify registration OTP error:", error);

    res.status(500).json({
      success: false,
      message: "OTP verification failed",
      error: error.message,
    });
  }
};

/* =========================
   REGISTER CUSTOMER
========================= */
const registerCustomer = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        message: "Name, email, phone and password are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const verifiedOtp = await EmailOtp.findOne({
      email: normalizedEmail,
      purpose: "registration",
      verified: true,
    });

    if (!verifiedOtp) {
      return res.status(403).json({
        message: "Please verify your email before registration.",
      });
    }

    const existingEmail = await Customer.findOne({ email: normalizedEmail });

    if (existingEmail) {
      return res.status(400).json({
        message: "Email already exists. Please login.",
      });
    }

    const existingPhone = await Customer.findOne({ phone });

    if (existingPhone) {
      return res.status(400).json({
        message: "Phone number already registered. Please login.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const customer = await Customer.create({
      name,
      email: normalizedEmail,
      phone,
      password: hashedPassword,
      phoneVerified: true,
      emailVerified: true,
    });

    await EmailOtp.deleteMany({
      email: normalizedEmail,
      purpose: "registration",
    });

    res.status(201).json({
      message: "Customer registered successfully",
      customer: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        phoneVerified: customer.phoneVerified,
        emailVerified: customer.emailVerified,
      },
      token: generateToken(customer._id),
    });
  } catch (error) {
    res.status(500).json({
      message: "Registration failed",
      error: error.message,
    });
  }
};

/* =========================
   LOGIN CUSTOMER
========================= */
const loginCustomer = async (req, res) => {
  try {
    const { email, password } = req.body;

    const normalizedEmail = email.toLowerCase().trim();

    const customer = await Customer.findOne({ email: normalizedEmail });

    if (!customer) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const isMatch = await bcrypt.compare(password, customer.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    res.status(200).json({
      message: "Login successful",
      customer: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        phoneVerified: customer.phoneVerified,
        emailVerified: customer.emailVerified,
      },
      token: generateToken(customer._id),
    });
  } catch (error) {
    res.status(500).json({
      message: "Login failed",
      error: error.message,
    });
  }
};

/* =========================
   CUSTOMER PROFILE
========================= */
const getCustomerProfile = async (req, res) => {
  try {
    res.status(200).json({
      customer: req.customer,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load customer profile",
      error: error.message,
    });
  }
};

/* =========================
   OLD MOBILE OTP - NOT USED NOW
========================= */
const sendOtp = async (req, res) => {
  res.status(410).json({
    message: "Mobile OTP is removed. Email OTP verification is used now.",
  });
};

const verifyOtp = async (req, res) => {
  res.status(410).json({
    message: "Mobile OTP is removed. Email OTP verification is used now.",
  });
};

/* =========================
   FORGOT PASSWORD - SEND RESET LINK
========================= */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const customer = await Customer.findOne({ email: normalizedEmail });

    // Always respond with success even if the email isn't registered —
    // prevents this endpoint being used to check which emails have accounts.
    if (!customer) {
      return res.status(200).json({
        success: true,
        message: "If that email is registered, a reset link has been sent.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    await EmailOtp.deleteMany({
      email: normalizedEmail,
      purpose: "password-reset",
    });

    await EmailOtp.create({
      email: normalizedEmail,
      otp: resetToken,
      purpose: "password-reset",
      verified: false,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min
    });

   const resetLink = `https://limosalon-reset-page.vercel.app/?token=${resetToken}&email=${encodeURIComponent(
  normalizedEmail
)}`;

    await sendEmail({
      to: normalizedEmail,
      subject: "LimoSalon Password Reset",
      html: `
        <h2>Reset your LimoSalon password</h2>
        <p>Tap the link below on your mobile device to reset your password:</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>This link expires in 15 minutes. If you didn't request this, you can safely ignore this email.</p>
      `,
    });

    res.status(200).json({
      success: true,
      message: "If that email is registered, a reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process password reset request",
      error: error.message,
    });
  }
};

/* =========================
   RESET PASSWORD - VERIFY TOKEN + SET NEW PASSWORD
========================= */
const resetPassword = async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, token and new password are required",
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
      otp: token,
      purpose: "password-reset",
    });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset link",
      });
    }

    if (record.expiresAt < new Date()) {
      await record.deleteOne();
      return res.status(400).json({
        success: false,
        message: "Reset link has expired. Please request a new one.",
      });
    }

    const customer = await Customer.findOne({ email: normalizedEmail });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    customer.password = await bcrypt.hash(newPassword, 10);
    await customer.save();

    // Single-use link — remove it once used.
    await EmailOtp.deleteMany({
      email: normalizedEmail,
      purpose: "password-reset",
    });

    res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reset password",
      error: error.message,
    });
  }
};

/* =========================
   GOOGLE SIGN-IN (LOGIN OR REGISTER)
========================= */
const googleAuth = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: "Google ID token is required",
      });
    }

    // Verify the token actually came from Google and was issued for our app
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_WEB_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const normalizedEmail = payload.email.toLowerCase().trim();

    let customer = await Customer.findOne({ email: normalizedEmail });

    if (!customer) {
      // First time signing in with this Google account — create an account.
      // No password is set since they'll always sign in via Google; phone
      // is left blank and can be collected later if your app requires it
      // for bookings.
     customer = await Customer.create({
    name: payload.name || normalizedEmail.split("@")[0],
    email: normalizedEmail,
    authProvider: "google",
    phoneVerified: false,
    emailVerified: true, // Google already verified this email
      });
    }

    res.status(200).json({
      success: true,
      message: "Google sign-in successful",
      customer: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        phoneVerified: customer.phoneVerified,
        emailVerified: customer.emailVerified,
      },
      token: generateToken(customer._id),
    });
  } catch (error) {
    console.error("Google auth error:", error);
    res.status(500).json({
      success: false,
      message: "Google sign-in failed",
      error: error.message,
    });
  }
};

/* =========================
   UPDATE CUSTOMER PROFILE
========================= */
const updateCustomerProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const customer = req.customer; // set by protectCustomer middleware

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Name is required",
      });
    }

    // Only check/update phone if they actually provided one — keeps
    // Google-only accounts (which may have no phone) from being forced
    // to set one just to save their name.
    if (phone && phone.trim()) {
      const existingPhone = await Customer.findOne({
        phone: phone.trim(),
        _id: { $ne: customer._id },
      });

      if (existingPhone) {
        return res.status(400).json({
          message: "This phone number is already in use by another account",
        });
      }

      customer.phone = phone.trim();
    }

    customer.name = name.trim();
    await customer.save();

    res.status(200).json({
      message: "Profile updated successfully",
      customer: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        phoneVerified: customer.phoneVerified,
        emailVerified: customer.emailVerified,
        authProvider: customer.authProvider,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update profile",
      error: error.message,
    });
  }
};


module.exports = {
  registerCustomer,
  loginCustomer,
  sendRegistrationOtp,
  verifyRegistrationOtp,
  sendOtp,
  verifyOtp,
  getCustomerProfile,
  forgotPassword,
  resetPassword,
  googleAuth,
  updateCustomerProfile,
};