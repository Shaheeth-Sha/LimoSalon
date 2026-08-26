import React, { useCallback, useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
// Fixed: this screen was importing SafeAreaView from 'react-native'
// itself, which is a deprecated, iOS-only component — on Android it
// applies NO inset at all, so the "My Schedule" title and the
// Availability button were rendering directly under the status bar
// (clock/signal/battery), same bug the other staff screens already
// avoid by using react-native-safe-area-context instead.
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../config/api";
import { useStaffUnreadCount } from "../../hooks/useStaffUnreadCount";

const MY_BOOKINGS_API = `${BASE_URL}/api/staff/my-bookings`;

type Booking = {
  _id: string;
  customer?: { name?: string };
  services: { name: string }[];
  selectedDate: string;
  selectedTime: string;
  status: string;
  effectiveStatus: string;
};

const formatLocalDate = (date: Date): string => {
  return (
    `${date.getFullYear()}-` +
    `${String(date.getMonth() + 1).padStart(2, "0")}-` +
    `${String(date.getDate()).padStart(2, "0")}`
  );
};

export default function MySchedule() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { unreadCount } = useStaffUnreadCount();

  // Real calendar
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(today);
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthTitle = currentDate.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // Dates that actually have at least one active booking on them get
  // a dot under the day number — the customer app already gives the
  // staff member no other way to eyeball "what does this month look
  // like" before drilling into a specific day.
  const bookedDateStrings = new Set(
    bookings
      .filter((b) => b.status !== "Cancelled" && b.status !== "Completed")
      .map((b) => b.selectedDate)
  );

  const loadBookings = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("staffToken");

      if (!token) {
        router.replace("/");
        return;
      }

      const res = await fetch(MY_BOOKINGS_API, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        await AsyncStorage.multiRemove(["staffToken", "staffData"]);
        router.replace("/");
        return;
      }

      setBookings(Array.isArray(data.bookings) ? data.bookings : []);
    } catch (error) {
      console.error("Load staff bookings failed:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (isFocused) {
      loadBookings();
    }
  }, [isFocused, loadBookings]);

  const selectedDateStr = formatLocalDate(new Date(year, month, selectedDay || 1));

  // Fixed: cancelled appointments were filtered out of the selected
  // day's list entirely, so a cancellation just made that slot vanish
  // instead of showing up (with a clear "Cancelled" pill) the way
  // Today's Jobs already does — a staff member checking their day has
  // no way to tell "nothing was ever booked" apart from "something
  // was booked and then cancelled" without this.
  const appointments = bookings
    .filter((b) => b.selectedDate === selectedDateStr)
    .sort((a, b) => a.selectedTime.localeCompare(b.selectedTime))
    .map((b) => ({
      id: b._id,
      time: b.selectedTime,
      name: b.customer?.name || "Customer",
      service: (b.services || []).map((s) => s.name).join(", ") || "Service",
      status: b.effectiveStatus || b.status,
      rawStatus: b.status,
    }));

  return (
    <View style={{ flex: 1, backgroundColor: "#FFF" }}>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>My Schedule</Text>
            <TouchableOpacity
              style={styles.availabilityBtn}
              activeOpacity={0.8}
              onPress={() => router.push('/update-availability')}
            >
              <Ionicons name="toggle-outline" size={16} color="#FFF" />
              <Text style={styles.availabilityBtnText}>Availability</Text>
            </TouchableOpacity>
          </View>

          {/* CALENDAR */}
          <View style={styles.calendarBox}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity
                onPress={() => {
                  setCurrentDate(new Date(year, month - 1, 1));
                  setSelectedDay(1);
                }}
              >
                <Ionicons name="chevron-back" size={26} color="#fff" />
              </TouchableOpacity>

              <Text style={styles.monthTitle}>{monthTitle}</Text>

              <TouchableOpacity
                onPress={() => {
                  setCurrentDate(new Date(year, month + 1, 1));
                  setSelectedDay(1);
                }}
              >
                <Ionicons name="chevron-forward" size={26} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.weekDays}>
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                <Text key={d} style={styles.weekDayText}>
                  {d}
                </Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {calendarDays.map((day, index) => {
                const isToday =
                  day === today.getDate() &&
                  month === today.getMonth() &&
                  year === today.getFullYear();

                const isSelected = day === selectedDay;
                const hasBookings =
                  day !== null &&
                  bookedDateStrings.has(formatLocalDate(new Date(year, month, day)));

                return (
                  <TouchableOpacity
                    key={index}
                    disabled={!day}
                    activeOpacity={0.8}
                    onPress={() => day && setSelectedDay(day)}
                    style={[
                      styles.dayCell,
                      isSelected && styles.selectedDay,
                    ]}
                  >
                    {day ? (
                      <View
                        style={[
                          styles.todayCircle,
                          isToday && styles.todayCircleActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            isSelected && styles.selectedDayText,
                          ]}
                        >
                          {day}
                        </Text>
                        {hasBookings && <View style={styles.bookedDot} />}
                      </View>
                    ) : (
                      <Text style={styles.dayText}></Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <Text style={styles.sectionTitle}>
            {selectedDay === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear()
              ? "Today's Appointments"
              : "Appointments"}
          </Text>

          {loading ? (
            <ActivityIndicator size="large" color="#FF1462" style={{ marginTop: 10 }} />
          ) : appointments.length === 0 ? (
            <Text style={styles.emptyText}>No appointments on this day.</Text>
          ) : (
            appointments.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.slotContainer}
                activeOpacity={0.7}
                onPress={() =>
                  router.push({
                    pathname: "/schedule",
                    params: {
                      bookingId: item.id,
                      customerName: item.name,
                      service: item.service,
                      date: selectedDateStr,
                      time: item.time,
                      status: item.rawStatus,
                    },
                  })
                }
              >
                <View style={styles.timeBox}>
                  <Text style={styles.timeText}>{item.time}</Text>
                </View>

                <View style={styles.appointmentInfo}>
                  <Text style={styles.appointmentName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.appointmentService} numberOfLines={1}>{item.service}</Text>
                </View>

                <View
                  style={[
                    styles.statusBox,
                    item.status === "Completed"
                      ? styles.completedBox
                      : item.status === "Cancelled"
                      ? styles.cancelledBox
                      : item.status === "Pending"
                      ? styles.pendingBox
                      : styles.bookedBox,
                  ]}
                >
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>

      {/* BOTTOM TAB BAR - unchanged */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.push("/home")}>
          <Ionicons name="home" size={24} color="#FFF" />
          <Text style={styles.tabLabel}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItemActive}>
          <Ionicons name="calendar" size={24} color="#FF1462" />
          <Text style={styles.tabLabelActive}>Schedule</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => router.push("/Notifications")}>
          <View>
            <Ionicons name="chatbubble" size={24} color="#FFF" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            )}
          </View>
          <Text style={styles.tabLabel}>Notification</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => router.push("/Profile Page")}>
          <Ionicons name="person" size={24} color="#FFF" />
          <Text style={styles.tabLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  scrollContent: {
    padding: 25,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    fontFamily: "serif",
  },

  availabilityBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF1462",
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 14,
    shadowColor: "#FF1462",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },

  availabilityBtnText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 5,
  },

  calendarBox: {
    backgroundColor: "#DCA0B6",
    borderRadius: 24,
    padding: 14,
    marginTop: 20,
    marginBottom: 24,
  },

  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },

  monthTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
  },

  weekDays: {
    flexDirection: "row",
    marginBottom: 8,
  },

  weekDayText: {
    width: "14.28%",
    textAlign: "center",
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "#FFF",
    borderRadius: 14,
    overflow: "hidden",
  },

  dayCell: {
    width: "14.28%",
    height: 42,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderWidth: 0.5,
    borderColor: "#F3D9E3",
  },

  selectedDay: {
    backgroundColor: "#FBE1EA",
  },

  todayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },

  todayCircleActive: {
    borderWidth: 2,
    borderColor: "#FF1462",
  },

  dayText: {
    color: "#2A2A2A",
    fontSize: 15,
    fontWeight: "700",
  },

  selectedDayText: {
    color: "#FF1462",
    fontWeight: "900",
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
  },

  slotContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },

  timeBox: {
    width: 90,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#FF1462",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  timeText: {
    fontSize: 13,
    fontWeight: "700",
  },

  appointmentInfo: {
    flex: 1,
    marginRight: 10,
  },

  appointmentName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
  },

  appointmentService: {
    fontSize: 13,
    color: "#777",
    marginTop: 2,
  },

  statusBox: {
    minWidth: 90,
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  availableBox: {
    backgroundColor: "#EAAEC5",
  },

  bookedBox: {
    backgroundColor: "#FF1462",
  },

  completedBox: {
    backgroundColor: "#2ECC71",
  },

  cancelledBox: {
    backgroundColor: "#9E9E9E",
  },

  pendingBox: {
    backgroundColor: "#1D5FAB",
  },

  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFF",
  },

  emptyText: {
    color: "#8E8E93",
    fontSize: 14,
    marginBottom: 10,
  },

  bookedDot: {
    position: "absolute",
    bottom: -6,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#FF1462",
  },

  tabBar: {
    flexDirection: "row",
    height: 80,
    backgroundColor: "#FF1462",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    justifyContent: "space-around",
    alignItems: "center",
    paddingBottom: 10,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },

  tabItem: {
    alignItems: "center",
  },

  tabItemActive: {
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 10,
    borderRadius: 20,
  },

  tabLabel: {
    color: "#FFF",
    fontSize: 12,
  },

  tabLabelActive: {
    color: "#FF1462",
    fontSize: 12,
    fontWeight: "bold",
  },

  badge: {
    position: "absolute",
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#FF1462",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 2,
  },

  badgeText: {
    color: "#FF1462",
    fontSize: 9,
    fontWeight: "700",
  },
});