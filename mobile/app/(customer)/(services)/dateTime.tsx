import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function DateAndTime() {
  const router = useRouter();
  const { selectedServices, selectedLength } = useLocalSearchParams();

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  const currentStep = 3;

  const getNextDays = () => {
    const days = [];

    for (let i = 0; i < 4; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);

      days.push({
        id: i,
        fullDate: date.toISOString(),
        month: date.toLocaleString("en-US", { month: "short" }).toUpperCase(),
        day: date.getDate(),
        week: date.toLocaleString("en-US", { weekday: "short" }),
      });
    }

    return days;
  };

  const dates = getNextDays();

  const times = [
    "08.00 am",
    "09.00 am",
    "10.00 am",
    "11.00 am",
    "12.00 pm",
    "01.00 pm",
    "02.00 pm",
    "03.00 pm",
  ];

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>

        <Text style={styles.headerText}>Date and Time</Text>
      </View>

      {/* STEP NAVIGATION */}
      <View style={styles.stepContainer}>
        <Text style={styles.stepText}>
          Select date and available time
        </Text>

        <View style={styles.stepRow}>
          {[1, 2, 3, 4, 5].map((i) => {
            const isDone =
              i < currentStep || (i === currentStep && selectedDate && selectedTime);
            const isActive =
              i === currentStep && (!selectedDate || !selectedTime);

            return (
              <View key={i} style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    isDone && styles.stepDone,
                    isActive && styles.stepActive,
                  ]}
                >
                  {isDone && (
                    <Ionicons name="checkmark" size={10} color="#fff" />
                  )}
                </View>

                {i !== 5 && <View style={styles.stepLine} />}
              </View>
            );
          })}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* DATE CARDS */}
        <View style={styles.dateRow}>
          {dates.map((item) => {
            const active = selectedDate === item.fullDate;

            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.dateCard, active && styles.dateActive]}
                onPress={() => setSelectedDate(item.fullDate)}
              >
                <Text style={styles.dateMonth}>{item.month}</Text>
                <Text style={styles.dateDay}>{item.day}</Text>
                <Text style={styles.dateWeek}>{item.week}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Available Time</Text>

        <View style={styles.timeGrid}>
          {times.map((time) => {
            const active = selectedTime === time;

            return (
              <TouchableOpacity
                key={time}
                style={[styles.timeBox, active && styles.timeActive]}
                onPress={() => setSelectedTime(time)}
              >
                <Text
                  style={[
                    styles.timeText,
                    active && styles.timeTextActive,
                  ]}
                >
                  {time}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* CONTINUE */}
      <View style={styles.bottom}>
        <TouchableOpacity
          style={[
            styles.continue,
            (!selectedDate || !selectedTime) && { opacity: 0.5 },
          ]}
          disabled={!selectedDate || !selectedTime}
          onPress={() => {
            router.push({
              pathname: "/(customer)/(services)/staff",
              params: {
                selectedServices,
                selectedLength,
                selectedDate,
                selectedTime,
              },
            });
          }}
        >
          <Text style={styles.continueText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F7",
    paddingTop: 50,
    paddingHorizontal: 16,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  headerText: {
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 10,
  },

  stepContainer: {
    alignItems: "center",
    marginBottom: 18,
  },

  stepText: {
    fontSize: 13,
    color: "#777",
    marginBottom: 10,
    textAlign: "center",
  },

  stepRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  stepItem: {
    flexDirection: "row",
    alignItems: "center",
  },

  stepCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
  },

  stepActive: {
    backgroundColor: "#FF2D55",
  },

  stepDone: {
    backgroundColor: "#FF2D55",
  },

  stepLine: {
    width: 25,
    height: 2,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 4,
  },

  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 30,
  },

  dateCard: {
    width: "23%",
    height: 120,
    backgroundColor: "#D46B91",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 10,
  },

  dateActive: {
    backgroundColor: "#FF2D55",
  },

  dateMonth: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  dateDay: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },

  dateWeek: {
    color: "#fff",
    fontSize: 13,
  },

  sectionTitle: {
    fontSize: 15,
    color: "#111",
    marginBottom: 15,
    fontWeight: "600",
  },

  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  timeBox: {
    width: "47%",
    height: 44,
    borderWidth: 1,
    borderColor: "#FF2D55",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    backgroundColor: "#fff",
  },

  timeActive: {
    backgroundColor: "#FF2D55",
  },

  timeText: {
    color: "#111",
    fontSize: 14,
  },

  timeTextActive: {
    color: "#fff",
    fontWeight: "600",
  },

  bottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 15,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },

  continue: {
    backgroundColor: "#FF2D55",
    padding: 14,
    borderRadius: 25,
    alignItems: "center",
  },

  continueText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});