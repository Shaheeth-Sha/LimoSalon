const bcrypt = require("bcryptjs");

const Staff = require("../models/Staff");

const VALID_CATEGORIES = ["hair", "bridal", "face", "body", "nail"];
const MIN_PASSWORD_LENGTH = 6;

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

    const staff = await Staff.find(filter).select("-password").sort({ rating: -1 });

    res.status(200).json({ staff });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load staff",
      error: error.message,
    });
  }
};

/* -------------------------------------------------------------------------- */
/*                       Admin: manage the staff roster                       */
/* -------------------------------------------------------------------------- */

// Not filtered to isActive — same reasoning as getServicesForAdmin,
// a deactivated staff member shouldn't just disappear with no trace
// from the admin's own list.
const getStaffForAdmin = async (req, res) => {
  try {
    const staff = await Staff.find({}).sort({ isActive: -1, name: 1 });

    // The admin UI needs to know whether portal login is already set
    // up (to show "reset password" vs "set password" language), but
    // the hash itself should never leave the server — hasPortalAccess
    // carries that yes/no without exposing the hash.
    const safeStaff = staff.map((s) => {
      const obj = s.toObject();
      obj.hasPortalAccess = Boolean(obj.password);
      delete obj.password;
      return obj;
    });

    return res.status(200).json({ success: true, staff: safeStaff });
  } catch (error) {
    console.error("Get admin staff error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load staff",
      error: error.message,
    });
  }
};

const isEmailLike = (value) => /\S+@\S+\.\S+/.test(value);

// The Add/Edit Staff form has one combined "Contact (e-mail or
// mobile)" field rather than separate email/phone boxes — this is
// what tells the two apart before saving.
const applyContact = (staffDoc, contactValue) => {
  const trimmed = String(contactValue || "").trim();

  if (!trimmed) {
    return;
  }

  if (isEmailLike(trimmed)) {
    staffDoc.email = trimmed.toLowerCase();
  } else {
    staffDoc.phone = trimmed;
  }
};

const createStaff = async (req, res) => {
  try {
    const { name, role, category, contact, password } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Full name is required" });
    }

    if (!role || !role.trim()) {
      return res.status(400).json({ success: false, message: "Role is required" });
    }

    if (!category || !VALID_CATEGORIES.includes(String(category).toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Category must be one of: ${VALID_CATEGORIES.join(", ")}`,
      });
    }

    if (!contact || !String(contact).trim()) {
      return res.status(400).json({ success: false, message: "Contact (email or mobile) is required" });
    }

    const trimmedPassword = typeof password === "string" ? password.trim() : "";

    // A password only makes sense paired with an email — that's the
    // identifier loginStaff looks accounts up by. A phone-only
    // contact can still be saved (display-only profile, same as
    // before), it just can't also get portal login in the same step.
    if (trimmedPassword) {
      if (!isEmailLike(String(contact).trim())) {
        return res.status(400).json({
          success: false,
          message: "A password requires an email contact so this staff member can log in",
        });
      }

      if (trimmedPassword.length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({
          success: false,
          message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
        });
      }
    }

    const staff = new Staff({
      name: name.trim(),
      role: role.trim(),
      category: String(category).toLowerCase(),
    });

    applyContact(staff, contact);

    if (isEmailLike(String(contact).trim())) {
      const emailTaken = await Staff.findOne({ email: staff.email });

      if (emailTaken) {
        return res.status(400).json({
          success: false,
          message: "That email is already used by another staff member",
        });
      }
    }

    if (trimmedPassword) {
      staff.password = await bcrypt.hash(trimmedPassword, 10);
    }

    await staff.save();

    const safeStaff = staff.toObject();
    safeStaff.hasPortalAccess = Boolean(safeStaff.password);
    delete safeStaff.password;

    return res.status(201).json({
      success: true,
      message: "Staff added successfully",
      staff: safeStaff,
    });
  } catch (error) {
    console.error("Create staff error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add staff",
      error: error.message,
    });
  }
};

const updateStaff = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { name, role, category, contact, password } = req.body;

    const staff = await Staff.findById(staffId);

    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff not found" });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Full name is required" });
    }

    if (!role || !role.trim()) {
      return res.status(400).json({ success: false, message: "Role is required" });
    }

    if (category) {
      if (!VALID_CATEGORIES.includes(String(category).toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: `Category must be one of: ${VALID_CATEGORIES.join(", ")}`,
        });
      }
      staff.category = String(category).toLowerCase();
    }

    staff.name = name.trim();
    staff.role = role.trim();

    if (contact && String(contact).trim()) {
      const trimmedContact = String(contact).trim();

      if (isEmailLike(trimmedContact)) {
        const emailTaken = await Staff.findOne({
          email: trimmedContact.toLowerCase(),
          _id: { $ne: staff._id },
        });

        if (emailTaken) {
          return res.status(400).json({
            success: false,
            message: "That email is already used by another staff member",
          });
        }
      }

      applyContact(staff, trimmedContact);
    }

    const trimmedPassword = typeof password === "string" ? password.trim() : "";

    // Same rule as createStaff — a password needs an email to log in
    // with. That email can come from this same request's contact
    // field, or already be sitting on the record from an earlier
    // edit; either way, blank leaves the existing password untouched
    // (this is also how an admin resets someone's forgotten password
    // later, without having to retype their email every time).
    if (trimmedPassword) {
      if (!isEmailLike(String(staff.email || ""))) {
        return res.status(400).json({
          success: false,
          message: "This staff member needs an email contact before a password can be set",
        });
      }

      if (trimmedPassword.length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({
          success: false,
          message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
        });
      }

      staff.password = await bcrypt.hash(trimmedPassword, 10);
    }

    await staff.save();

    const safeStaff = staff.toObject();
    safeStaff.hasPortalAccess = Boolean(safeStaff.password);
    delete safeStaff.password;

    return res.status(200).json({
      success: true,
      message: "Staff updated successfully",
      staff: safeStaff,
    });
  } catch (error) {
    console.error("Update staff error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update staff",
      error: error.message,
    });
  }
};

// Soft delete, matching deleteService's reasoning — a staff member's
// name/role/image is embedded (snapshotted) into every one of their
// past Booking documents, so removing the Staff record outright
// would strand that history with a staffId that resolves to nothing.
const deleteStaff = async (req, res) => {
  try {
    const { staffId } = req.params;

    const staff = await Staff.findByIdAndUpdate(
      staffId,
      { isActive: false, available: false },
      { new: true }
    );

    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Staff deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete staff",
      error: error.message,
    });
  }
};

module.exports = {
  getStaff,
  getStaffForAdmin,
  createStaff,
  updateStaff,
  deleteStaff,
};