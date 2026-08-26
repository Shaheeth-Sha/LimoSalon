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
const {  googleAuth } = require("../controllers/customerController");

const {
  updateCustomerProfile,
  updateCustomerAvatar,
  removeCustomerAvatar,
} = require("../controllers/customerController");
router.put("/profile", protectCustomer, updateCustomerProfile);
router.put("/profile/photo", protectCustomer, updateCustomerAvatar);
router.delete("/profile/photo", protectCustomer, removeCustomerAvatar);


router.post("/register", registerCustomer);
router.post("/login", loginCustomer);
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.get("/profile", protectCustomer, getCustomerProfile);
router.post("/send-registration-otp", sendRegistrationOtp);
router.post("/verify-registration-otp", verifyRegistrationOtp);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/google-auth", googleAuth);


module.exports = router;