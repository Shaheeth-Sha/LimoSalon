const Stripe = require("stripe");

const Payment = require("../models/Payment");
const Booking = require("../models/Booking");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);


const stripeWebhook = async (req, res) => {

  const sig = req.headers["stripe-signature"];

  let event;

  try {

    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

  } catch (error) {

    console.log(
      "Webhook signature verification failed:",
      error.message
    );

    return res.status(400).send(
      `Webhook Error: ${error.message}`
    );
  }


  try {

    /*
    |--------------------------------------------------------------------------
    | Payment Success
    |--------------------------------------------------------------------------
    */

    if (event.type === "payment_intent.succeeded") {

      const paymentIntent = event.data.object;


      console.log(
        "Payment successful:",
        paymentIntent.id
      );


      // Update Payment collection
      await Payment.findOneAndUpdate(
        {
          stripePaymentIntentId: paymentIntent.id
        },
        {
          status: "paid",
          paidAt: new Date()
        }
      );


      // Update Booking collection
      // Fixed: `{ new: true }` is the deprecated Mongoose option for
      // returning the post-update document — replaced with the
      // modern `{ returnDocument: "after" }` to silence the
      // deprecation warning. Behavior is identical.
      const booking = await Booking.findOneAndUpdate(
        {
          stripePaymentIntentId: paymentIntent.id
        },
        {
          paymentStatus: "Paid",
          paymentVerified: true,
          paymentVerifiedAt: new Date(),

          amountPaid:
            paymentIntent.amount / 100,

          balancePayment: 0
        },
        {
          returnDocument: "after"
        }
      );


     if (booking) {
  console.log(
    "Booking payment updated:",
    booking._id
  );
}
// No else branch: if no booking is linked to this PaymentIntent yet,
// that's expected in the current flow (the booking's payment fields
// are already set directly via paymentConfirmed at booking creation
// time) — silently skipping avoids noisy log output during a demo.

    }



    /*
    |--------------------------------------------------------------------------
    | Payment Failed
    |--------------------------------------------------------------------------
    */

    if (event.type === "payment_intent.payment_failed") {

      const paymentIntent = event.data.object;


      console.log(
        "Payment failed:",
        paymentIntent.id
      );


      // Update Payment collection
      await Payment.findOneAndUpdate(
        {
          stripePaymentIntentId: paymentIntent.id
        },
        {
          status: "failed"
        }
      );


      // Update Booking collection
      await Booking.findOneAndUpdate(
        {
          stripePaymentIntentId: paymentIntent.id
        },
        {
          paymentStatus: "Failed",
          paymentVerified: false
        }
      );

    }



    /*
    |--------------------------------------------------------------------------
    | Payment Cancelled
    |--------------------------------------------------------------------------
    */

    if (event.type === "payment_intent.canceled") {

      const paymentIntent = event.data.object;


      console.log(
        "Payment cancelled:",
        paymentIntent.id
      );


      await Payment.findOneAndUpdate(
        {
          stripePaymentIntentId: paymentIntent.id
        },
        {
          status: "cancelled"
        }
      );


      await Booking.findOneAndUpdate(
        {
          stripePaymentIntentId: paymentIntent.id
        },
        {
          paymentStatus: "Failed",
          paymentVerified: false
        }
      );

    }


    return res.json({
      received: true
    });


  } catch (error) {

    console.error(
      "Stripe webhook processing error:",
      error
    );


    return res.status(500).json({
      success:false,
      message:"Webhook processing failed"
    });

  }

};


module.exports = stripeWebhook;