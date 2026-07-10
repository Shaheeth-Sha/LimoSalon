const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Customer = require("../models/Customer");
const EmailOtp = require("../models/EmailOtp");
const sendEmail = require("../utils/sendEmail");

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

module.exports = {
  registerCustomer,
  loginCustomer,
  sendRegistrationOtp,
  verifyRegistrationOtp,
  sendOtp,
  verifyOtp,
  getCustomerProfile,
};