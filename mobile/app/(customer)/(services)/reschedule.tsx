import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";

// Matches the Figma "Re schedule Booking?" screen.
// Route params expected (passed from the Bookings screen's
// Reschedule button):
//   bookingId   - the booking being rescheduled
//   serviceName - display name of the service (e.g. "Glow Signature Facial")
//   date        - display date (e.g. "March 25")
//   time        - display time (e.g. "10.00 a.m")
export default function RescheduleBooking() {
  const router = useRouter();
  const { bookingId, serviceName, date, time, staffId, estimatedDuration } =
    useLocalSearchParams<{
      bookingId: string;
      serviceName: string;
      date: string;
      time: string;
      staffId: string;
      estimatedDuration: string;
    }>();

  return (
    <View style={styles.container}>
      <Image
        // Place the illustration asset at this path once added, per
        // your note — matches the Figma design's calendar/reschedule
        // illustration.
        source={require("../../../assets/LimoImage/reschedule.png")}
        style={styles.illustration}
        resizeMode="contain"
      />

      <View style={styles.card}>
        <Text style={styles.title}>Reschedule Booking?</Text>

        <Text style={styles.description}>
          We will redirect you to select a new date and time for your
          appointment. Your current slot will be released.
        </Text>

        <View style={styles.appointmentBox}>
          <Text style={styles.appointmentLabel}>Current Appointment</Text>
          <Text style={styles.appointmentService}>{serviceName}</Text>
          <View style={styles.appointmentRow}>
            <Ionicons name="calendar-outline" size={16} color="#fff" />
            <Text style={styles.appointmentDate}>{date}</Text>
          </View>
          <Text style={styles.appointmentTime}>{time}</Text>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.keepBtn}
            activeOpacity={0.8}
            onPress={() => router.back()}
          >
            <Text style={styles.keepBtnText}>Keep Current Time</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.chooseBtn}
            activeOpacity={0.8}
            onPress={() =>
              router.push({
                pathname: "/(customer)/(services)/rescheduleDateTime",
                params: { bookingId, staffId, estimatedDuration, serviceName },
              })
            }
          >
            <Text style={styles.chooseBtnText}>Choose New Time</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    paddingTop: 60,
  },

  illustration: {
    width: "80%",
    height: 220,
    marginBottom: 15,
    marginTop: 100,
    
  },

  card: {
    width: "100%",
    backgroundColor: "#FF2D75",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    marginTop: "auto",
  },

  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 10,
  },

  description: {
    fontSize: 13,
    color: "#fff",
    lineHeight: 19,
    marginBottom: 20,
  },

  appointmentBox: {
    backgroundColor: "#ff4d8d",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },

  appointmentLabel: {
    fontSize: 12,
    color: "#fff",
    opacity: 0.85,
    marginBottom: 4,
  },

  appointmentService: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
  },

  appointmentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },

  appointmentDate: {
    fontSize: 13,
    color: "#fff",
  },

  appointmentTime: {
    fontSize: 13,
    color: "#fff",
    marginLeft: 22,
  },

  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },

  keepBtn: {
    flex: 1,
    backgroundColor: "#ff4d8d",
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: "center",
  },

  keepBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },

  chooseBtn: {
    flex: 1,
    backgroundColor: "#fff",
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: "center",
  },

  chooseBtnText: {
    color: "#FF2D75",
    fontWeight: "700",
    fontSize: 13,
  },
});