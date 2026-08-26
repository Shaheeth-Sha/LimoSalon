const jwt = require("jsonwebtoken");
const Staff = require("../models/Staff");

// Mirrors protectCustomer in authMiddleware.js exactly, with one
// deliberate difference: staff tokens are signed with role: "staff"
// (see staffAuthController.js's generateStaffToken) and this checks
// for it. Without that check, a customer's own valid JWT — same
// secret, same shape ({id, iat, exp}) — would otherwise also pass
// here and let a customer read/act on staff-only endpoints just by
// pointing their existing token at them.
const protectStaff = async (req, res, next) => {
  try {
    let token = req.headers.authorization;

    if (!token || !token.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized, no token" });
    }

    token = token.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "limosalon_secret");

    if (decoded.role !== "staff") {
      return res.status(401).json({ message: "Not authorized, token failed" });
    }

    const staff = await Staff.findById(decoded.id).select("-password");

    if (!staff || !staff.isActive) {
      return res.status(401).json({ message: "Not authorized, token failed" });
    }

    req.staff = staff;

    next();
  } catch (error) {
    res.status(401).json({ message: "Not authorized, token failed" });
  }
};

module.exports = { protectStaff };
