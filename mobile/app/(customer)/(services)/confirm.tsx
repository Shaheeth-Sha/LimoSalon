import React, { useEffect, useMemo, useState } from "react";
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

type ServiceItem = {
  _id?: string;
  serviceId?: string;
  name?: string;
  price?: number | string;
  duration?: number | string;
  durationText?: string;
};

type HairLengthItem = {
  _id?: string;
  hairLengthId?: string;
  name?: string;
  description?: string;
  extraPrice?: number | string;
};

type StaffItem = {
  _id?: string;
  staffId?: string;
  name?: string;
  role?: string;
};

const NON_BRIDAL_ADVANCE_MINIMUM = 10000;
const BRIDAL_ADVANCE_RATE = 0.2;
const OTHER_ADVANCE_RATE = 0.1;

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

const roundMoney = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const containsBridalService = (
  services: ServiceItem[],
  bookingType: string
): boolean => {
  if (bookingType.trim().toLowerCase() === "bridal") {
    return true;
  }

  return services.some((service) =>
    String(service.name || "")
      .trim()
      .toLowerCase()
      .includes("bridal")
  );
};

const formatDate = (value: string): string => {
  if (!value) {
    return "-";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatMoney = (amount: number): string =>
  `LKR ${amount.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatCountdown = (seconds: number): string => {
  const safeSeconds = Math.max(seconds, 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
};

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
    estimatedDuration,
    holdId,
    holdExpiresAt,
    holdExpiresInSeconds,
  } = useLocalSearchParams();

  const selectedServicesText = getParamValue(selectedServices);
  const selectedLengthText = getParamValue(selectedLength);
  const selectedDateText = getParamValue(selectedDate);
  const selectedTimeText = getParamValue(selectedTime);
  const selectedStaffText = getParamValue(selectedStaff);
  const totalAmountText = getParamValue(totalAmount);
  const bookingTypeText = getParamValue(bookingType);
  const estimatedDurationText = getParamValue(estimatedDuration);
  const holdIdText = getParamValue(holdId);
  const holdExpiresAtText = getParamValue(holdExpiresAt);
  const holdExpiresInSecondsText = getParamValue(
    holdExpiresInSeconds
  );

  const services = useMemo(
    () => safeJsonParse<ServiceItem[]>(selectedServices, []),
    [selectedServices]
  );

  const hairLength = useMemo(
    () =>
      safeJsonParse<HairLengthItem | null>(
        selectedLength,
        null
      ),
    [selectedLength]
  );

  const staff = useMemo(
    () => safeJsonParse<StaffItem | null>(selectedStaff, null),
    [selectedStaff]
  );

  const total = useMemo(() => {
    const parsedTotal = Number(totalAmountText);

    return Number.isFinite(parsedTotal) && parsedTotal > 0
      ? roundMoney(parsedTotal)
      : 0;
  }, [totalAmountText]);

  const duration = useMemo(() => {
    const suppliedDuration = Number(estimatedDurationText);

    if (
      Number.isFinite(suppliedDuration) &&
      suppliedDuration > 0
    ) {
      return suppliedDuration;
    }

    return services.reduce((sum, service) => {
      const serviceDuration = Number(service.duration || 0);

      return Number.isFinite(serviceDuration) &&
        serviceDuration > 0
        ? sum + serviceDuration
        : sum;
    }, 0);
  }, [estimatedDurationText, services]);

  const isBridal = useMemo(
    () => containsBridalService(services, bookingTypeText),
    [services, bookingTypeText]
  );

  const minimumAdvance = useMemo(() => {
    if (isBridal) {
      return roundMoney(total * BRIDAL_ADVANCE_RATE);
    }

    if (total >= NON_BRIDAL_ADVANCE_MINIMUM) {
      return roundMoney(total * OTHER_ADVANCE_RATE);
    }

    return 0;
  }, [isBridal, total]);

  const initialRemainingSeconds = useMemo(() => {
    if (holdExpiresAtText) {
      const expiryTime = new Date(holdExpiresAtText).getTime();

      if (!Number.isNaN(expiryTime)) {
        return Math.max(
          Math.ceil((expiryTime - Date.now()) / 1000),
          0
        );
      }
    }

    const suppliedSeconds = Number(holdExpiresInSecondsText);

    return Number.isFinite(suppliedSeconds) &&
      suppliedSeconds > 0
      ? Math.floor(suppliedSeconds)
      : 0;
  }, [holdExpiresAtText, holdExpiresInSecondsText]);

  const [remainingSeconds, setRemainingSeconds] = useState(
    initialRemainingSeconds
  );

  const holdExpired =
    Boolean(holdIdText) && remainingSeconds <= 0;

  const isHairFlow = bookingTypeText.toLowerCase() === "hair";
  const totalSteps = isHairFlow ? 5 : 4;

  useEffect(() => {
    if (!holdIdText || remainingSeconds <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setRemainingSeconds((current) =>
        current > 0 ? current - 1 : 0
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [holdIdText, remainingSeconds]);

  useEffect(() => {
    if (!holdExpired) {
      return;
    }

    Alert.alert(
      "Reservation Expired",
      "Your temporary reservation has expired. Please select the staff and time again.",
      [
        {
          text: "Select Again",
          onPress: () => router.back(),
        },
      ]
    );
  }, [holdExpired, router]);

  const handleContinue = () => {
    if (!holdIdText) {
      Alert.alert(
        "Reservation Missing",
        "The temporary reservation is missing. Please return and select the staff again."
      );
      return;
    }

    if (holdExpired) {
      Alert.alert(
        "Reservation Expired",
        "Your temporary reservation has expired. Please select the staff and time again."
      );
      return;
    }

    if (!staff?._id && !staff?.staffId) {
      Alert.alert(
        "Staff Missing",
        "Please return and select a staff member."
      );
      return;
    }

    router.push({
      pathname: "/(customer)/(services)/payment",
      params: {
        selectedServices: selectedServicesText,
        selectedLength: selectedLengthText,
        selectedDate: selectedDateText,
        selectedTime: selectedTimeText,
        selectedStaff: selectedStaffText,
        totalAmount: String(total),
        bookingType: bookingTypeText,
        estimatedDuration: String(duration),
        holdId: holdIdText,
        holdExpiresAt: holdExpiresAtText,
        holdExpiresInSeconds: String(remainingSeconds),
      },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons
            name="chevron-back"
            size={26}
            color="#000"
          />
        </TouchableOpacity>

        <Text style={styles.headerText}>Confirm Booking</Text>
      </View>

      <View style={styles.stepContainer}>
        <Text style={styles.stepText}>
          Review and confirm your booking
        </Text>

        <View style={styles.stepRow}>
          {Array.from(
            { length: totalSteps },
            (_, index) => index + 1
          ).map((stepNumber) => (
            <View key={stepNumber} style={styles.stepItem}>
              <View
                style={[
                  styles.stepCircle,
                  !isHairFlow && styles.bodyStepCircle,
                  styles.stepDone,
                ]}
              >
                <Ionicons
                  name="checkmark"
                  size={10}
                  color="#fff"
                />
              </View>

              {stepNumber !== totalSteps && (
                <View
                  style={[
                    styles.stepLine,
                    !isHairFlow && styles.bodyStepLine,
                  ]}
                />
              )}
            </View>
          ))}
        </View>
      </View>

      {holdIdText && (
        <View
          style={[
            styles.holdBox,
            holdExpired && styles.holdExpiredBox,
          ]}
        >
          <Ionicons
            name={
              holdExpired
                ? "alert-circle-outline"
                : "time-outline"
            }
            size={21}
            color={holdExpired ? "#D62828" : "#FF2D55"}
          />

          <View style={styles.holdTextBox}>
            <Text style={styles.holdTitle}>
              {holdExpired
                ? "Reservation expired"
                : "Slot temporarily reserved"}
            </Text>

            <Text style={styles.holdText}>
              {holdExpired
                ? "Please return and select this booking slot again."
                : `Complete the booking within ${formatCountdown(
                    remainingSeconds
                  )}.`}
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.confirmCard}>
          <Text style={styles.cardTitle}>Service</Text>

          {services.length > 0 ? (
            services.map((item, index) => (
              <Text
                key={item._id || item.serviceId || index}
                style={styles.cardValue}
              >
                {item.name || "Service"}
              </Text>
            ))
          ) : (
            <Text style={styles.cardValue}>-</Text>
          )}

          {isHairFlow && hairLength && (
            <>
              <Text style={styles.cardTitle}>Hair Length</Text>
              <Text style={styles.cardValue}>
                {hairLength.name || "-"}
              </Text>
            </>
          )}

          <Text style={styles.cardTitle}>Staff</Text>
          <Text style={styles.cardValue}>
            {staff?.name || "-"}
          </Text>

          <Text style={styles.cardTitle}>Date & Time</Text>
          <Text style={styles.cardValue}>
            {formatDate(selectedDateText)}
          </Text>
          <Text style={styles.cardValue}>
            {selectedTimeText || "-"}
          </Text>

          <Text style={styles.cardTitle}>
            Estimated Duration
          </Text>
          <Text style={styles.cardValue}>
            {duration > 0 ? `${duration} minutes` : "-"}
          </Text>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              {formatMoney(total)}
            </Text>
          </View>

          {minimumAdvance > 0 && (
            <View style={styles.row}>
              <Text style={styles.totalLabel}>
                Minimum Advance
              </Text>
              <Text style={styles.totalValue}>
                {formatMoney(minimumAdvance)}
              </Text>
            </View>
          )}

          <View style={styles.row}>
            <Text style={styles.totalLabel}>
              Remaining After Advance
            </Text>
            <Text style={styles.totalValue}>
              {formatMoney(
                roundMoney(total - minimumAdvance)
              )}
            </Text>
          </View>

          <Text style={styles.paymentNote}>
            {isBridal
              ? "A 20% advance is compulsory for bridal bookings. Full payment is also available."
              : total >= NON_BRIDAL_ADVANCE_MINIMUM
                ? "A 10% advance is compulsory for this booking. Full payment is also available."
                : "You may pay online in full or pay at the salon."}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.bottom}>
        <TouchableOpacity
          disabled={holdExpired}
          style={[
            styles.continue,
            holdExpired && styles.continueDisabled,
          ]}
          onPress={handleContinue}
        >
          <Text style={styles.continueText}>
            Continue to Payment
          </Text>
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
    color: "#111",
  },

  stepContainer: {
    alignItems: "center",
    marginBottom: 16,
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

  holdBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF4F8",
    borderWidth: 1,
    borderColor: "#F5B8CE",
    borderRadius: 13,
    padding: 13,
    marginBottom: 12,
  },

  holdExpiredBox: {
    backgroundColor: "#FFF0F0",
    borderColor: "#F1B0B0",
  },

  holdTextBox: {
    flex: 1,
    marginLeft: 9,
  },

  holdTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111",
  },

  holdText: {
    marginTop: 2,
    fontSize: 12,
    color: "#666",
  },

  scrollContent: {
    paddingBottom: 125,
  },

  confirmCard: {
    backgroundColor: "#D86B91",
    borderRadius: 12,
    padding: 22,
    marginTop: 6,
  },

  cardTitle: {
    fontSize: 17,
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
    alignItems: "flex-start",
    marginBottom: 14,
  },

  totalLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
    marginRight: 10,
  },

  totalValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
    textAlign: "right",
  },

  paymentNote: {
    color: "#FFF",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 8,
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
    elevation: 8,
  },

  continue: {
    backgroundColor: "#FF2D55",
    padding: 14,
    borderRadius: 25,
    alignItems: "center",
  },

  continueDisabled: {
    opacity: 0.45,
  },

  continueText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});