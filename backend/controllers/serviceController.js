const Service = require("../models/Service");

const VALID_CATEGORIES = ["hair", "bridal", "face", "body", "nail"];

const escapeRegex = (value) => {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const getServices = async (req, res) => {
  try {
    const filter = { isActive: true };

    if (req.query.category) {
      // Case/whitespace-insensitive match — same fix as getStaff in
      // staffController.js. The admin panel saves categories
      // lowercased ("hair"), but the mobile app's category screens
      // query with capitalized values ("Hair", "Body", ...). A
      // strict exact match silently returned zero results for any
      // service added through the admin panel.
      const normalizedCategory = String(req.query.category).trim();

      filter.category = {
        $regex: `^\\s*${escapeRegex(normalizedCategory)}\\s*$`,
        $options: "i",
      };
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

/* -------------------------------------------------------------------------- */
/*                      Admin: manage the service catalog                     */
/* -------------------------------------------------------------------------- */

// Used by the admin Services screen — deliberately not filtered to
// isActive, so a soft-deleted service doesn't just silently vanish
// with no way to see it ever existed. (The public getServices above,
// used by the customer app, keeps its isActive-only filter untouched.)
const getServicesForAdmin = async (req, res) => {
  try {
    const services = await Service.find({}).sort({ isActive: -1, category: 1, name: 1 });

    return res.status(200).json({ success: true, services });
  } catch (error) {
    console.error("Get admin services error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load services",
      error: error.message,
    });
  }
};

const buildServiceInput = (body) => {
  const { name, category, price, duration, durationText, description } = body;

  if (!name || !String(name).trim()) {
    throw Object.assign(new Error("Service name is required"), { statusCode: 400 });
  }

  if (!category || !VALID_CATEGORIES.includes(String(category).toLowerCase())) {
    throw Object.assign(
      new Error(`Category must be one of: ${VALID_CATEGORIES.join(", ")}`),
      { statusCode: 400 }
    );
  }

  const numericPrice = Number(price);
  if (!Number.isFinite(numericPrice) || numericPrice < 0) {
    throw Object.assign(new Error("Price must be a valid, non-negative number"), { statusCode: 400 });
  }

  const numericDuration = Number(duration);
  if (!Number.isFinite(numericDuration) || numericDuration <= 0) {
    throw Object.assign(new Error("Duration must be a valid number of minutes"), { statusCode: 400 });
  }

  return {
    name: String(name).trim(),
    category: String(category).toLowerCase(),
    price: numericPrice,
    duration: numericDuration,
    durationText:
      typeof durationText === "string" && durationText.trim()
        ? durationText.trim()
        : `${numericDuration} min`,
    description: typeof description === "string" ? description.trim() : "",
  };
};

const createService = async (req, res) => {
  try {
    const data = buildServiceInput(req.body);

    const service = await Service.create({ ...data, isActive: true });

    return res.status(201).json({
      success: true,
      message: "Service added successfully",
      service,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to add service",
      error: error.message,
    });
  }
};

const updateService = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const data = buildServiceInput(req.body);

    const service = await Service.findByIdAndUpdate(serviceId, data, {
      new: true,
      runValidators: true,
    });

    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Service updated successfully",
      service,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to update service",
      error: error.message,
    });
  }
};

// Soft delete — a hard delete would leave every past booking that
// references this service (Booking.services stores its own
// name/price snapshot, but nothing re-derives the catalog from it)
// with a dangling, unrecoverable link if the service is ever needed
// for reference again. Matches the isActive-based soft-delete
// convention already used everywhere else in this codebase (Staff,
// Booking's own status field, etc.).
const deleteService = async (req, res) => {
  try {
    const { serviceId } = req.params;

    const service = await Service.findByIdAndUpdate(
      serviceId,
      { isActive: false },
      { new: true }
    );

    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Service deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete service",
      error: error.message,
    });
  }
};

module.exports = {
  getServices,
  getServicesForAdmin,
  createService,
  updateService,
  deleteService,
};