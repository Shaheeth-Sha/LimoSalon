const express = require("express");

const router = express.Router();

const stripeWebhook =
require("../controllers/stripeWebhookController");


router.post(
  "/webhook",
  stripeWebhook
);


module.exports = router;