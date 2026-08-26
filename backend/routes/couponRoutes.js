const express = require("express");
const router = express.Router();

const { getCoupons } = require("../controllers/couponController");

// Public — anyone can view active promotions, same as browsing
// services doesn't require login.
router.get("/", getCoupons);

module.exports = router;