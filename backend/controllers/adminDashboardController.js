const Booking = require("../models/Booking");
const Staff = require("../models/Staff");
const Customer = require("../models/Customer");

const toDateString = (date) => date.toISOString().slice(0, 10);

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

// Percent change with no divide-by-zero surprises. previous === 0 is
// reported as null rather than 0% or Infinity — the frontend shows
// "New" for that case instead of a misleading percentage, since
// "up 100%" from a true zero baseline isn't a meaningful trend yet.
const percentChange = (current, previous) => {
  if (previous === 0) return current > 0 ? null : 0;
  return Math.round(((current - previous) / previous) * 100);
};

/* -------------------------------------------------------------------------- */
/*                          Admin: Dashboard overview                         */
/* -------------------------------------------------------------------------- */
const getDashboardStats = async (req, res) => {
  try {
    const activeStaffCount = await Staff.countDocuments({ isActive: true });

    const last7Days = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7Days.push(toDateString(d));
    }

    const recentBookings = await Booking.find({
      selectedDate: { $in: last7Days },
      status: "Completed",
    })
      .select("selectedDate totalAmount")
      .lean();

    const revenueByDay = last7Days.map((date) => ({
      date,
      revenue: recentBookings
        .filter((b) => b.selectedDate === date)
        .reduce((sum, b) => sum + (b.totalAmount || 0), 0),
    }));

    // The Figma Dashboard's three headline cards (Total appointments /
    // Revenue / Active staff) are an all-time, at-a-glance snapshot —
    // deliberately not date-scoped, unlike Reports' own Appointment
    // Summary / Revenue Summary screens which always show a range
    // picker. Definitions mirror adminReportController.js exactly so
    // the same word means the same thing everywhere in the admin: every
    // booking counts as an "appointment" regardless of status, and
    // "revenue" excludes Cancelled bookings the same way
    // getRevenueSummary does.
    const [totalAppointments, revenueAgg] = await Promise.all([
      Booking.countDocuments({}),
      Booking.aggregate([
        { $match: { status: { $ne: "Cancelled" } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
    ]);

    const totalRevenue = revenueAgg[0]?.total || 0;

    // A raw running total ("116 appointments") doesn't tell an owner
    // whether the business is speeding up or slowing down. These
    // compare the last 7 days against the 7 days before that — same
    // window the revenue chart already uses — so the headline cards
    // get a trend without introducing yet another date range.
    const previous7Days = [];
    for (let i = 13; i >= 7; i -= 1) {
      previous7Days.push(toDateString(daysAgo(i)));
    }

    const [thisWeekAppointments, lastWeekAppointments, thisWeekRevenueAgg, lastWeekRevenueAgg] =
      await Promise.all([
        Booking.countDocuments({ selectedDate: { $in: last7Days } }),
        Booking.countDocuments({ selectedDate: { $in: previous7Days } }),
        Booking.aggregate([
          { $match: { selectedDate: { $in: last7Days }, status: { $ne: "Cancelled" } } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ]),
        Booking.aggregate([
          { $match: { selectedDate: { $in: previous7Days }, status: { $ne: "Cancelled" } } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ]),
      ]);

    const thisWeekRevenue = thisWeekRevenueAgg[0]?.total || 0;
    const lastWeekRevenue = lastWeekRevenueAgg[0]?.total || 0;

    const trends = {
      appointments: {
        thisWeek: thisWeekAppointments,
        percentChange: percentChange(thisWeekAppointments, lastWeekAppointments),
      },
      revenue: {
        thisWeek: thisWeekRevenue,
        percentChange: percentChange(thisWeekRevenue, lastWeekRevenue),
      },
    };

    // Client base health — a real salon owner cares about this as
    // much as revenue, and it costs nothing extra to compute since
    // Customer already carries createdAt.
    const [totalCustomers, newCustomersThisWeek] = await Promise.all([
      Customer.countDocuments({}),
      Customer.countDocuments({ createdAt: { $gte: daysAgo(7) } }),
    ]);

    // Leaderboards — same 7-day window, same non-Cancelled revenue
    // definition as everything else above. $unwind splits each
    // booking's services array into one row per service so a booking
    // with 3 services contributes to all 3 service totals, not just
    // the first.
    const [topServices, topStaff] = await Promise.all([
      Booking.aggregate([
        { $match: { selectedDate: { $in: last7Days }, status: { $ne: "Cancelled" } } },
        { $unwind: "$services" },
        {
          $group: {
            _id: "$services.name",
            bookings: { $sum: 1 },
            revenue: { $sum: "$services.price" },
          },
        },
        // Tie-break on revenue so equal booking counts settle in the
        // order an owner would actually expect (most bookings first,
        // then whichever made more money), instead of an arbitrary
        // Mongo insertion-order tie.
        { $sort: { bookings: -1, revenue: -1 } },
        { $limit: 3 },
      ]),
      Booking.aggregate([
        {
          $match: {
            selectedDate: { $in: last7Days },
            status: { $ne: "Cancelled" },
            "staff.name": { $nin: [null, ""] },
          },
        },
        {
          $group: {
            _id: "$staff.name",
            bookings: { $sum: 1 },
            revenue: { $sum: "$totalAmount" },
          },
        },
        { $sort: { bookings: -1, revenue: -1 } },
        { $limit: 3 },
      ]),
    ]);

    // Beyond the Figma mockup's static three cards, a real admin
    // opening this page every morning wants to know two things
    // immediately: what's on today, and what needs a decision. Both
    // reuse the same Booking data already being queried above, so
    // this stays one API call instead of the dashboard making a
    // second round trip to the Reports endpoints for the same data.
    const today = toDateString(new Date());

    // Upcoming (strictly after today) mirrors the "Today's Appointment" /
    // "Upcoming Appointments" split staff already see in their own app —
    // an admin needs the same forward-looking view, not just today's
    // list, e.g. to see the two bookings made for tomorrow that today's
    // list alone would never surface. selectedDate is stored as a plain
    // YYYY-MM-DD string throughout this codebase, so $gt on it sorts
    // chronologically the same way $gte/$lte already do elsewhere here.
    const [pendingBookings, todaysAppointmentDocs, upcomingCount, upcomingAppointmentDocs] = await Promise.all([
      Booking.countDocuments({ status: "Pending" }),
      Booking.find({ selectedDate: today, status: { $ne: "Cancelled" } })
        .sort({ selectedTime: 1 })
        .populate("customer", "name")
        .lean(),
      Booking.countDocuments({ selectedDate: { $gt: today }, status: { $ne: "Cancelled" } }),
      Booking.find({ selectedDate: { $gt: today }, status: { $ne: "Cancelled" } })
        .sort({ selectedDate: 1, selectedTime: 1 })
        .limit(8)
        .populate("customer", "name")
        .lean(),
    ]);

    const todaysAppointments = todaysAppointmentDocs.map((b) => ({
      id: b._id,
      time: b.selectedTime,
      customerName: b.customer?.name || "Customer",
      service: (b.services || []).map((s) => s.name).filter(Boolean).join(", "),
      staff: b.staff?.name || "-",
      status: b.status,
    }));

    const upcomingAppointments = upcomingAppointmentDocs.map((b) => ({
      id: b._id,
      date: b.selectedDate,
      time: b.selectedTime,
      customerName: b.customer?.name || "Customer",
      service: (b.services || []).map((s) => s.name).filter(Boolean).join(", "),
      staff: b.staff?.name || "-",
      status: b.status,
    }));

    return res.status(200).json({
      success: true,
      stats: {
        totalAppointments,
        totalRevenue,
        activeStaffCount,
        totalCustomers,
        newCustomersThisWeek,
        pendingBookings,
        todaysAppointments,
        upcomingCount,
        upcomingAppointments,
        revenueByDay,
        trends,
        topServices: topServices.map((s) => ({ name: s._id || "Unnamed", bookings: s.bookings, revenue: s.revenue })),
        topStaff: topStaff.map((s) => ({ name: s._id, bookings: s.bookings, revenue: s.revenue })),
      },
    });
  } catch (error) {
    console.error("Get admin dashboard stats error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load dashboard stats",
      error: error.message,
    });
  }
};

module.exports = { getDashboardStats };
