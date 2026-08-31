import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import Avatar from "../../../components/Avatar";

type ServiceItem = { name: string; price?: number; duration?: number };

type Booking = {
  _id: string;
  services: ServiceItem[];
  hairLength?: { name?: string };
  bookingType?: string;
  staff: { name: string; role?: string; image?: string };
  selectedDate: string;
  selectedTime: string;
  estimatedDuration?: number;
  totalAmount: number;
  paymentOption: string;
  paymentMethod: string;
  advancePercentage?: number;
  advancePayment?: number;
  amountPaid: number;
  balancePayment: number;
  paymentStatus: string;
  transactionReference?: string;
  status: string;
  effectiveStatus?: string;
  rescheduleHistory?: { previousDate: string; previousTime: string; rescheduledAt: string }[];
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

const formatMoney = (amount: number) =>
  `LKR ${(amount ?? 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getPaymentOptionText = (option: string, percentage?: number) => {
  if (option === "advance") return percentage ? `${percentage}% Advance` : "Advance Payment";
  if (option === "full") return "Full Payment";
  if (option === "salon") return "Pay at Salon";
  return "-";
};

export default function BookingDetails() {
  const router = useRouter();
  const { booking: bookingParam } = useLocalSearchParams<{ booking: string }>();

  let booking: Booking | null = null;
  try {
    booking = bookingParam ? JSON.parse(bookingParam) : null;
  } catch {
    booking = null;
  }

  if (!booking) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerText}>Booking Details</Text>
        </View>
        <Text style={styles.errorText}>Unable to load this booking's details.</Text>
      </View>
    );
  }

  const displayStatus = booking.effectiveStatus || booking.status;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Booking Details</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.statusPill}>
          <Text style={styles.statusPillText}>{displayStatus}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Services</Text>
          {(booking.services || []).map((service, index) => (
            <View key={index} style={styles.serviceRow}>
              <Text style={styles.serviceName}>{service.name}</Text>
              {typeof service.price === "number" && (
                <Text style={styles.servicePrice}>{formatMoney(service.price)}</Text>
              )}
            </View>
          ))}

          {booking.hairLength?.name ? (
            <>
              <View style={styles.divider} />
              <Row
                label={
                  booking.bookingType?.toLowerCase() === "nail"
                    ? "Nail Style"
                    : "Hair Length"
                }
                value={booking.hairLength.name}
              />
            </>
          ) : null}

          <View style={styles.divider} />

          <Row
            label="Staff"
            value={booking.staff?.name || "-"}
            icon={
              booking.staff?.name ? (
                <Avatar uri={booking.staff.image} name={booking.staff.name} size={22} style={{ marginRight: 6 }} />
              ) : undefined
            }
          />
          {booking.staff?.role ? <Row label="Role" value={booking.staff.role} /> : null}
          <Row label="Date" value={formatDate(booking.selectedDate)} />
          <Row label="Time" value={booking.selectedTime} />
          {booking.estimatedDuration ? (
            <Row label="Duration" value={`${booking.estimatedDuration} minutes`} />
          ) : null}

          <View style={styles.divider} />

          <Row
            label="Payment Type"
            value={getPaymentOptionText(booking.paymentOption, booking.advancePercentage)}
          />
          <Row label="Pay Via" value={booking.paymentMethod || "-"} />
          <Row label="Total" value={formatMoney(booking.totalAmount)} />
          <Row label="Amount Paid" value={formatMoney(booking.amountPaid)} />
          <Row label="Balance" value={formatMoney(booking.balancePayment)} />
          <Row label="Payment Status" value={booking.paymentStatus} />
          {booking.transactionReference ? (
            <Row label="Reference" value={booking.transactionReference} />
          ) : null}
        </View>

        {booking.rescheduleHistory && booking.rescheduleHistory.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Reschedule History</Text>
            {booking.rescheduleHistory.map((entry, index) => (
              <View key={index} style={styles.historyRow}>
                <Ionicons name="time-outline" size={16} color="#fff" />
                <Text style={styles.historyText}>
                  Moved from {formatDate(entry.previousDate)} at {entry.previousTime}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.bookingIdText}>
          Booking ID: #{booking._id.slice(-6).toUpperCase()}
        </Text>
      </ScrollView>
    </View>
  );
}

function Row({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {icon}
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F4F4", paddingTop: 60, paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  headerText: { fontSize: 18, fontWeight: "700", marginLeft: 10 },
  scrollContent: { paddingBottom: 40 },
  errorText: { textAlign: "center", color: "#777", marginTop: 40 },
  statusPill: {
    alignSelf: "flex-start", backgroundColor: "#fff", paddingHorizontal: 12,
    paddingVertical: 5, borderRadius: 8, marginBottom: 14,
  },
  statusPillText: { fontSize: 12, fontWeight: "700", color: "#FF2D75" },
  card: {
    backgroundColor: "#d86a86", borderRadius: 18, padding: 18, marginBottom: 18,
  },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: "#fff", marginBottom: 10, opacity: 0.9 },
  serviceRow: {
    flexDirection: "row", justifyContent: "space-between", marginBottom: 6,
  },
  serviceName: { color: "#fff", fontSize: 14, flex: 1 },
  servicePrice: { color: "#fff", fontSize: 14, fontWeight: "600" },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.35)", marginVertical: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  rowLabel: { color: "#fff", fontSize: 13, opacity: 0.85 },
  rowValue: { color: "#fff", fontSize: 13, fontWeight: "700", flexShrink: 1, textAlign: "right" },
  historyRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  historyText: { color: "#fff", fontSize: 13, flex: 1 },
  bookingIdText: { textAlign: "center", color: "#999", fontSize: 12, marginTop: 4 },
});