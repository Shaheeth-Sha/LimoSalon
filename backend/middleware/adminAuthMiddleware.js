const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

// Mirrors protectStaff in staffAuthMiddleware.js exactly, with
// role: "admin" instead of "staff" — without that check, a staff
// member's own valid JWT (same secret, same {id, iat, exp} shape)
// would otherwise also pass here and let them reach admin-only
// endpoints just by pointing their existing token at them.
const protectAdmin = async (req, res, next) => {
  try {
    let token = req.headers.authorization;

    if (!token || !token.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized, no token" });
    }

    token = token.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "limosalon_secret");

    if (decoded.role !== "admin") {
      return res.status(401).json({ message: "Not authorized, token failed" });
    }

    const admin = await Admin.findById(decoded.id).select("-password");

    if (!admin) {
      return res.status(401).json({ message: "Not authorized, token failed" });
    }

    req.admin = admin;

    next();
  } catch (error) {
    res.status(401).json({ message: "Not authorized, token failed" });
  }
};

module.exports = { protectAdmin };
