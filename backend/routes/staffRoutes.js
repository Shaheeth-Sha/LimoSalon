const express = require("express");
const router = express.Router();

const {
  getStaff,
  getStaffForAdmin,
  createStaff,
  updateStaff,
  deleteStaff,
} = require("../controllers/staffController");

const {
  loginStaff,
  getStaffProfile,
  updateStaffProfile,
  updateStaffAvatar,
  removeStaffAvatar,
  forgotStaffPassword,
  verifyStaffResetOtp,
  resetStaffPassword,
  inviteStaff,
} = require("../controllers/staffAuthController");

const {
  getMyBookings,
  getBookingById,
  updateBookingStatus,
  updateMyAvailability,
  getAvailabilityForDate,
  updateAvailabilityForDate,
  getWeeklySummary,
  getTopCustomer,
  getHomeStats,
} = require("../controllers/staffScheduleController");

const {
  getMyReviewSummary,
  getMyRecentReviews,
} = require("../controllers/reviewController");

const {
  getMyStaffNotifications,
  getStaffUnreadCount,
  markStaffAsRead,
  markAllStaffAsRead,
} = require("../controllers/notificationController");

const { protectStaff } = require("../middleware/staffAuthMiddleware");
const { protectAdmin } = require("../middleware/adminAuthMiddleware");

// Public — used by the CUSTOMER app's staff picker (staff.tsx). Left
// exactly as-is; every route below is new, for the staff portal.
router.get("/", getStaff);

// Admin — staff roster management. createStaff/updateStaff can also
// set a password directly (paired with an e-mail contact) for a
// quick/manual grant. inviteStaff below is the "real world"
// counterpart — the admin never sees the password at all, they just
// trigger an e-mail and the staff member sets their own.
router.get("/admin/all", protectAdmin, getStaffForAdmin);
router.post("/admin", protectAdmin, createStaff);
router.put("/admin/:staffId", protectAdmin, updateStaff);
router.delete("/admin/:staffId", protectAdmin, deleteStaff);
router.post("/admin/:staffId/invite", protectAdmin, inviteStaff);

// Staff auth
router.post("/login", loginStaff);
router.post("/forgot-password", forgotStaffPassword);
router.post("/verify-reset-otp", verifyStaffResetOtp);
router.post("/reset-password", resetStaffPassword);

// Staff self-service (all require a valid staff token)
router.get("/profile", protectStaff, getStaffProfile);
router.put("/profile", protectStaff, updateStaffProfile);
router.put("/profile/photo", protectStaff, updateStaffAvatar);
router.delete("/profile/photo", protectStaff, removeStaffAvatar);
router.put("/availability", protectStaff, updateMyAvailability);

// Per-date/per-timeslot granular availability blocks — the "real world"
// counterpart to the global on/off switch above. A staff member can be
// globally available but still block off specific time slots on
// specific dates (e.g. a personal appointment at 2pm on the 14th).
router.get("/availability/:date", protectStaff, getAvailabilityForDate);
router.put("/availability/:date", protectStaff, updateAvailabilityForDate);

// A staff member's own schedule
router.get("/my-bookings", protectStaff, getMyBookings);
router.get("/bookings/:bookingId", protectStaff, getBookingById);
router.patch("/bookings/:bookingId/status", protectStaff, updateBookingStatus);

// Dashboard stats — Home stat tiles, Weekly Summary, Top Customer
router.get("/stats/home", protectStaff, getHomeStats);
router.get("/stats/weekly", protectStaff, getWeeklySummary);
router.get("/stats/top-customer", protectStaff, getTopCustomer);

// Reviews — Average Rating, Recent Reviews
router.get("/reviews/summary", protectStaff, getMyReviewSummary);
router.get("/reviews/recent", protectStaff, getMyRecentReviews);

// Notifications — new bookings, cancellations/reschedules by
// customers, and new reviews, all real triggers wired in
// bookingController.js / reviewController.js.
router.get("/notifications", protectStaff, getMyStaffNotifications);
router.get("/notifications/unread-count", protectStaff, getStaffUnreadCount);
router.patch("/notifications/:notificationId/read", protectStaff, markStaffAsRead);
router.patch("/notifications/read-all", protectStaff, markAllStaffAsRead);

module.exports = router;
