// Shared by both the staff and customer notifications screens so the
// two apps group time the same way. Buckets, in order: Today,
// Yesterday, Last Week (2-7 days ago), Last Month (8-30 days ago),
// then individual month names for anything older within the current
// year (e.g. "July"), then plain years for anything from a previous
// year (e.g. "2024") — the same descending-recency pattern most real
// apps (Gmail, WhatsApp) use for notification/message lists.
//
// Callers must pass items already sorted newest-first (every
// getMyNotifications-style endpoint in this app already sorts by
// createdAt: -1) — that ordering is what keeps both the items *within*
// each bucket, and the buckets themselves, in the right order without
// this function needing to re-sort anything itself.

export type DateGroupable = {
  createdAt: string;
};

export type DateGroup<T> = {
  label: string;
  items: T[];
};

export function groupNotificationsByDate<T extends DateGroupable>(
  items: T[]
): DateGroup<T>[] {
  const now = new Date();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const startOfLastWeek = new Date(startOfToday);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

  const startOfLastMonth = new Date(startOfToday);
  startOfLastMonth.setDate(startOfLastMonth.getDate() - 30);

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
    const createdAt = new Date(item.createdAt);

    if (createdAt >= startOfToday) {
      pushTo('Today', item);
    } else if (createdAt >= startOfYesterday) {
      pushTo('Yesterday', item);
    } else if (createdAt >= startOfLastWeek) {
      pushTo('Last Week', item);
    } else if (createdAt >= startOfLastMonth) {
      pushTo('Last Month', item);
    } else if (createdAt.getFullYear() === now.getFullYear()) {
      pushTo(createdAt.toLocaleDateString('en-US', { month: 'long' }), item);
    } else {
      pushTo(String(createdAt.getFullYear()), item);
    }
  }

  return order.map((label) => ({ label, items: buckets.get(label)! }));
}
