const express = require("express");
const router = express.Router();

const {
  registerCustomer,
  loginCustomer,
  sendOtp,
  verifyOtp,
  getCustomerProfile,
  sendRegistrationOtp,
  verifyRegistrationOtp,
  forgotPassword,
  resetPassword,
} = require("../controllers/customerController");



const { protectCustomer } = require("../middleware/authMiddleware");


router.post("/register", registerCustomer);
router.post("/login", loginCustomer);
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.get("/profile", protectCustomer, getCustomerProfile);
router.post("/send-registration-otp", sendRegistrationOtp);
router.post("/verify-registration-otp", verifyRegistrationOtp);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

module.exports = router;