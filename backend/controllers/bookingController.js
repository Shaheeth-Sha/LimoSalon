const Booking = require("../models/Booking");

const calculateAdvancePayment = (totalAmount, bookingType) => {
  if (bookingType === "bridal") {
    return totalAmount * 0.2;
  }

  if (totalAmount > 10000) {
    return totalAmount * 0.1;
  }

  return 0;
};

const createBooking = async (req, res) => {
  try {
    const {
      services,
      hairLength,
      staff,
      selectedDate,
      selectedTime,
      totalAmount,
      bookingType,
    } = req.body;

    const estimatedDuration = services.reduce(
      (total, item) => total + Number(item.duration || 0),
      0
    );

    const advancePayment = calculateAdvancePayment(
      Number(totalAmount),
      bookingType
    );

    const booking = await Booking.create({
      customer: req.customer._id,
      services,
      hairLength,
      staff,
      selectedDate,
      selectedTime,
      estimatedDuration,
      totalAmount,
      advancePayment,
      paymentRequired: advancePayment > 0,
      paymentStatus: advancePayment > 0 ? "Pending" : "Not Required",
      bookingType,
      status: "Confirmed",
    });

    res.status(201).json({
      message: "Booking created successfully",
      booking,
    });
  } catch (error) {
    res.status(500).json({
      message: "Booking creation failed",
      error: error.message,
    });
  }
};

module.exports = { createBooking };