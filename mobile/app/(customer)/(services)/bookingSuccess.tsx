import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function BookingSuccess() {
  const router = useRouter();

  const {
    selectedServices,
    selectedLength,
    selectedDate,
    selectedTime,
    selectedStaff,
    totalAmount,
    paymentMethod,
  } = useLocalSearchParams();

  const services = selectedServices
    ? JSON.parse(selectedServices as string)
    : [];

  const serviceNames = services.length ? services.map((item: any) => item.title).join(", ") : "-" ;
  
  const lengthNames: any = {
    short: "Short Hair",
    medium: "Medium Hair",
    long: "Long Hair",
  };

  const staffNames: any = {
    any: "Any Available Staff",
    nimesha: "Nimesha Fernando",
    rashmi: "Rashmi W.",
    olivia: "Olivia Dias",
  };

  const formatDate = selectedDate
    ? new Date(selectedDate as string).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    <View style={styles.container}>
      <View style={styles.successIcon}>
        <Ionicons name="checkmark" size={85} color="#000" />
      </View>

      <Text style={styles.title}>Booking Confirmed</Text>
      <Text style={styles.subTitle}>See you soon!</Text>
      <Text style={styles.subTitle}>Thank you !</Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Booking ID</Text>
          <Text style={styles.colon}>:</Text>
          <Text style={styles.value}>#GLW_9895</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Services</Text>
          <Text style={styles.colon}>:</Text>
          <Text style={styles.value}>{serviceNames}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Length</Text>
          <Text style={styles.colon}>:</Text>
          <Text style={styles.value}>{selectedLength}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Date & Time</Text>
          <Text style={styles.colon}>:</Text>
          <Text style={styles.value}>
            {formatDate}{"\n"}
            {selectedTime}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Stylist</Text>
          <Text style={styles.colon}>:</Text>
          <Text style={styles.value}>
            {staffNames[selectedStaff as string] || "Any Available Staff"}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Pay Via</Text>
          <Text style={styles.colon}>:</Text>
          <Text style={styles.value}>{paymentMethod}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Total</Text>
          <Text style={styles.colon}>:</Text>
          <Text style={styles.value}>LKR {totalAmount}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.homeButton}
        onPress={() => router.replace("/(customer)/(tabs)/home")}
      >
        <Text style={styles.homeText}>Return Home</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F7",
    alignItems: "center",
    paddingTop: 90,
    paddingHorizontal: 24,
  },

  successIcon: {
    width: 125,
    height: 125,
    borderRadius: 70,
    borderWidth: 10,
    borderColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 25,
  },

  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#000",
  },

  subTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#000",
    marginTop: 2,
  },

  card: {
    width: "100%",
    backgroundColor: "#D86B91",
    borderRadius: 8,
    padding: 24,
    marginTop: 28,
  },

  row: {
    flexDirection: "row",
    marginBottom: 18,
  },

  label: {
    width: 95,
    fontSize: 14,
    color: "#111",
  },

  colon: {
    width: 20,
    fontSize: 14,
    color: "#111",
  },

  value: {
    flex: 1,
    fontSize: 14,
    color: "#111",
  },

  homeButton: {
    backgroundColor: "#FF2D55",
    width: "100%",
    padding: 15,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 28,
  },

  homeText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
});