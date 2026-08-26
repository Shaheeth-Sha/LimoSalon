// Groups a list of bookings into real-world date sections, the same
// spirit as groupNotificationsByDate.ts but bidirectional: bookings can
// be in the future (Upcoming tab) as well as the past (Past tab), so
// the bucket labels read naturally in either direction instead of
// notification-style "how long ago" phrasing applied to a future date.
//
// Upcoming: Today / Tomorrow / This Week / Next Week / month name (this
// year) / year (future years) — matches how calendar/agenda apps like
// Google Calendar or Calendly group upcoming events.
//
// Past: Today / Yesterday / Last Week / Last Month / month name (this
// year) / year (older years) — mirrors groupNotificationsByDate.ts
// exactly, since "recently completed/cancelled" reads the same way a
// notification does.
//
// Requires the caller to pass items pre-sorted the right direction for
// the tab: ascending (soonest first) for "upcoming", descending (most
// recent first) for "past" — this only buckets, it doesn't re-sort.

export type BookingGroupable = { selectedDate: string }; // "YYYY-MM-DD"
export type BookingGroup<T> = { label: string; items: T[] };

const parseDateOnly = (dateStr: string): Date => {
  const [year, month, day] = (dateStr || "").split("-").map(Number);
  return new Date(year || 1970, (month || 1) - 1, day || 1);
};

export function groupBookingsByDate<T extends BookingGroupable>(
  items: T[],
  direction: "upcoming" | "past"
): BookingGroup<T>[] {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const buckets = new Map<string, T[]>();
  const order: string[] = [];

  const pushTo = (label: string, item: T) => {
    if (!buckets.has(label)) {
      buckets.set(label, []);
      order.push(label);
    }
    buckets.get(label)!.push(item);
  };

  for (const item of items) {
    const date = parseDateOnly(item.selectedDate);
    const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((startOfDate.getTime() - startOfToday.getTime()) / 86400000);

    if (direction === "upcoming") {
      if (diffDays <= 0) pushTo("Today", item);
      else if (diffDays === 1) pushTo("Tomorrow", item);
      else if (diffDays <= 6) pushTo("This Week", item);
      else if (diffDays <= 13) pushTo("Next Week", item);
      else if (date.getFullYear() === today.getFullYear())
        pushTo(date.toLocaleDateString("en-US", { month: "long" }), item);
      else pushTo(String(date.getFullYear()), item);
    } else if (diffDays === 0) {
      pushTo("Today", item);
    } else if (diffDays > 0) {
      // Fixed: a booking dated AFTER today can still land in the Past
      // tab (isPast gets forced true the moment staff marks it
      // Completed/Cancelled, even ahead of its actual scheduled date —
      // see bookingController.js/staffScheduleController.js's
      // getMyBookings). The old `daysAgo <= 0` check treated every one
      // of those as "Today" regardless of how far out the real date
      // was, so a booking for tomorrow (or later) completed early
      // showed up misfiled under today's date. Label it by its real
      // date instead of lying about when it happened.
      if (diffDays === 1) pushTo("Tomorrow", item);
      else if (diffDays <= 6) pushTo("This Week", item);
      else if (diffDays <= 13) pushTo("Next Week", item);
      else if (date.getFullYear() === today.getFullYear())
        pushTo(date.toLocaleDateString("en-US", { month: "long" }), item);
      else pushTo(String(date.getFullYear()), item);
    } else {
      const daysAgo = -diffDays;
      if (daysAgo === 1) pushTo("Yesterday", item);
      else if (daysAgo <= 7) pushTo("Last Week", item);
      else if (daysAgo <= 30) pushTo("Last Month", item);
      else if (date.getFullYear() === today.getFullYear())
        pushTo(date.toLocaleDateString("en-US", { month: "long" }), item);
      else pushTo(String(date.getFullYear()), item);
    }
  }

  return order.map((label) => ({ label, items: buckets.get(label)! }));
}
