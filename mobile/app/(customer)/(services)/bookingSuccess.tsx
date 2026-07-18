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

const getParamValue = (
  value: string | string[] | undefined
): string => {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
};

const safeJsonParse = <T,>(
  value: string | string[] | undefined,
  fallback: T
): T => {
  const rawValue = getParamValue(value);

  if (!rawValue) {
    return fallback;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return fallback;
  }
};

const formatMoney = (amount: number) =>
  `LKR ${amount.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function BookingSuccess() {
  const router = useRouter();

  const {
    bookingId,
    selectedServices,
    selectedLength,
    selectedDate,
    selectedTime,
    selectedStaff,
    totalAmount,
    advancePayment,
    amountPaid,
    balancePayment,
    advancePercentage,
    paymentOption,
    paymentMethod,
    paymentStatus,
    transactionReference,
  } = useLocalSearchParams();

  const services = safeJsonParse<any[]>(
    selectedServices,
    []
  );

  const hairLength = safeJsonParse<any | null>(
    selectedLength,
    null
  );

  const staff = safeJsonParse<any | null>(
    selectedStaff,
    null
  );

  const total = Number(getParamValue(totalAmount)) || 0;

  const paidAmount =
    Number(getParamValue(amountPaid)) ||
    Number(getParamValue(advancePayment)) ||
    0;

  const balance =
    getParamValue(balancePayment) !== ""
      ? Number(getParamValue(balancePayment)) || 0
      : Math.max(total - paidAmount, 0);

  const percentage =
    Number(getParamValue(advancePercentage)) || 0;

  const normalizedPaymentOption =
    getParamValue(paymentOption);

  const normalizedPaymentMethod =
    getParamValue(paymentMethod) || "-";

  const normalizedPaymentStatus =
    getParamValue(paymentStatus) ||
    (paidAmount >= total && total > 0
      ? "Paid"
      : paidAmount > 0
        ? "Partially Paid"
        : "Pending");

  const serviceNames =
    services.length > 0
      ? services
          .map((item: any) => item?.name)
          .filter(Boolean)
          .join(" & ")
      : "-";

  const rawDate = getParamValue(selectedDate);

  const formatDate = rawDate
    ? new Date(rawDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "-";

  const getPaymentOptionText = () => {
    if (normalizedPaymentOption === "advance") {
      return percentage > 0
        ? `${percentage}% Advance`
        : "Advance Payment";
    }

    if (normalizedPaymentOption === "full") {
      return "Full Payment";
    }

    if (normalizedPaymentOption === "salon") {
      return "Pay at Salon";
    }

    return "-";
  };

  const statusColor =
    normalizedPaymentStatus === "Paid"
      ? "#167A3E"
      : normalizedPaymentStatus === "Partially Paid"
        ? "#9A5A00"
        : normalizedPaymentStatus === "Failed"
          ? "#B42318"
          : "#555555";

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.successIcon}>
        <Ionicons
          name="checkmark"
          size={72}
          color="#000"
        />
      </View>

      <Text style={styles.title}>
        Booking Confirmed
      </Text>

      <Text style={styles.subTitle}>
        See you soon!
      </Text>

      <Text style={styles.message}>
        Thank you for choosing LimoSalon.
      </Text>

      <View style={styles.card}>
        <DetailRow
          label="Booking ID"
          value={
            getParamValue(bookingId)
              ? `#${getParamValue(bookingId)
                  .slice(-6)
                  .toUpperCase()}`
              : "-"
          }
        />

        <DetailRow
          label="Services"
          value={serviceNames}
        />

        {hairLength?.name ? (
          <DetailRow
            label="Hair Length"
            value={hairLength.name}
          />
        ) : null}

        <DetailRow
          label="Date"
          value={formatDate}
        />

        <DetailRow
          label="Time"
          value={
            getParamValue(selectedTime) || "-"
          }
        />

        <DetailRow
          label="Stylist"
          value={
            staff?.name ||
            "Any Available Staff"
          }
        />

        <View style={styles.sectionDivider} />

        <DetailRow
          label="Payment Type"
          value={getPaymentOptionText()}
        />

        <DetailRow
          label="Pay Via"
          value={normalizedPaymentMethod}
        />

        <DetailRow
          label="Total"
          value={formatMoney(total)}
        />

        <DetailRow
          label="Amount Paid"
          value={formatMoney(paidAmount)}
        />

        <DetailRow
          label="Balance"
          value={formatMoney(balance)}
        />

        <View style={styles.row}>
          <Text style={styles.label}>
            Payment Status
          </Text>

          <Text style={styles.colon}>:</Text>

          <Text
            style={[
              styles.value,
              {
                color: statusColor,
                fontWeight: "800",
              },
            ]}
          >
            {normalizedPaymentStatus}
          </Text>
        </View>

        {getParamValue(transactionReference) ? (
          <DetailRow
            label="Reference"
            value={getParamValue(
              transactionReference
            )}
          />
        ) : null}
      </View>

      <TouchableOpacity
        style={styles.homeButton}
        onPress={() =>
          router.replace(
            "/(customer)/(tabs)/home"
          )
        }
        activeOpacity={0.85}
      >
        <Ionicons
          name="home-outline"
          size={20}
          color="#FFFFFF"
        />

        <Text style={styles.homeText}>
          Return Home
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

type DetailRowProps = {
  label: string;
  value: string;
};

function DetailRow({
  label,
  value,
}: DetailRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>
        {label}
      </Text>

      <Text style={styles.colon}>:</Text>

      <Text style={styles.value}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F5F5F7",
  },

  container: {
    flexGrow: 1,
    alignItems: "center",
    paddingTop: 65,
    paddingHorizontal: 24,
    paddingBottom: 45,
  },

  successIcon: {
    width: 118,
    height: 118,
    borderRadius: 59,
    borderWidth: 8,
    borderColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },

  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#000000",
  },

  subTitle: {
    marginTop: 5,
    fontSize: 18,
    fontWeight: "700",
    color: "#000000",
  },

  message: {
    marginTop: 5,
    fontSize: 14,
    color: "#555555",
    textAlign: "center",
  },

  card: {
    width: "100%",
    backgroundColor: "#D86B91",
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 22,
    marginTop: 28,
  },

  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },

  label: {
    width: 118,
    fontSize: 14,
    fontWeight: "700",
    color: "#111111",
  },

  colon: {
    width: 18,
    fontSize: 14,
    color: "#111111",
  },

  value: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#111111",
    lineHeight: 20,
  },

  sectionDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.18)",
    marginTop: 2,
    marginBottom: 16,
  },

  homeButton: {
    width: "100%",
    minHeight: 56,
    backgroundColor: "#FF2D55",
    borderRadius: 28,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 9,
    marginTop: 28,
  },

  homeText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
});