const HairLength = require("../models/HairLength");

const getHairLengths = async (req, res) => {
  try {
    const hairLengths = await HairLength.find({ isActive: true }).sort({ extraPrice: 1 });
    res.status(200).json({ hairLengths });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load hair lengths",
      error: error.message,
    });
  }
};

module.exports = { getHairLengths };