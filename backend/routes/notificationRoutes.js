const express = require("express");
const router = express.Router();

const {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} = require("../controllers/notificationController");

const {
  protectCustomer,
} = require("../middleware/authMiddleware");

router.get(
  "/",
  protectCustomer,
  getMyNotifications
);

router.get(
  "/unread-count",
  protectCustomer,
  getUnreadCount
);

router.patch(
  "/:notificationId/read",
  protectCustomer,
  markAsRead
);

router.patch(
  "/read-all",
  protectCustomer,
  markAllAsRead
);

module.exports = router;