const bcrypt = require("bcryptjs");
const Stripe = require("stripe");

const PaymentOtp = require("../models/PaymentOtp");
const Payment = require("../models/Payment");
const Customer = require("../models/Customer");
const sendEmail = require("../utils/sendEmail");

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error(
    "STRIPE_SECRET_KEY is missing from the backend .env file"
  );
}

const stripe = new Stripe(stripeSecretKey);





const OTP_EXPIRY_MINUTES = 10;
const NON_BRIDAL_ADVANCE_MINIMUM = 10000;
const BRIDAL_ADVANCE_RATE = 0.2;
const OTHER_SERVICE_ADVANCE_RATE = 0.1;

const roundMoney = (value) => {
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

const containsBridalService = (selectedServices, bookingType) => {
  const normalizedBookingType = String(bookingType || "")
    .trim()
    .toLowerCase();

  if (normalizedBookingType === "bridal") {
    return true;
  }

  if (!selectedServices) {
    return false;
  }

  let services = selectedServices;

  if (typeof services === "string") {
    try {
      services = JSON.parse(services);
    } catch {
      return services.toLowerCase().includes("bridal");
    }
  }

  try {
    return JSON.stringify(services)
      .toLowerCase()
      .includes("bridal");
  } catch {
    return String(services)
      .toLowerCase()
      .includes("bridal");
  }
};

const calculatePayment = ({
  totalAmount,
  selectedServices,
  bookingType,
  requestedPaymentOption,
}) => {
  const total = Number(totalAmount);

  if (!Number.isFinite(total) || total <= 0) {
    throw new Error("A valid total amount is required");
  }

  const isBridal = containsBridalService(
    selectedServices,
    bookingType
  );

  const advanceAvailable =
    isBridal ||
    (!isBridal && total >= NON_BRIDAL_ADVANCE_MINIMUM);

  const allowedPaymentOptions = advanceAvailable
    ? ["advance", "full"]
    : ["full"];

  const paymentOption = String(
    requestedPaymentOption || ""
  )
    .trim()
    .toLowerCase();

  if (!allowedPaymentOptions.includes(paymentOption)) {
    if (isBridal) {
      throw new Error(
        "Bridal bookings require a 20% advance or full payment"
      );
    }

    if (total < NON_BRIDAL_ADVANCE_MINIMUM) {
      throw new Error(
        "Advance payment is available only for non-bridal bookings of LKR 10,000 or more"
      );
    }

    throw new Error("Invalid payment option");
  }

  const advanceRate = isBridal
    ? BRIDAL_ADVANCE_RATE
    : advanceAvailable
      ? OTHER_SERVICE_ADVANCE_RATE
      : 0;

  const advanceAmount = advanceAvailable
    ? roundMoney(total * advanceRate)
    : 0;

  const amountToPay =
    paymentOption === "advance"
      ? advanceAmount
      : total;

  const balancePayment =
    paymentOption === "advance"
      ? roundMoney(total - advanceAmount)
      : 0;

  return {
    isBridal,
    advanceAvailable,
    advanceRate,
    advancePercentage: Math.round(advanceRate * 100),
    paymentOption,
    totalAmount: total,
    amountToPay,
    balancePayment,
  };
};

const getAuthenticatedCustomerId = (req) => {
  return req.customer?.id || req.customer?._id;
};

const sendPaymentOtp = async (req, res) => {
  try {
    const customerId = getAuthenticatedCustomerId(req);

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "Customer authentication is required",
      });
    }

    const {
      totalAmount,
      selectedServices,
      bookingType,
      paymentOption,
    } = req.body;

    let paymentSummary;

    try {
      paymentSummary = calculatePayment({
        totalAmount,
        selectedServices,
        bookingType,
        requestedPaymentOption: paymentOption,
      });
    } catch (calculationError) {
      return res.status(400).json({
        success: false,
        message: calculationError.message,
      });
    }

    const customer = await Customer.findById(customerId);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    if (!customer.email) {
      return res.status(400).json({
        success: false,
        message: "Customer email address is not available",
      });
    }

    const otp = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    const hashedOtp = await bcrypt.hash(otp, 10);

    await PaymentOtp.deleteMany({
      customer: customer._id,
    });

    await PaymentOtp.create({
      customer: customer._id,
      otp: hashedOtp,
      verified: false,
      expiresAt: new Date(
        Date.now() +
          OTP_EXPIRY_MINUTES * 60 * 1000
      ),
    });

    await sendEmail({
      to: customer.email,
      subject: "LimoSalon Payment Verification OTP",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2 style="color: #ff2d75;">
            LimoSalon Payment Verification
          </h2>

          <p>
            Use the following OTP to verify your payment:
          </p>

          <div style="
            display: inline-block;
            padding: 12px 24px;
            margin: 10px 0;
            background: #fff1f6;
            border: 1px solid #ff2d75;
            border-radius: 8px;
            font-size: 30px;
            font-weight: bold;
            letter-spacing: 6px;
            color: #111111;
          ">
            ${otp}
          </div>

          <p>
            Payment type:
            <strong>
              ${
                paymentSummary.paymentOption === "advance"
                  ? `${paymentSummary.advancePercentage}% Advance`
                  : "Full Payment"
              }
            </strong>
          </p>

          <p>
            Total booking amount:
            <strong>
              LKR ${paymentSummary.totalAmount.toFixed(2)}
            </strong>
          </p>

          <p>
            Amount being verified:
            <strong>
              LKR ${paymentSummary.amountToPay.toFixed(2)}
            </strong>
          </p>

          <p>
            Balance amount:
            <strong>
              LKR ${paymentSummary.balancePayment.toFixed(2)}
            </strong>
          </p>

          <p>
            This OTP expires in ${OTP_EXPIRY_MINUTES} minutes.
          </p>

          <p style="color: #777777; font-size: 12px;">
            Do not share this OTP with anyone.
          </p>
        </div>
      `,
    });

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      paymentSummary,
    });
  } catch (error) {
    console.error("Send payment OTP error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send payment OTP",
    });
  }
};

const verifyPaymentOtp = async (req, res) => {
  try {
    const customerId = getAuthenticatedCustomerId(req);
    const otp = String(req.body.otp || "").trim();

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "Customer authentication is required",
      });
    }

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid 6-digit OTP",
      });
    }

    const record = await PaymentOtp.findOne({
      customer: customerId,
      verified: false,
    }).sort({ createdAt: -1 });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: "No active payment OTP was found",
      });
    }

    if (record.expiresAt <= new Date()) {
      await PaymentOtp.deleteOne({
        _id: record._id,
      });

      return res.status(400).json({
        success: false,
        message: "OTP expired. Please request a new OTP.",
      });
    }

    const otpMatches = await bcrypt.compare(
      otp,
      record.otp
    );

    if (!otpMatches) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    record.verified = true;
    await record.save();

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.error("Verify payment OTP error:", error);

    return res.status(500).json({
      success: false,
      message: "OTP verification failed",
    });
  }
};


const createPaymentIntent = async (req, res) => {
  try {
    const customerId = getAuthenticatedCustomerId(req);

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "Customer authentication is required",
      });
    }

    const {
      totalAmount,
      selectedServices,
      bookingType,
      paymentOption,
      holdId,
    } = req.body;


    if (!holdId) {
      return res.status(400).json({
        success: false,
        message: "A valid booking hold is required",
      });
    }


    let paymentSummary;

    try {

      paymentSummary = calculatePayment({
        totalAmount,
        selectedServices,
        bookingType,
        requestedPaymentOption: paymentOption,
      });

    } catch (calculationError) {

      return res.status(400).json({
        success: false,
        message: calculationError.message,
      });

    }


    const stripeAmount = Math.round(
      paymentSummary.amountToPay * 100
    );


    const paymentIntent =
      await stripe.paymentIntents.create({

        amount: stripeAmount,

        currency: "lkr",

        automatic_payment_methods: {
          enabled: true,
        },


        metadata: {

          customerId:
            String(customerId),

          holdId:
            String(holdId),

          bookingType:
            paymentSummary.isBridal
              ? "bridal"
              : "hair",


          paymentOption:
            paymentSummary.paymentOption,


          totalAmount:
            String(
              paymentSummary.totalAmount
            ),


          amountToPay:
            String(
              paymentSummary.amountToPay
            ),


          balancePayment:
            String(
              paymentSummary.balancePayment
            ),


          advancePercentage:
            String(
              paymentSummary.advancePercentage
            ),
        },
      });




      
console.log(
  "Created Stripe PaymentIntent:",
  paymentIntent.id
);

    // Save payment record in MongoDB

    await Payment.create({

      customer:
        customerId,


      stripePaymentIntentId:
        paymentIntent.id,


      amount:
        paymentSummary.amountToPay,


      currency:
        "lkr",


      status:
        "pending",

    });



    return res.status(200).json({

      success: true,


      message:
        "Payment initialized successfully",


      clientSecret:
        paymentIntent.client_secret,


      paymentIntentId:
        paymentIntent.id,


      paymentSummary: {

        totalAmount:
          paymentSummary.totalAmount,


        amountToPay:
          paymentSummary.amountToPay,


        balancePayment:
          paymentSummary.balancePayment,


        paymentOption:
          paymentSummary.paymentOption,


        advancePercentage:
          paymentSummary.advancePercentage,

      },

    });



  } catch (error) {


    console.error(
      "Create Payment Intent Error:",
      error
    );


    return res.status(500).json({

      success: false,


      message:
        error.message ||
        "Failed to create payment intent",

    });

  }
};

module.exports = {
  sendPaymentOtp,
  verifyPaymentOtp,
  createPaymentIntent,
};