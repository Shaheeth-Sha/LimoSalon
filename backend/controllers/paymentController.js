const PaymentOtp = require("../models/PaymentOtp");
const Customer = require("../models/Customer");
const sendEmail = require("../utils/sendEmail");

const sendPaymentOtp = async (req, res) => {
  try {
    const customerId = req.customer.id || req.customer._id;
    const customer = await Customer.findById(customerId);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await PaymentOtp.deleteMany({ customer: customer._id });

    await PaymentOtp.create({
      customer: customer._id,
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    await sendEmail({
      to: customer.email,
      subject: "LimoSalon Payment Verification OTP",
      html: `
        <h2>LimoSalon Payment Verification</h2>
        <p>Your payment verification OTP is:</p>
        <h1>${otp}</h1>
        <p>This OTP expires in 10 minutes.</p>
      `,
    });

    return res.json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (err) {
    console.error("Send payment OTP error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });
  }
};

const verifyPaymentOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    const customerId = req.customer.id || req.customer._id;

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: "OTP is required",
      });
    }

    const record = await PaymentOtp.findOne({
      customer: customerId,
      otp,
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

    return res.json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (err) {
    console.error("Verify payment OTP error:", err);

    return res.status(500).json({
      success: false,
      message: "OTP verification failed",
    });
  }
};

module.exports = {
  sendPaymentOtp,
  verifyPaymentOtp,
};