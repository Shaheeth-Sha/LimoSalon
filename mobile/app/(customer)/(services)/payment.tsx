import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BOOKING_API = "http://10.0.2.2:5000/api/bookings";

export default function Payment() {
  const router = useRouter();

  const {
    selectedServices,
    selectedLength,
    selectedDate,
    selectedTime,
    selectedStaff,
    totalAmount,
    bookingType,
  } = useLocalSearchParams();

  const [paymentMethod, setPaymentMethod] = useState("");

  const total = totalAmount ? Number(totalAmount) : 0;
  const booking = Array.isArray(bookingType) ? bookingType[0] : bookingType;

  const services = selectedServices
    ? JSON.parse(selectedServices as string)
    : [];

  const hairLength = selectedLength
    ? JSON.parse(selectedLength as string)
    : null;

  const staff = selectedStaff
    ? JSON.parse(selectedStaff as string)
    : null;

  const advancePayment =
    booking === "bridal"
      ? total * 0.2
      : total > 10000
      ? total * 0.1
      : 0;

  const paymentRequired = advancePayment > 0;

  const methods = [
    {
      id: "card",
      title: "Credit/Debit Card",
      sub: paymentRequired
        ? `Advance required: LKR ${advancePayment}`
        : "Visa, Master Card, Amex",
      icon: "card-outline",
    },
    {
      id: "salon",
      title: "Pay at Salon",
      sub: paymentRequired ? "Unavailable for this booking" : "Physically",
      icon: "cash-outline",
    },
  ];

  const createPayAtSalonBooking = async () => {
    try {
      const token = await AsyncStorage.getItem("customerToken");

      if (!token) {
        Alert.alert("Error", "Please login again");
        return;
      }

      const res = await fetch(BOOKING_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          services: services.map((item: any) => ({
            serviceId: item._id,
            name: item.name,
            price: item.price,
            duration: item.duration,
            durationText: item.durationText,
          })),
          hairLength: hairLength
            ? {
                hairLengthId: hairLength._id,
                name: hairLength.name,
                description: hairLength.description,
                extraPrice: hairLength.extraPrice,
              }
            : null,
          staff: staff
            ? {
                staffId: staff._id,
                name: staff.name,
                role: staff.role,
              }
            : null,
          selectedDate: String(selectedDate),
          selectedTime: String(selectedTime),
          totalAmount: total,
          bookingType: String(booking),
          paymentMethod: "Pay at Salon",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Error", data.message || "Booking failed");
        return;
      }

      router.replace({
        pathname: "/(customer)/(services)/bookingSuccess",
        params: {
          bookingId: data.booking?._id,
          selectedServices,
          selectedLength,
          selectedDate,
          selectedTime,
          selectedStaff,
          totalAmount: String(total),
          paymentMethod: "Pay at Salon",
          bookingType: String(booking),
        },
      });
    } catch (error) {
      Alert.alert("Error", "Cannot create booking");
    }
  };

  const handleContinue = () => {
    if (!paymentMethod) return;

    if (paymentMethod === "salon") {
      if (paymentRequired) {
        Alert.alert("Payment Required", "Advance payment is required for this booking.");
        return;
      }

      createPayAtSalonBooking();
      return;
    }

    router.push({
      pathname: "/(customer)/(services)/cardPayment",
      params: {
        selectedServices,
        selectedLength,
        selectedDate,
        selectedTime,
        selectedStaff,
        totalAmount: String(total),
        advancePayment: String(advancePayment),
        paymentRequired: String(paymentRequired),
        bookingType: String(booking),
        paymentMethod: "Credit/Debit Card",
      },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>

        <Text style={styles.headerText}>Payment Options</Text>
      </View>

      <View style={styles.divider} />

      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Select Your Payment Method</Text>

        {methods.map((item) => {
          const active = paymentMethod === item.id;
          const disabled = item.id === "salon" && paymentRequired;

          return (
            <TouchableOpacity
              key={item.id}
              disabled={disabled}
              style={[
                styles.paymentCard,
                active && styles.paymentActive,
                disabled && { opacity: 0.45 },
              ]}
              onPress={() => setPaymentMethod(item.id)}
            >
              <View style={[styles.radio, active && styles.radioActive]} />

              <Ionicons
                name={item.icon as any}
                size={34}
                color="#333"
                style={styles.icon}
              />

              <View style={styles.methodTextBox}>
                <Text style={styles.methodTitle}>{item.title}</Text>
                <Text style={styles.methodSub}>{item.sub}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>
            {paymentRequired ? "Advance Payment" : "Total Amount"}
          </Text>
          <Text style={styles.amountValue}>
            LKR {paymentRequired ? advancePayment : total}
          </Text>
        </View>

        {paymentRequired && (
          <Text style={{ marginTop: 12, color: "#777", textAlign: "right" }}>
            Total Amount: LKR {total}
          </Text>
        )}

        <TouchableOpacity
          disabled={!paymentMethod}
          style={[styles.payBtn, !paymentMethod && { opacity: 0.5 }]}
          onPress={handleContinue}
        >
          <Text style={styles.payText}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>
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

  divider: {
    height: 1,
    backgroundColor: "#DADADA",
    marginBottom: 35,
  },

  title: {
    fontSize: 15,
    color: "#111",
    marginBottom: 28,
  },

  paymentCard: {
    backgroundColor: "#D86B91",
    borderRadius: 8,
    padding: 18,
    marginBottom: 22,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#C94E78",
  },

  paymentActive: {
    backgroundColor: "#FF2D55",
  },

  radio: {
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: "#fff",
    marginRight: 22,
  },

  radioActive: {
    borderWidth: 4,
    borderColor: "#fff",
    backgroundColor: "#FF2D55",
  },

  icon: {
    marginRight: 20,
  },

  methodTextBox: {
    flex: 1,
    alignItems: "center",
  },

  methodTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },

  methodSub: {
    fontSize: 15,
    color: "#fff",
    marginTop: 4,
  },

  amountRow: {
    marginTop: 45,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  amountLabel: {
    fontSize: 15,
    color: "#666",
  },

  amountValue: {
    fontSize: 30,
    fontWeight: "800",
    color: "#FF2D55",
  },

  payBtn: {
    marginTop: 55,
    backgroundColor: "#FF0A5B",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },

  payText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
  },
});