const Service = require("../models/Service");

const getServices = async (req, res) => {
  try {
    const filter = { isActive: true };

    if (req.query.category) {
      filter.category = req.query.category;
    }

    const services = await Service.find(filter).sort({
      category: 1,
      name: 1,
    });

    res.status(200).json({ services });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load services",
      error: error.message,
    });
  }
};

module.exports = { getServices };