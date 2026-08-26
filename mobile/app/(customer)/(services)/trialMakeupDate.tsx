import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";

// Bridal-only: pick a date for the trial makeup session. Uses the
// same month-calendar-grid component as eventDate.tsx (not the
// horizontal date-card scroller used elsewhere in the app) so the
// two "date choose" steps in the Figma flow look identical.
//
// Continue always hands off to trialMakeupTime.tsx next — same
// pattern as eventDate.tsx -> eventTime.tsx, including on the "Change
// Trial Date" edit path (editMode="true"): the time screen pre-fills
// the previously chosen time and, on edit, creates a fresh hold for
// it rather than silently skipping straight back to Review. That's
// what actually protects the trial slot from being double-booked,
// and it's also what makes "No -> Yes" (no existing trial time yet)
// work correctly instead of landing back on Review with no time set.
//
// A trial makeup only makes sense before the actual event, so dates
// are capped at the day before the already-chosen event date (in
// addition to the general booking window below) whenever that event
// date is known.

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// Weddings are typically booked and planned months in advance, unlike
// the 30-day window the shared hair/face/body/nail flow uses — so
// bridal gets its own, much longer horizon.
const TRIAL_BOOKING_WINDOW_DAYS = 365;
// Matches the backend's HOLD_DURATION_MINUTES.
const HOLD_DURATION_SECONDS = 10 * 60;

const getParamValue = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
};

const formatCountdown = (seconds: number): string => {
  const safeSeconds = Math.max(seconds, 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
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

export default function TrialMakeupDate() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const editMode = getParamValue(params.editMode) === "true";

  const forwardParams = {
    selectedServices: getParamValue(params.selectedServices),
    selectedLength: getParamValue(params.selectedLength),
    selectedDate: getParamValue(params.selectedDate),
    selectedTime: getParamValue(params.selectedTime),
    selectedStaff: getParamValue(params.selectedStaff),
    totalAmount: getParamValue(params.totalAmount),
    bookingType: getParamValue(params.bookingType),
    estimatedDuration: getParamValue(params.estimatedDuration),
    holdId: getParamValue(params.holdId),
    holdExpiresAt: getParamValue(params.holdExpiresAt),
    holdExpiresInSeconds: getParamValue(params.holdExpiresInSeconds),
    // Only set on the reschedule path (from reschedule.tsx's "Change
    // Trial Date & Time" button) — tells trialMakeupTime.tsx to
    // reserve the new trial slot with excludeBookingId instead of the
    // normal booking-flow hold logic, and to hand off to
    // rescheduleConfirm.tsx instead of additionalNotes.tsx.
    bookingId: getParamValue(params.bookingId),
    rescheduleMode: getParamValue(params.rescheduleMode),
    serviceName: getParamValue(params.serviceName),
  };

  // Carried through to trialMakeupTime.tsx regardless of path — the
  // time screen decides for itself whether it needs to re-confirm.
  const existingTrialMakeupTime = getParamValue(params.trialMakeupTime);
  const notesText = getParamValue(params.notes);
  const eventDateText = getParamValue(params.selectedDate);

  // No trial hold exists yet at this point — only the main event
  // slot's hold — so this countdown tracks that one.
  const holdIdText = forwardParams.holdId;
  const holdExpiresAtText = forwardParams.holdExpiresAt;
  const holdExpiresInSecondsText = forwardParams.holdExpiresInSeconds;

  const isFocused = useIsFocused();
  const deadlineRef = useRef<number | null>(null);

  if (deadlineRef.current === null) {
    if (holdExpiresAtText) {
      const expiryTime = new Date(holdExpiresAtText).getTime();
      deadlineRef.current = Number.isNaN(expiryTime)
        ? Date.now()
        : Math.min(expiryTime, Date.now() + HOLD_DURATION_SECONDS * 1000);
    } else {
      const suppliedSeconds = Number(holdExpiresInSecondsText);
      deadlineRef.current =
        Number.isFinite(suppliedSeconds) && suppliedSeconds > 0
          ? Date.now() + suppliedSeconds * 1000
          : Date.now();
    }
  }

  const computeRemainingSeconds = () =>
    Math.max(0, Math.ceil(((deadlineRef.current as number) - Date.now()) / 1000));

  const [remainingSeconds, setRemainingSeconds] = useState(computeRemainingSeconds);
  const holdExpired = Boolean(holdIdText) && remainingSeconds <= 0;

  useEffect(() => {
    if (!holdIdText) return;
    setRemainingSeconds(computeRemainingSeconds());
  }, [isFocused, holdIdText]);

  useEffect(() => {
    if (!isFocused || !holdIdText) return;
    const timer = setInterval(() => {
      setRemainingSeconds(computeRemainingSeconds());
    }, 1000);
    return () => clearInterval(timer);
  }, [isFocused, holdIdText]);

  const goReselectDateTime = () => {
    router.replace({
      pathname: "/(customer)/(services)/eventDate",
      params: {
        selectedServices: forwardParams.selectedServices,
        selectedLength: forwardParams.selectedLength,
        totalAmount: forwardParams.totalAmount,
        bookingType: forwardParams.bookingType,
      },
    });
  };

  const today = useMemo(() => new Date(), []);
  const minDate = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  // A trial has to happen before the actual event — capped at the day
  // before, on top of the general booking window. Falls back to just
  // the window when the event date isn't known/parseable yet.
  const maxDate = useMemo(() => {
    const windowMax = new Date();
    windowMax.setDate(windowMax.getDate() + TRIAL_BOOKING_WINDOW_DAYS - 1);
    windowMax.setHours(0, 0, 0, 0);

    if (!eventDateText) return windowMax;

    const eventDate = new Date(`${eventDateText}T00:00:00`);
    if (Number.isNaN(eventDate.getTime())) return windowMax;

    const dayBeforeEvent = new Date(eventDate);
    dayBeforeEvent.setDate(dayBeforeEvent.getDate() - 1);
    dayBeforeEvent.setHours(0, 0, 0, 0);

    return dayBeforeEvent < windowMax ? dayBeforeEvent : windowMax;
  }, [eventDateText]);

  const initialSelectedDate = getParamValue(params.trialMakeupDate);
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
        <Text style={styles.headerText}>Trial Makeup Date</Text>
      </View>

      {holdIdText && (
        <View style={[styles.holdBox, holdExpired && styles.holdExpiredBox]}>
          <Ionicons
            name={holdExpired ? "alert-circle-outline" : "time-outline"}
            size={21}
            color={holdExpired ? "#D62828" : "#FF2D75"}
          />
          <View style={styles.holdTextBox}>
            <Text style={styles.holdTitle}>
              {holdExpired ? "Reservation expired" : "Slot temporarily reserved"}
            </Text>
            <Text style={styles.holdText}>
              {holdExpired
                ? "Please return and select this booking slot again."
                : `Complete the booking within ${formatCountdown(remainingSeconds)}.`}
            </Text>
          </View>
        </View>
      )}

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
          disabled={!selectedDate && !holdExpired}
          style={[styles.continue, !selectedDate && !holdExpired && styles.disabledButton]}
          onPress={() => {
            if (holdExpired) {
              goReselectDateTime();
              return;
            }

            router.push({
              pathname: "/(customer)/(services)/trialMakeupTime",
              params: {
                ...forwardParams,
                trialMakeupDate: selectedDate,
                trialMakeupTime: existingTrialMakeupTime,
                notes: notesText,
                editMode: editMode ? "true" : undefined,
              },
            });
          }}
        >
          <Text style={styles.continueText}>
            {holdExpired ? "Select Date & Time Again" : "Continue"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F7", paddingTop: 50, paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  headerText: { fontSize: 18, fontWeight: "700", marginLeft: 10 },
  holdBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF4F8",
    borderWidth: 1,
    borderColor: "#F5B8CE",
    borderRadius: 13,
    padding: 13,
    marginBottom: 14,
  },
  holdExpiredBox: { backgroundColor: "#FFF0F0", borderColor: "#F1B0B0" },
  holdTextBox: { flex: 1, marginLeft: 9 },
  holdTitle: { fontSize: 14, fontWeight: "800", color: "#111" },
  holdText: { marginTop: 2, fontSize: 12, color: "#666" },
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
