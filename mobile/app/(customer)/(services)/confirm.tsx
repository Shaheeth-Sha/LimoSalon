import React from "react";
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

export default function ConfirmBooking() {
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

  const services = selectedServices
    ? JSON.parse(selectedServices as string)
    : [];

  const hairLength = selectedLength
    ? JSON.parse(selectedLength as string)
    : null;

  const staff = selectedStaff
    ? JSON.parse(selectedStaff as string)
    : null;

  const booking = Array.isArray(bookingType) ? bookingType[0] : bookingType;
  const isHairFlow = booking === "hair";

  const totalSteps = isHairFlow ? 5 : 4;

  const total = totalAmount ? Number(totalAmount) : 0;

const advancePayment =
  booking === "bridal"
    ? total * 0.2
    : total > 10000
    ? total * 0.1
    : 0;

const balancePayment = total - advancePayment;


const formatMoney = (amount: number) =>
  `LKR ${amount.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
  })}`;


  const formatDate = selectedDate
    ? new Date(selectedDate as string).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "";

  const handleConfirmBooking = async () => {
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
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Error", data.message || "Booking failed");
        return;
      }

      Alert.alert("Success", "Booking confirmed successfully", [
        {
          text: "OK",
          onPress: () => router.replace("/(customer)/(tabs)/bookings"),
        },
      ]);
    } catch (error) {
      Alert.alert("Error", "Cannot create booking");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>

        <Text style={styles.headerText}>Confirm Booking</Text>
      </View>

      <View style={styles.stepContainer}>
        <Text style={styles.stepText}>Review and confirm your booking</Text>

        <View style={styles.stepRow}>
          {Array.from({ length: totalSteps }, (_, index) => index + 1).map(
            (i) => (
              <View key={i} style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    !isHairFlow && styles.bodyStepCircle,
                    styles.stepDone,
                  ]}
                >
                  <Ionicons name="checkmark" size={10} color="#fff" />
                </View>

                {i !== totalSteps && (
                  <View
                    style={[
                      styles.stepLine,
                      !isHairFlow && styles.bodyStepLine,
                    ]}
                  />
                )}
              </View>
            )
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.confirmCard}>
          <Text style={styles.cardTitle}>Service</Text>

          {services.map((item: any, index: number) => (
            <Text key={item._id || index} style={styles.cardValue}>
              {item.name}
            </Text>
          ))}

          {isHairFlow && hairLength && (
            <>
              <Text style={styles.cardTitle}>Hair Length</Text>
              <Text style={styles.cardValue}>{hairLength.name}</Text>
              
            </>
          )}

          <Text style={styles.cardTitle}>Staff</Text>
          <Text style={styles.cardValue}>
            {staff?.name || "Any Available Staff"}
          </Text>

          <Text style={styles.cardTitle}>Date & Time</Text>
          <Text style={styles.cardValue}>{formatDate}</Text>
          <Text style={styles.cardValue}>{selectedTime}</Text>

          <View style={styles.divider} />

          <View style={styles.row}>
  <Text style={styles.totalLabel}>Total</Text>
  <Text style={styles.totalValue}>
    {formatMoney(total)}
  </Text>
</View>

<View style={styles.row}>
  <Text style={styles.totalLabel}>Advance Payment</Text>
  <Text style={styles.totalValue}>
    {formatMoney(advancePayment)}
  </Text>
</View>

<View style={styles.row}>
  <Text style={styles.totalLabel}>Balance Payment</Text>
  <Text style={styles.totalValue}>
    {formatMoney(balancePayment)}
  </Text>
</View>

        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.bottom}>
        <TouchableOpacity
           style={styles.continue}
           onPress={() => {
            router.push({
              pathname: "/(customer)/(services)/payment",
              params: {
                selectedServices,
                selectedLength,
                selectedDate,
                selectedTime,
                selectedStaff,
                totalAmount: String(total),
                bookingType,
              },
            });
           }}
           >
          
          <Text style={styles.continueText}>Confirm Booking</Text>
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

  bodyStepCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
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

  bodyStepLine: {
    width: 34,
    marginHorizontal: 5,
  },

  confirmCard: {
    backgroundColor: "#D86B91",
    borderRadius: 12,
    padding: 22,
    marginTop: 15,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginTop: 12,
    textAlign: "center",
  },

  cardValue: {
    color: "#fff",
    fontSize: 15,
    textAlign: "center",
    marginTop: 5,
  },

  divider: {
    height: 1,
    backgroundColor: "#fff",
    marginVertical: 20,
  },

  

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  totalLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },

  totalValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
    textAlign:"right",
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