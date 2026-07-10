const express = require("express");
const router = express.Router();

const { createBooking } = require("../controllers/bookingController");
const { protectCustomer } = require("../middleware/authMiddleware");

router.post("/", protectCustomer, createBooking);

module.exports = router;