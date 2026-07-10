const Staff = require("../models/Staff");

const getStaff = async (req, res) => {
  try {
    const filter = { isActive: true };

    if (req.query.category) {
      filter.category = req.query.category;
    }

    const staff = await Staff.find(filter).sort({ rating: -1 });

    res.status(200).json({ staff });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load staff",
      error: error.message,
    });
  }
};

module.exports = { getStaff };