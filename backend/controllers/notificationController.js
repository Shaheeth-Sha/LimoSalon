const Notification = require("../models/Notification");

const getCustomerId = (req) => {
  return req.customer?._id || req.customer?.id || null;
};

const getStaffId = (req) => {
  return req.staff?._id || req.staff?.id || null;
};

// Reusable helper — imported and called from bookingController.js,
// loyaltyController.js, and reviewController.js whenever something
// notification-worthy happens. Wrapped in try/catch by design: a
// failed notification write should never break the actual
// booking/loyalty/review action that triggered it, same reasoning as
// sendBookingEmail's error handling.
//
// Pass exactly one of customerId / staffId — whichever is set decides
// recipientType, so existing call sites (customerId only) keep
// working unchanged, and new staff-facing call sites just pass
// staffId instead.
const createNotification = async ({
  customerId,
  staffId,
  type,
  title,
  message,
  relatedBooking,
}) => {
  try {
    await Notification.create({
      customer: customerId || null,
      staffId: staffId ? String(staffId) : null,
      recipientType: staffId ? "staff" : "customer",
      type,
      title,
      message,
      relatedBooking: relatedBooking || null,
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
};

const getMyNotifications = async (req, res) => {
  try {
    const customerId = getCustomerId(req);

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "Customer authentication is required",
      });
    }

    const notifications = await Notification.find({ customer: customerId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({
      success: true,
      notifications,
    });
  } catch (error) {
    console.error("Get notifications error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load notifications",
    });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const customerId = getCustomerId(req);

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "Customer authentication is required",
      });
    }

    const count = await Notification.countDocuments({
      customer: customerId,
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      unreadCount: count,
    });
  } catch (error) {
    console.error("Get unread count error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load unread count",
    });
  }
};

const markAsRead = async (req, res) => {
  try {
    const customerId = getCustomerId(req);
    const { notificationId } = req.params;

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "Customer authentication is required",
      });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, customer: customerId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error("Mark as read error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update notification",
    });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const customerId = getCustomerId(req);

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "Customer authentication is required",
      });
    }

    await Notification.updateMany(
      { customer: customerId, isRead: false },
      { isRead: true }
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Mark all as read error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update notifications",
    });
  }
};

/* -------------------------------------------------------------------------- */
/*                          Staff-facing notifications                        */
/* -------------------------------------------------------------------------- */

const getMyStaffNotifications = async (req, res) => {
  try {
    const staffId = getStaffId(req);

    if (!staffId) {
      return res.status(401).json({ success: false, message: "Staff authentication is required" });
    }

    const notifications = await Notification.find({
      staffId: String(staffId),
      recipientType: "staff",
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({ success: true, notifications });
  } catch (error) {
    console.error("Get staff notifications error:", error);

    return res.status(500).json({ success: false, message: "Unable to load notifications" });
  }
};

const getStaffUnreadCount = async (req, res) => {
  try {
    const staffId = getStaffId(req);

    if (!staffId) {
      return res.status(401).json({ success: false, message: "Staff authentication is required" });
    }

    const count = await Notification.countDocuments({
      staffId: String(staffId),
      recipientType: "staff",
      isRead: false,
    });

    return res.status(200).json({ success: true, unreadCount: count });
  } catch (error) {
    console.error("Get staff unread count error:", error);

    return res.status(500).json({ success: false, message: "Unable to load unread count" });
  }
};

const markStaffAsRead = async (req, res) => {
  try {
    const staffId = getStaffId(req);
    const { notificationId } = req.params;

    if (!staffId) {
      return res.status(401).json({ success: false, message: "Staff authentication is required" });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, staffId: String(staffId), recipientType: "staff" },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    return res.status(200).json({ success: true, notification });
  } catch (error) {
    console.error("Mark staff notification as read error:", error);

    return res.status(500).json({ success: false, message: "Unable to update notification" });
  }
};

const markAllStaffAsRead = async (req, res) => {
  try {
    const staffId = getStaffId(req);

    if (!staffId) {
      return res.status(401).json({ success: false, message: "Staff authentication is required" });
    }

    await Notification.updateMany(
      { staffId: String(staffId), recipientType: "staff", isRead: false },
      { isRead: true }
    );

    return res.status(200).json({ success: true, message: "All notifications marked as read" });
  } catch (error) {
    console.error("Mark all staff notifications as read error:", error);

    return res.status(500).json({ success: false, message: "Unable to update notifications" });
  }
};

module.exports = {
  createNotification,
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  getMyStaffNotifications,
  getStaffUnreadCount,
  markStaffAsRead,
  markAllStaffAsRead,
};