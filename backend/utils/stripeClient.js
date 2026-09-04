const Stripe = require("stripe");

// Single shared Stripe client for every controller that needs to call
// Stripe outside the webhook (refunds today, anything else later) —
// one instance instead of each call site constructing its own.
// stripeWebhookController.js predates this and keeps its own
// already-working instance rather than being refactored for no
// functional reason.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = stripe;
