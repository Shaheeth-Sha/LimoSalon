const express = require("express");
const {
  registerCustomer,
  loginCustomer,
  sendOtp,
  verifyOtp,
} = require("../controllers/customerController");

const router = express.Router();

router.post("/register", registerCustomer);
router.post("/login", loginCustomer);
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);

module.exports = router;