const express = require("express");
const router = express.Router();

const {
  sendPaymentOtp,
  verifyPaymentOtp,
  createPaymentIntent,
} = require("../controllers/paymentController");

const { protectCustomer } = require("../middleware/authMiddleware");


router.get("/test", (req, res) => {
  res.json({
    message: "Payment route working"
  });
});


router.post(
  "/send-otp",
  protectCustomer,
  sendPaymentOtp
);


router.post(
  "/verify-otp",
  protectCustomer,
  verifyPaymentOtp
);


// Stripe Payment Intent
router.post(
  "/create-payment-intent",
  protectCustomer,
  createPaymentIntent
);


module.exports = router;