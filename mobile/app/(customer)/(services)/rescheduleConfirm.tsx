import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "http://10.0.2.2:5000";
const RESCHEDULE_API = (bookingId: string) =>
  `${BASE_URL}/api/bookings/${bookingId}/reschedule`;

type AlertState = {
  visible: boolean;
  title: string;
  message: string;
  onOk?: () => void;
};

const formatDate = (dateStr: string) => {
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

export default function RescheduleConfirm() {
  const router = useRouter();
  const { bookingId, serviceName, selectedDate, selectedTime, holdId } =
    useLocalSearchParams<{
      bookingId: string;
      serviceName: string;
      selectedDate: string;
      selectedTime: string;
      holdId: string;
    }>();

  const [submitting, setSubmitting] = useState(false);

  const [alert, setAlert] = useState<AlertState>({
    visible: false,
    title: "",
    message: "",
  });

  const closeAlert = () => {
    const onOk = alert.onOk;
    setAlert((prev) => ({ ...prev, visible: false }));
    if (onOk) onOk();
  };

  const confirmReschedule = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const token = await AsyncStorage.getItem("customerToken");

      const res = await fetch(RESCHEDULE_API(bookingId), {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ holdId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Unable to reschedule this booking.");
      }

      setAlert({
        visible: true,
        title: "Booking Rescheduled",
        message: "Your appointment has been moved to the new date and time.",
        onOk: () => router.replace("/(customer)/(tabs)/bookings"),
      });
    } catch (error: any) {
      setAlert({
        visible: true,
        title: "Reschedule Failed",
        message: error?.message || "Something went wrong. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Confirm New Time</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>New Appointment</Text>
        <Text style={styles.serviceName}>{serviceName}</Text>

        <View style={styles.row}>
          <Ionicons name="calendar-outline" size={18} color="#fff" />
          <Text style={styles.rowText}>{formatDate(selectedDate)}</Text>
        </View>

        <View style={styles.row}>
          <Ionicons name="time-outline" size={18} color="#fff" />
          <Text style={styles.rowText}>{selectedTime}</Text>
        </View>
      </View>

      <Text style={styles.note}>
        Your current slot will be released once you confirm.
      </Text>

      <View style={styles.bottom}>
        <TouchableOpacity
          style={[styles.confirmBtn, submitting && styles.confirmBtnDisabled]}
          activeOpacity={0.8}
          disabled={submitting}
          onPress={confirmReschedule}
        >
          <Text style={styles.confirmBtnText}>
            {submitting ? "Confirming..." : "Confirm Reschedule"}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal visible={alert.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <Feather
                name={alert.title === "Booking Rescheduled" ? "check" : "alert-circle"}
                size={28}
                color={alert.title === "Booking Rescheduled" ? "#2ECC71" : "#FF2D75"}
              />
            </View>
            <Text style={styles.modalTitle}>{alert.title}</Text>
            <Text style={styles.modalMessage}>{alert.message}</Text>
            <TouchableOpacity style={styles.modalButton} activeOpacity={0.8} onPress={closeAlert}>
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingTop: 50, paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  headerText: { fontSize: 18, fontWeight: "700", marginLeft: 10 },
  card: {
    backgroundColor: "#FF2D75", borderRadius: 16, padding: 20, marginTop: 20,
  },
  cardLabel: { fontSize: 12, color: "#fff", opacity: 0.85, marginBottom: 4 },
  serviceName: { fontSize: 18, fontWeight: "800", color: "#fff", marginBottom: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  rowText: { color: "#fff", fontSize: 14 },
  note: { marginTop: 20, fontSize: 13, color: "#777", textAlign: "center" },
  bottom: { position: "absolute", bottom: 30, left: 20, right: 20 },
  confirmBtn: { backgroundColor: "#FF2D75", paddingVertical: 16, borderRadius: 25, alignItems: "center" },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center",
    alignItems: "center", paddingHorizontal: 32,
  },
  modalCard: {
    width: "100%", backgroundColor: "#fff", borderRadius: 20,
    paddingVertical: 28, paddingHorizontal: 24, alignItems: "center",
  },
  modalIconCircle: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: "#FFE1EC",
    alignItems: "center", justifyContent: "center", marginBottom: 14,
  },
  modalTitle: { fontSize: 17, fontWeight: "bold", color: "#111", marginBottom: 6, textAlign: "center" },
  modalMessage: { fontSize: 14, color: "#555", textAlign: "center", marginBottom: 22, lineHeight: 20 },
  modalButton: { width: "100%", backgroundColor: "#FF2D75", paddingVertical: 13, borderRadius: 25, alignItems: "center" },
  modalButtonText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
});
