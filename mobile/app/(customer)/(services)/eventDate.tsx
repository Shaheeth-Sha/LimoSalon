import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

// Bridal-only, first half of the date/time step — matches the Figma
// "Event Date" frame: a real month calendar grid (not the horizontal
// date-card scroller used everywhere else in the app). Every other
// booking type keeps using the combined dateTime.tsx screen
// unchanged; this only replaces that step for bridal.
//
// Also doubles as the "Change Date" destination from reviewBooking.tsx
// — when editMode="true" arrives in params, every other already-known
// field (staff, hold, trial info) is simply carried through untouched
// on to eventTime.tsx, which is the screen that actually needs to
// create a fresh hold and jump straight back to Review.

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Weddings are typically booked and planned months ahead — unlike the
// 30-day window generateDates() uses for the shared hair/face/body/
// nail flow (dateTime.tsx, rescheduleDateTime.tsx), which stays as-is.
// Bridal gets its own, much longer horizon so future months are
// actually selectable.
const BOOKING_WINDOW_DAYS = 365;

const getParamValue = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
};

const formatLocalDate = (date: Date): string => {
  return (
    `${date.getFullYear()}-` +
    `${String(date.getMonth() + 1).padStart(2, "0")}-` +
    `${String(date.getDate()).padStart(2, "0")}`
  );
};

const formatDisplayDate = (dateStr: string): string => {
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

const buildMonthGrid = (monthDate: Date): (Date | null)[][] => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
};

export default function EventDate() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const editMode = getParamValue(params.editMode) === "true";

  // Forwarded untouched to eventTime.tsx regardless of where this
  // screen was entered from (normal flow or "Change Date").
  const forwardParams = {
    selectedServices: getParamValue(params.selectedServices),
    selectedLength: getParamValue(params.selectedLength),
    totalAmount: getParamValue(params.totalAmount),
    bookingType: getParamValue(params.bookingType),
    selectedStaff: getParamValue(params.selectedStaff),
    estimatedDuration: getParamValue(params.estimatedDuration),
    holdId: getParamValue(params.holdId),
    holdExpiresAt: getParamValue(params.holdExpiresAt),
    holdExpiresInSeconds: getParamValue(params.holdExpiresInSeconds),
    wantsTrialMakeup: getParamValue(params.wantsTrialMakeup),
    trialMakeupDate: getParamValue(params.trialMakeupDate),
    trialMakeupTime: getParamValue(params.trialMakeupTime),
    // Only meaningful once a trial hold already exists (edit path) —
    // carried through so eventTime.tsx can protect it with
    // keepHoldId when it refreshes the main event's hold.
    trialHoldId: getParamValue(params.trialHoldId),
    trialHoldExpiresAt: getParamValue(params.trialHoldExpiresAt),
    trialHoldExpiresInSeconds: getParamValue(params.trialHoldExpiresInSeconds),
    notes: getParamValue(params.notes),
    editMode: editMode ? "true" : undefined,
    // Only set on the reschedule path (from reschedule.tsx) — tells
    // eventTime.tsx to reserve the new slot with excludeBookingId
    // instead of the normal booking-flow hold logic, and to hand off
    // to rescheduleConfirm.tsx instead of staff.tsx/reviewBooking.tsx.
    bookingId: getParamValue(params.bookingId),
    rescheduleMode: getParamValue(params.rescheduleMode),
    serviceName: getParamValue(params.serviceName),
  };

  const today = useMemo(() => new Date(), []);
  const minDate = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);
  const maxDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + BOOKING_WINDOW_DAYS - 1);
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const initialSelectedDate = getParamValue(params.selectedDate);
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
  const [viewMonth, setViewMonth] = useState(() =>
    initialSelectedDate
      ? startOfMonth(new Date(`${initialSelectedDate}T00:00:00`))
      : startOfMonth(today)
  );

  const weeks = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);

  const canGoPrevMonth = startOfMonth(viewMonth) > startOfMonth(minDate);
  const canGoNextMonth = startOfMonth(viewMonth) < startOfMonth(maxDate);

  const monthLabel = viewMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Event Date</Text>
      </View>

      <Text style={styles.subText}>Select Event Date</Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.calendarCard}>
          <View style={styles.monthRow}>
            <TouchableOpacity
              disabled={!canGoPrevMonth}
              onPress={() =>
                setViewMonth(
                  (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                )
              }
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={canGoPrevMonth ? "#FF2D75" : "#DDD"}
              />
            </TouchableOpacity>

            <Text style={styles.monthLabel}>{monthLabel}</Text>

            <TouchableOpacity
              disabled={!canGoNextMonth}
              onPress={() =>
                setViewMonth(
                  (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                )
              }
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={canGoNextMonth ? "#FF2D75" : "#DDD"}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAY_LABELS.map((label) => (
              <Text key={label} style={styles.weekdayLabel}>
                {label}
              </Text>
            ))}
          </View>

          {weeks.map((week, weekIndex) => (
            <View key={weekIndex} style={styles.weekRow}>
              {week.map((cellDate, cellIndex) => {
                if (!cellDate) {
                  return <View key={cellIndex} style={styles.dayCell} />;
                }

                const cellDateStr = formatLocalDate(cellDate);
                const isDisabled = cellDate < minDate || cellDate > maxDate;
                const isSelected = cellDateStr === selectedDate;

                return (
                  <TouchableOpacity
                    key={cellIndex}
                    disabled={isDisabled}
                    style={styles.dayCell}
                    onPress={() => setSelectedDate(cellDateStr)}
                  >
                    <View
                      style={[
                        styles.dayCircle,
                        isSelected && styles.dayCircleSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          isDisabled && styles.dayTextDisabled,
                          isSelected && styles.dayTextSelected,
                        ]}
                      >
                        {cellDate.getDate()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        <Text style={styles.selectedLabel}>Selected Date</Text>
        <View style={styles.selectedBox}>
          <Text style={styles.selectedValue}>
            {selectedDate ? formatDisplayDate(selectedDate) : "-"}
          </Text>
          <Ionicons name="calendar-outline" size={18} color="#777" />
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.bottom}>
        <TouchableOpacity
          disabled={!selectedDate}
          style={[styles.continue, !selectedDate && styles.disabledButton]}
          onPress={() =>
            router.push({
              pathname: "/(customer)/(services)/eventTime",
              params: {
                ...forwardParams,
                selectedDate,
              },
            })
          }
        >
          <Text style={styles.continueText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F7", paddingTop: 50, paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  headerText: { fontSize: 18, fontWeight: "700", marginLeft: 10 },
  subText: { fontSize: 13, color: "#777", marginBottom: 18 },
  calendarCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#FF2D75",
    padding: 14,
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  monthLabel: { fontSize: 15, fontWeight: "800", color: "#111" },
  weekdayRow: { flexDirection: "row", marginBottom: 6 },
  weekdayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    color: "#999",
    fontWeight: "700",
  },
  weekRow: { flexDirection: "row" },
  dayCell: { flex: 1, aspectRatio: 1, justifyContent: "center", alignItems: "center" },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  dayCircleSelected: { backgroundColor: "#FF2D75" },
  dayText: { fontSize: 13, color: "#111" },
  dayTextDisabled: { color: "#DDD" },
  dayTextSelected: { color: "#fff", fontWeight: "800" },
  selectedLabel: { fontSize: 14, fontWeight: "700", color: "#111", marginTop: 20, marginBottom: 8 },
  selectedBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DADADA",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  selectedValue: { fontSize: 14, color: "#111" },
  bottom: {
    position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff",
    padding: 15, borderTopLeftRadius: 25, borderTopRightRadius: 25, elevation: 8,
  },
  continue: { backgroundColor: "#FF2D75", padding: 14, borderRadius: 25, alignItems: "center" },
  disabledButton: { opacity: 0.5 },
  continueText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
