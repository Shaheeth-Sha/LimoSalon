const express = require("express");
const router = express.Router();

const {
  sendPaymentOtp,
  verifyPaymentOtp,
} = require("../controllers/paymentController");

const { protectCustomer } = require("../middleware/authMiddleware");

router.get("/test", (req, res) => {
  res.json({ message: "Payment route working" });
});

router.post("/send-otp", protectCustomer, sendPaymentOtp);
router.post("/verify-otp", protectCustomer, verifyPaymentOtp);

module.exports = router;