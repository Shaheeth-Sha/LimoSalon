import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Reuses the exact date/time picking UI and past-date/time logic from
// your original DateAndTime.tsx screen. Reschedule doesn't need the
// staff-selection or multi-step service wizard — the staff member
// stays the same, only the date/time changes — so this is a trimmed,
// self-contained version rather than branching the original screen
// with conditional logic everywhere.

import { BASE_URL } from "../../../config/api";
const HOLD_API = `${BASE_URL}/api/bookings/hold`;
const TIME_SLOTS_API = `${BASE_URL}/api/time-slots`;

// Same fallback DateAndTime.tsx uses if the network request itself
// fails — keeps the screen from going blank offline.
const FALLBACK_TIMES = [
  "08.00 am", "09.00 am", "10.00 am", "11.00 am",
  "12.00 pm", "01.00 pm", "02.00 pm", "03.00 pm",
];

const readJsonResponse = async (response: Response): Promise<any> => {
  const rawBody = await response.text();
  if (!rawBody) return {};

  try {
    return JSON.parse(rawBody);
  } catch {
    throw new Error(`Unexpected server response (${response.status})`);
  }
};

type DateItem = {
  id: number;
  fullDate: string;
  month: string;
  day: number;
  week: string;
  isToday: boolean;
};

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

const timeToMinutes = (time: string): number => {
  const clean = time.replace(".", ":").toLowerCase();
  const match = clean.match(/(\d+):(\d+)\s(am|pm)/);
  if (!match) return 0;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3];

  if (period === "pm" && hour !== 12) hour += 12;
  if (period === "am" && hour === 12) hour = 0;

  return hour * 60 + minute;
};

const isPastTime = (date: string, time: string): boolean => {
  const today = new Date();
  const todayDate = formatLocalDate(today);

  if (date > todayDate) return false;
  if (date < todayDate) return true;

  const currentMinutes = today.getHours() * 60 + today.getMinutes();
  return timeToMinutes(time) <= currentMinutes;
};

const generateDates = (): DateItem[] => {
  const result: DateItem[] = [];

  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);

    result.push({
      id: i,
      fullDate: formatLocalDate(date),
      month: date.toLocaleString("en-US", { month: "short" }).toUpperCase(),
      day: date.getDate(),
      week: date.toLocaleString("en-US", { weekday: "short" }),
      isToday: i === 0,
    });
  }

  return result;
};

export default function RescheduleDateTime() {
  const router = useRouter();
  const { bookingId, staffId, estimatedDuration, serviceName, bookingType } =
    useLocalSearchParams<{
      bookingId: string;
      staffId: string;
      estimatedDuration: string;
      serviceName: string;
      bookingType: string;
    }>();

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [creatingHold, setCreatingHold] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [times, setTimes] = useState<string[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(true);

  const dates = useMemo(() => generateDates(), []);

  // Fetches the same admin-editable business-hours window DateAndTime.tsx
  // uses, keyed by bookingType — this used to be a hardcoded array here,
  // which meant reschedule kept offering old/stale times after the
  // booking flow was switched over to the backend-driven list.
  useEffect(() => {
    let isCancelled = false;

    const loadTimes = async () => {
      try {
        setLoadingTimes(true);

        const response = await fetch(
          `${TIME_SLOTS_API}?bookingType=${encodeURIComponent(bookingType || "")}`
        );

        const data = await readJsonResponse(response);

        if (!response.ok) {
          throw new Error(data.message || "Unable to load available times");
        }

        if (!isCancelled) {
          const fetchedTimes = Array.isArray(data.times) ? data.times : FALLBACK_TIMES;
          setTimes(fetchedTimes.length > 0 ? fetchedTimes : FALLBACK_TIMES);
        }
      } catch (error) {
        console.error("Load time slots failed:", error);

        if (!isCancelled) {
          setTimes(FALLBACK_TIMES);
        }
      } finally {
        if (!isCancelled) {
          setLoadingTimes(false);
        }
      }
    };

    loadTimes();

    return () => {
      isCancelled = true;
    };
  }, [bookingType]);

  const handleContinue = async () => {
    if (!selectedDate || !selectedTime || creatingHold) return;

    setErrorText("");
    setCreatingHold(true);

    try {
      const token = await AsyncStorage.getItem("customerToken");

      if (!token) {
        setErrorText("Please log in again.");
        return;
      }

      const duration = Number(estimatedDuration);

      const res = await fetch(HOLD_API, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          staffId,
          selectedDate,
          selectedTime,
          estimatedDuration: duration,
          // Ensures this booking's own current slot is never treated
          // as a conflict against the new slot being reserved.
          excludeBookingId: bookingId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.hold?.holdId) {
        throw new Error(data.message || "This time slot is no longer available.");
      }

      router.push({
        pathname: "/(customer)/(services)/rescheduleConfirm",
        params: {
          bookingId,
          serviceName,
          selectedDate,
          selectedTime,
          holdId: String(data.hold.holdId),
        },
      });
    } catch (error: any) {
      setErrorText(error?.message || "Unable to reserve this time. Please try another slot.");
    } finally {
      setCreatingHold(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>

        <Text style={styles.headerText}>New Date and Time</Text>
      </View>

      <Text style={styles.subText}>
        Choose a new date and time for {serviceName || "your appointment"}
      </Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {dates.map((item) => {
            const selected = selectedDate === item.fullDate;
            const disabled = item.fullDate < formatLocalDate(new Date());

            return (
              <TouchableOpacity
                key={item.id}
                disabled={disabled}
                style={[
                  styles.dateCard,
                  selected && styles.dateActive,
                  item.isToday && styles.todayCard,
                  disabled && styles.disabledDate,
                ]}
                onPress={() => {
                  setSelectedDate(item.fullDate);
                  setSelectedTime("");
                }}
              >
                <Text style={styles.dateMonth}>{item.month}</Text>
                <Text style={styles.dateDay}>{item.day}</Text>
                <Text style={styles.dateWeek}>{item.week}</Text>
                {item.isToday && <Text style={styles.todayText}>Today</Text>}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.sectionTitle}>Available Time</Text>

        {loadingTimes ? (
          <View style={styles.timeLoaderBox}>
            <ActivityIndicator size="small" color="#FF2D75" />
            <Text style={styles.timeLoaderText}>Loading available times...</Text>
          </View>
        ) : (
          <View style={styles.timeGrid}>
            {times.map((time) => {
              const blocked = !selectedDate || isPastTime(selectedDate, time);
              const selected = selectedTime === time;

              return (
                <TouchableOpacity
                  key={time}
                  disabled={blocked}
                  style={[
                    styles.timeBox,
                    selected && styles.timeActive,
                    blocked && styles.timeDisabled,
                  ]}
                  onPress={() => setSelectedTime(time)}
                >
                  <Text
                    style={[
                      styles.timeText,
                      selected && styles.timeTextActive,
                      blocked && styles.disabledText,
                    ]}
                  >
                    {time}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.bottom}>
        <TouchableOpacity
          disabled={!selectedDate || !selectedTime || creatingHold}
          style={[
            styles.continue,
            (!selectedDate || !selectedTime || creatingHold) && styles.disabledButton,
          ]}
          onPress={handleContinue}
        >
          <Text style={styles.continueText}>
            {creatingHold ? "Reserving..." : "Continue"}
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
  subText: { fontSize: 13, color: "#777", marginBottom: 18 },
  dateCard: {
    width: 90, height: 120, backgroundColor: "#D86B91", borderRadius: 12,
    justifyContent: "space-around", alignItems: "center", marginRight: 12,
  },
  dateActive: { backgroundColor: "#FF2D75" },
  todayCard: { borderWidth: 2, borderColor: "#FF2D75" },
  disabledDate: { opacity: 0.35 },
  dateMonth: { color: "#fff", fontWeight: "700" },
  dateDay: { color: "#fff", fontSize: 22, fontWeight: "800" },
  dateWeek: { color: "#fff" },
  todayText: { color: "#fff", fontSize: 11 },
  sectionTitle: { marginTop: 25, marginBottom: 15, fontSize: 16, fontWeight: "700" },
  timeLoaderBox: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 30 },
  timeLoaderText: { marginLeft: 10, color: "#777", fontSize: 13 },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  timeBox: {
    width: "47%", height: 45, borderWidth: 1, borderColor: "#FF2D75", borderRadius: 10,
    justifyContent: "center", alignItems: "center", marginBottom: 15, backgroundColor: "#fff",
  },
  timeActive: { backgroundColor: "#FF2D75" },
  timeDisabled: { backgroundColor: "#E5E5E5", borderColor: "#CCC" },
  timeText: { color: "#111" },
  timeTextActive: { color: "#fff", fontWeight: "700" },
  disabledText: { color: "#999" },
  errorText: { color: "#D62828", fontSize: 13, marginTop: 10, textAlign: "center" },
  bottom: {
    position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff",
    padding: 15, borderTopLeftRadius: 25, borderTopRightRadius: 25, elevation: 8,
  },
  continue: { backgroundColor: "#FF2D75", padding: 14, borderRadius: 25, alignItems: "center" },
  disabledButton: { opacity: 0.5 },
  continueText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});