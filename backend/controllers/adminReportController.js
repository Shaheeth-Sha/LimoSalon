const Booking = require("../models/Booking");

const toDateString = (date) => date.toISOString().slice(0, 10);

// Defaults to the last 90 days when no range is given — the Reports
// screens always show a date-range picker, but a sane default means
// the page still shows something useful on first load before the
// admin has picked a range.
const parseDateRange = (query) => {
  const end = query.endDate || toDateString(new Date());
  const start =
    query.startDate || toDateString(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));

  return { start, end };
};

// Row cap for the on-screen table (keeps normal browsing fast). CSV
// export asks for limit=all, which lifts the cap to a still-sane
// ceiling rather than truly unlimited, so one enormous range can't
// take down the request.
const parseLimit = (query) => {
  if (query.limit === "all") return 10000;
  return Math.min(Number(query.limit) || 100, 500);
};

// Both report endpoints support the same optional narrowing filters:
// a staff member and a service. Booking.staff.name / .services[].name
// are snapshotted at booking time (frozen to what they were when the
// booking was made, same convention as everywhere else in this
// codebase — see the "Snapshotted at booking time" comments in
// Booking.js) — so a staff member or service renamed later would
// silently stop matching a name-based filter on their older bookings.
// Booking.staff.staffId / .services[].serviceId are snapshotted too,
// but as an id rather than a display string, so they stay correct
// forever. Filtering on those instead, exactly like the existing
// booking-conflict check in bookingController.js already does.
const applyEntityFilters = (filter, query) => {
  if (query.staffId) {
    filter["staff.staffId"] = String(query.staffId).trim();
  }
  if (query.serviceId) {
    filter["services.serviceId"] = String(query.serviceId).trim();
  }
  return filter;
};

/* -------------------------------------------------------------------------- */
/*            Admin: appointment summary across every staff member            */
/* -------------------------------------------------------------------------- */
const getAppointmentSummary = async (req, res) => {
  try {
    const { start, end } = parseDateRange(req.query);
    const limit = parseLimit(req.query);

    const filter = { selectedDate: { $gte: start, $lte: end } };
    applyEntityFilters(filter, req.query);
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // totalMatching is counted against the same filter with no limit,
    // so the frontend can tell the admin when the table they're
    // looking at isn't the whole story (e.g. "showing 100 of 342")
    // instead of silently dropping rows off the bottom.
    const [totalMatching, bookings] = await Promise.all([
      Booking.countDocuments(filter),
      Booking.find(filter)
        .sort({ selectedDate: -1, selectedTime: -1 })
        .limit(limit)
        .populate("customer", "name")
        .lean(),
    ]);

    const appointments = bookings.map((b) => ({
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
      range: { start, end },
      count: appointments.length,
      totalMatching,
      truncated: totalMatching > appointments.length,
      appointments,
    });
  } catch (error) {
    console.error("Get appointment summary error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load appointment summary",
      error: error.message,
    });
  }
};

/* -------------------------------------------------------------------------- */
/*              Admin: revenue summary across every staff member              */
/* -------------------------------------------------------------------------- */
const getRevenueSummary = async (req, res) => {
  try {
    const { start, end } = parseDateRange(req.query);
    const limit = parseLimit(req.query);

    // Cancelled bookings never collected/owe revenue — excluded so
    // the totals below reflect money actually charged, not booked.
    const filter = {
      selectedDate: { $gte: start, $lte: end },
      status: { $ne: "Cancelled" },
    };
    applyEntityFilters(filter, req.query);

    // The grand total, client count and payment-method breakdown are
    // computed over EVERY matching booking via aggregation, not just
    // the page of rows returned for display — otherwise, on a range
    // wider than the row cap, the "Total" footer would understate
    // real revenue without any indication it was doing so. A salon
    // reconciling a literal cash drawer against that number needs it
    // to be exact.
    const [totalMatching, bookings, totalsAgg, paymentBreakdownAgg] = await Promise.all([
      Booking.countDocuments(filter),
      Booking.find(filter)
        .sort({ selectedDate: -1 })
        .limit(limit)
        .populate("customer", "name")
        .lean(),
      Booking.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$totalAmount" },
            clients: { $addToSet: "$customer" },
          },
        },
      ]),
      Booking.aggregate([
        { $match: filter },
        {
          $group: {
            _id: { $ifNull: ["$paymentMethod", "Unspecified"] },
            amount: { $sum: "$totalAmount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { amount: -1 } },
      ]),
    ]);

    const revenue = bookings.map((b) => ({
      id: b._id,
      date: b.selectedDate,
      clientName: b.customer?.name || "Customer",
      service: (b.services || []).map((s) => s.name).filter(Boolean).join(", "),
      stylist: b.staff?.name || "-",
      paymentMethod: b.paymentMethod || "-",
      advance: b.advancePayment || 0,
      amount: b.totalAmount || 0,
    }));

    const totalAmount = totalsAgg[0]?.totalAmount || 0;
    const totalClients = totalsAgg[0]?.clients?.length || 0;
    const paymentBreakdown = paymentBreakdownAgg.map((p) => ({
      method: p._id || "Unspecified",
      amount: p.amount,
      count: p.count,
    }));

    return res.status(200).json({
      success: true,
      range: { start, end },
      count: revenue.length,
      totalMatching,
      truncated: totalMatching > revenue.length,
      totalClients,
      totalAmount,
      paymentBreakdown,
      revenue,
    });
  } catch (error) {
    console.error("Get revenue summary error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load revenue summary",
      error: error.message,
    });
  }
};

module.exports = { getAppointmentSummary, getRevenueSummary };
