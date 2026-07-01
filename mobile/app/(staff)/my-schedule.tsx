import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function MySchedule() {
  const router = useRouter();

  // Real calendar
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(today);
  const [selectedDay, setSelectedDay] = useState(today.getDate());

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

  const appointments = [
    { time: "09:00", status: "Booked" },
    { time: "10:00", status: "Available" },
    { time: "11:00", status: "Available" },
    { time: "12:00", status: "Booked" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "#FFF" }}>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.headerTitle}>My Schedule</Text>

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
                      </View>
                    ) : (
                      <Text style={styles.dayText}></Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <Text style={styles.sectionTitle}>Today's Appointments</Text>

          {appointments.map((item, idx) => (
            <View key={idx} style={styles.slotContainer}>
              <View style={styles.timeBox}>
                <Text style={styles.timeText}>{item.time}</Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.statusBox,
                  item.status === "Booked"
                    ? styles.bookedBox
                    : styles.availableBox,
                ]}
                onPress={() =>
                  item.status === "Available" &&
                  router.push("/update-availability")
                }
              >
                <Text style={styles.statusText}>{item.status}</Text>
              </TouchableOpacity>
            </View>
          ))}

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
          <Ionicons name="chatbubble" size={24} color="#FFF" />
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

  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    fontFamily: "serif",
    marginBottom: 20,
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
    backgroundColor: "#151515",
    borderRadius: 14,
    overflow: "hidden",
  },

  dayCell: {
    width: "14.28%",
    height: 42,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#151515",
    borderWidth: 0.5,
    borderColor: "#2D2D2D",
  },

  selectedDay: {
    backgroundColor: "#EF3E3E",
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
    borderColor: "#FF9DBD",
  },

  dayText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },

  selectedDayText: {
    color: "#fff",
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
    width: 120,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#FF1462",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },

  timeText: {
    fontSize: 16,
  },

  statusBox: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },

  availableBox: {
    backgroundColor: "#EAAEC5",
  },

  bookedBox: {
    backgroundColor: "#FF1462",
  },

  statusText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
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
});