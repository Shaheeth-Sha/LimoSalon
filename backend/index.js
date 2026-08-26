const dns = require("dns");
dns.setDefaultResultOrder("ipv4first"); // forces IPv4, avoids broken IPv6 routes
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const path = require("path");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { ensureUploadsDir } = require("./utils/avatarStorage");
const connectDB = require("./config/db");
const customerRoutes = require("./routes/customerRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const hairLengthRoutes = require("./routes/hairLengthRoutes");
const staffRoutes = require("./routes/staffRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const stripeRoutes = require("./routes/stripeRoutes");
const timeSlotRoutes = require("./routes/timeSlotRoutes");
const loyaltyRoutes = require("./routes/loyaltyRoutes");
const couponRoutes = require("./routes/couponRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const { startReminderService } = require("./services/reminderService");

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

// Was a bare express.json() — profile photo uploads arrive as a
// base64-encoded JSON body (see utils/avatarStorage.js), which runs
// roughly a third larger than the raw image file, so the default
// ~100kb limit rejected anything but a tiny photo. 12mb comfortably
// covers the 8MB post-decode cap avatarStorage.js itself enforces.
app.use(express.json({ limit: "12mb" }));

// Uploaded profile photos (see utils/avatarStorage.js) are served
// back out from here — a customer/staff avatar URL is just
// `${BASE_URL}/uploads/avatars/<file>`.
ensureUploadsDir();
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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
app.use("/api/time-slots", timeSlotRoutes);
app.use("/api/loyalty", loyaltyRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/notifications", notificationRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  startReminderService();
});