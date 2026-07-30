const Staff = require("../models/Staff");

const escapeRegex = (value) => {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const getStaff = async (req, res) => {
  try {
    const filter = { isActive: true };

    if (req.query.category) {
      // Fixed: previously did a strict, case-sensitive exact match
      // (filter.category = req.query.category). That silently
      // returned zero staff whenever the stored value differed even
      // slightly from the query — e.g. a stray trailing space saved
      // directly in Atlas ("Bridal " vs "Bridal"), or a casing
      // mismatch from the frontend ("body" vs "Body").
      //
      // This now trims the incoming query value AND tolerates
      // leading/trailing whitespace on the STORED value too (via
      // \s* on both ends of the pattern) — so a category saved as
      // "Bridal " in the database still matches a request for
      // "bridal". The proper long-term fix is cleaning the stray
      // space out of the database directly, but this makes the API
      // resilient to that class of data-entry mistake either way.
      const normalizedCategory = String(req.query.category).trim();

      filter.category = {
        $regex: `^\\s*${escapeRegex(normalizedCategory)}\\s*$`,
        $options: "i",
      };
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