const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const twilio = require("twilio");
const Customer = require("../models/Customer");

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "limosalon_secret", {
    expiresIn: "7d",
  });
};

const normalizePhoneForTwilio = (phone) => {
  return phone.replace(/\s/g, "");
};

const registerCustomer = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        message: "Name, email, phone and password are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

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
      phoneVerified: false,
    });

    res.status(201).json({
      message: "Customer registered successfully",
      customer: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        phoneVerified: customer.phoneVerified,
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

const sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        message: "Phone number is required",
      });
    }

    const customer = await Customer.findOne({ phone });

    if (!customer) {
      return res.status(404).json({
        message: "Phone number not registered",
      });
    }

    await twilioClient.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({
        to: normalizePhoneForTwilio(phone),
        channel: "sms",
      });

    res.status(200).json({
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.log("Twilio Otp error"),
    error.message;

    res.status(500).json({
      message: error.message || "OTP sending failed",
      error: error.message,

    });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        message: "Phone and OTP are required",
      });
    }

    const customer = await Customer.findOne({ phone });

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    const verificationCheck = await twilioClient.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({
        to: normalizePhoneForTwilio(phone),
        code: otp,
      });

    if (verificationCheck.status !== "approved") {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    customer.phoneVerified = true;
    await customer.save();

    res.status(200).json({
      message: "Phone verified successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "OTP verification failed",
      error: error.message,
    });
  }
};

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

    if (!customer.phoneVerified) {
      return res.status(403).json({
        message: "Please verify your phone number before login.",
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

module.exports = {
  registerCustomer,
  loginCustomer,
  sendOtp,
  verifyOtp,
};