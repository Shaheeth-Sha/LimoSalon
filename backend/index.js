


const express = require("express");
const cors = require("cors");
require("dotenv").config();


const connectDB = require("./config/db");
const customerRoutes = require("./routes/customerRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const hairLengthRoutes = require("./routes/hairLengthRoutes");
const staffRoutes = require("./routes/staffRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const stripeRoutes = require("./routes/stripeRoutes");

const app = express();

// Middleware
app.use(cors());

//Stripe webhook needs raw body
app.use(
  "/api/stripe",
  express.raw({
    type: "application/json"
  })
);

app.use(express.json());

// Connect MongoDB
connectDB();

// Test route
app.get("/", (req, res) => {
  res.send("LimoSalon backend is running");
});

app.use("/api/customers", customerRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/hair-lengths", hairLengthRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/bookings", bookingRoutes)
app.use("/api/payments", paymentRoutes);
app.use("/api/stripe", stripeRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});