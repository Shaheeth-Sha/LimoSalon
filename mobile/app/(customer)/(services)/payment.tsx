import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BOOKING_API =
  "https://limosalon.onrender.com/api/bookings";

const NON_BRIDAL_ADVANCE_MINIMUM = 10000;
const BRIDAL_ADVANCE_RATE = 0.2;
const OTHER_ADVANCE_RATE = 0.1;

type PaymentMethod = "" | "card" | "salon";

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
  if (!rawValue) return fallback;

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return fallback;
  }
};

const roundMoney = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const formatMoney = (amount: number): string =>
  `LKR ${amount.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatCountdown = (totalSeconds: number): string => {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

// Fixed: previously this was used to collapse bookingType down to
// only "bridal" or "hair" for the actual API call, which is why Face
// and Body bookings were being saved as "hair" — the correct category
// set by face.tsx/body.tsx/hair.tsx/bridal.tsx was being thrown away
// right here. Now this is ONLY used for payment-policy decisions
// (bridal gets a mandatory 20% advance vs. everyone else's 10%) —
// display/business logic, not what gets saved to the database.
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

const readJsonResponse = async (
  response: Response
): Promise<any> => {
  const rawBody = await response.text();
  if (!rawBody) return {};

  try {
    return JSON.parse(rawBody);
  } catch {
    throw new Error(
      `Unexpected server response (${response.status})`
    );
  }
};

export default function Payment() {
  const router = useRouter();
  const isFocused = useIsFocused();

  const [alertState, setAlertState] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttonLabel?: string;
    onOk?: () => void;
  }>({ visible: false, title: "", message: "" });

  const showAlert = (title: string, message: string, onOk?: () => void, buttonLabel?: string) => {
    setAlertState({ visible: true, title, message, onOk, buttonLabel });
  };

  const closeAlert = () => {
    const onOk = alertState.onOk;
    setAlertState((prev) => ({ ...prev, visible: false }));
    if (onOk) onOk();
  };

  // Sends the customer back to date/time selection, carrying forward
  // the same services/hair length/booking type already chosen — only
  // date, time, and staff need reselecting since the hold expired.
  const goReselectDateTime = () => {
    router.replace({
      pathname: "/(customer)/(services)/dateTime",
      params: {
        selectedServices: selectedServicesText,
        selectedLength: selectedLengthText,
        totalAmount: totalAmountText,
        bookingType: bookingTypeText,
      },
    });
  };

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
  const holdExpiresInSecondsText = getParamValue(holdExpiresInSeconds);

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("");
  const [loading, setLoading] = useState(false);

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
    const providedDuration = Number(estimatedDurationText);

    if (
      Number.isFinite(providedDuration) &&
      providedDuration > 0
    ) {
      return providedDuration;
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

  const advanceAvailable =
    isBridal || total >= NON_BRIDAL_ADVANCE_MINIMUM;

  const advanceRate = isBridal
    ? BRIDAL_ADVANCE_RATE
    : total >= NON_BRIDAL_ADVANCE_MINIMUM
      ? OTHER_ADVANCE_RATE
      : 0;

  const advancePayment = advanceAvailable
    ? roundMoney(total * advanceRate)
    : 0;

  const payAtSalonAllowed =
    !isBridal && total < NON_BRIDAL_ADVANCE_MINIMUM;

  // Fixed: deadline-based countdown instead of a plain decrementing
  // counter. The interval that ticks this down only runs while the
  // screen is focused (see below — intentional, to save battery/CPU
  // while the user is elsewhere). But a decrementing counter has no
  // way to know how much real time passed during that gap, so it was
  // resuming from the exact value it was frozen at — showing MORE
  // time remaining than is actually true on the server.
  //
  // The fix: fix one absolute deadline, in this device's own clock,
  // a single time. From then on remaining time is always
  // `deadline - Date.now()`, recomputed fresh — so it doesn't matter
  // how long the gap was or whether any ticks were missed, the very
  // next read (including the one triggered immediately on refocus,
  // below) is instantly correct.
  const deadlineRef = useRef<number | null>(null);

  if (deadlineRef.current === null) {
    const suppliedSeconds = Number(holdExpiresInSecondsText);

    if (Number.isFinite(suppliedSeconds) && suppliedSeconds > 0) {
      deadlineRef.current = Date.now() + suppliedSeconds * 1000;
    } else if (holdExpiresAtText) {
      const expiryTime = new Date(holdExpiresAtText).getTime();
      deadlineRef.current = Number.isNaN(expiryTime)
        ? Date.now()
        : expiryTime;
    } else {
      deadlineRef.current = Date.now();
    }
  }

  const computeRemainingSeconds = () =>
    Math.max(
      0,
      Math.ceil(((deadlineRef.current as number) - Date.now()) / 1000)
    );

  const [remainingSeconds, setRemainingSeconds] = useState(
    computeRemainingSeconds
  );

  const holdExpired =
    Boolean(holdIdText) && remainingSeconds <= 0;

  // Recompute immediately whenever focus changes (not just on an
  // interval tick) — this is what makes the displayed time instantly
  // accurate the moment you come back, instead of showing a stale
  // value for up to another second.
  useEffect(() => {
    if (!holdIdText) return;
    setRemainingSeconds(computeRemainingSeconds());
  }, [isFocused, holdIdText]);

  useEffect(() => {
    // Only run the ticking interval while this screen is focused —
    // no need to burn a timer in the background, since the
    // deadline-based calculation above already guarantees the value
    // is correct the instant focus returns.
    if (!isFocused || !holdIdText) return;

    const timer = setInterval(() => {
      setRemainingSeconds(computeRemainingSeconds());
    }, 1000);

    return () => clearInterval(timer);
  }, [isFocused, holdIdText]);

  useEffect(() => {
    // Only surface this while the user is actually on this screen,
    // and use the app's branded modal instead of the native
    // Alert.alert() (the plain system-styled popup seen in testing).
    if (!holdExpired || !isFocused) return;

    setPaymentMethod("");

    showAlert(
      "Reservation Expired",
      "Your temporary booking reservation has expired. Please select the staff and time again.",
      goReselectDateTime,
      "Select Time & Staff Again"
    );
  }, [holdExpired, isFocused]);

  const getToken = async () =>
    (await AsyncStorage.getItem("customerToken")) ||
    (await AsyncStorage.getItem("token"));

  const validateBookingDetails = (): boolean => {
    if (!holdIdText) {
      showAlert(
        "Reservation Missing",
        "The temporary slot reservation is missing. Please select the staff and time again.",
        goReselectDateTime,
        "Select Time & Staff Again"
      );
      return false;
    }

    if (holdExpired) {
      showAlert(
        "Reservation Expired",
        "The temporary slot reservation has expired. Please select the staff and time again.",
        goReselectDateTime,
        "Select Time & Staff Again"
      );
      return false;
    }

    if (services.length === 0) {
      showAlert("Services Missing", "No services were selected.");
      return false;
    }

    if (!staff?._id && !staff?.staffId) {
      showAlert("Staff Missing", "No staff member was selected.");
      return false;
    }

    if (!selectedDateText || !selectedTimeText) {
      showAlert(
        "Date or Time Missing",
        "Please select the booking date and time again."
      );
      return false;
    }

    if (total <= 0) {
      showAlert("Amount Error", "The booking total is invalid.");
      return false;
    }

    return true;
  };

  const createPayAtSalonBooking = async () => {
    if (loading || !validateBookingDetails()) return;

    if (!payAtSalonAllowed) {
      showAlert(
        "Online Advance Required",
        isBridal
          ? "Bridal bookings require a 20% advance or full online payment."
          : "Bookings of LKR 10,000 or more require a 10% advance or full online payment."
      );
      return;
    }

    try {
      setLoading(true);

      const token = await getToken();

      if (!token) {
        showAlert("Login Required", "Please login again.", () =>
          router.replace("/(customer)/(auth)/login")
        );
        return;
      }

      const response = await fetch(BOOKING_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          holdId: holdIdText,
          services: services.map((item) => ({
            serviceId: String(item._id || item.serviceId || ""),
            name: String(item.name || ""),
            price: Number(item.price || 0),
            duration: Number(item.duration || 0),
            durationText: String(item.durationText || ""),
          })),
          hairLength: hairLength
            ? {
                hairLengthId: String(
                  hairLength._id || hairLength.hairLengthId || ""
                ),
                name: String(hairLength.name || ""),
                description: String(hairLength.description || ""),
                extraPrice: Number(hairLength.extraPrice || 0),
              }
            : {
                hairLengthId: "",
                name: "",
                description: "",
                extraPrice: 0,
              },
          staff: {
            staffId: String(staff?._id || staff?.staffId || ""),
            name: String(staff?.name || ""),
            role: String(staff?.role || ""),
          },
          selectedDate: selectedDateText,
          selectedTime: selectedTimeText,
          estimatedDuration: duration,
          totalAmount: total,
          // Fixed: was normalizedBookingType (collapsed to only
          // "bridal"/"hair"). Now sends the real category that was
          // set all the way back on the face/body/hair/bridal
          // selection screen, unmodified.
          bookingType: bookingTypeText,
          paymentOption: "salon",
          paymentMethod: "Pay at Salon",
        }),
      });

      const data = await readJsonResponse(response);

      if (!response.ok) {
        showAlert(
          "Booking Error",
          data.message || "Booking creation failed."
        );
        return;
      }

      const createdBooking = data.booking;

      router.replace({
        pathname: "/(customer)/(services)/bookingSuccess",
        params: {
          bookingId: createdBooking?._id || "",
          selectedServices: selectedServicesText,
          selectedLength: selectedLengthText,
          selectedDate: selectedDateText,
          selectedTime: selectedTimeText,
          selectedStaff: selectedStaffText,
          totalAmount: String(createdBooking?.totalAmount ?? total),
          advancePayment: String(
            createdBooking?.advancePayment ?? 0
          ),
          amountPaid: String(createdBooking?.amountPaid ?? 0),
          balancePayment: String(
            createdBooking?.balancePayment ?? total
          ),
          advancePercentage: String(
            createdBooking?.advancePercentage ?? 0
          ),
          paymentOption:
            createdBooking?.paymentOption || "salon",
          paymentMethod:
            createdBooking?.paymentMethod || "Pay at Salon",
          paymentStatus:
            createdBooking?.paymentStatus || "Pending",
          transactionReference:
            createdBooking?.transactionReference || "",
        },
      });
    } catch (error) {
      console.error("Pay at salon booking error:", error);

      showAlert(
        "Connection Error",
        error instanceof Error
          ? error.message
          : "Cannot create the booking."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (
      !paymentMethod ||
      loading ||
      !validateBookingDetails()
    ) {
      return;
    }

    if (paymentMethod === "salon") {
      createPayAtSalonBooking();
      return;
    }

    router.push({
      pathname: "/(customer)/(services)/cardPayment",
      params: {
        selectedServices: selectedServicesText,
        selectedLength: selectedLengthText,
        selectedDate: selectedDateText,
        selectedTime: selectedTimeText,
        selectedStaff: selectedStaffText,
        totalAmount: String(total),
        // Fixed: was normalizedBookingType — same bug, forward the
        // real category unmodified so cardPayment.tsx passes the
        // correct value through to the final booking creation call.
        bookingType: bookingTypeText,
        estimatedDuration: String(duration),
        holdId: holdIdText,
        holdExpiresAt: holdExpiresAtText,
        holdExpiresInSeconds: String(remainingSeconds),
        advancePayment: String(advancePayment),
        paymentRequired: String(advanceAvailable),
        paymentMethod: "Credit/Debit Card",
      },
    });
  };

  const methods = [
    {
      id: "card" as PaymentMethod,
      title: "Credit/Debit Card",
      sub: isBridal
        ? `Pay 20% advance (${formatMoney(
            advancePayment
          )}) or pay in full`
        : advanceAvailable
          ? `Pay 10% advance (${formatMoney(
              advancePayment
            )}) or pay in full`
          : "Pay the full amount online",
      icon: "card-outline" as const,
      disabled: false,
    },
    {
      id: "salon" as PaymentMethod,
      title: "Pay at Salon",
      sub: payAtSalonAllowed
        ? "Pay the full amount at the salon"
        : isBridal
          ? "Unavailable for bridal bookings"
          : "Unavailable for bookings of LKR 10,000 or more",
      icon: "cash-outline" as const,
      disabled: !payAtSalonAllowed,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          disabled={loading}
        >
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>

        <Text style={styles.headerText}>Payment Options</Text>
      </View>

      <View style={styles.divider} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
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
              color={holdExpired ? "#D62828" : "#FF2D75"}
            />

            <View style={styles.holdTextBox}>
              <Text style={styles.holdTitle}>
                {holdExpired
                  ? "Reservation expired"
                  : "Slot reserved"}
              </Text>

              <Text style={styles.holdText}>
                {holdExpired
                  ? "Please select the slot again."
                  : `Time remaining: ${formatCountdown(
                      remainingSeconds
                    )}`}
              </Text>
            </View>
          </View>
        )}

        <Text style={styles.title}>
          Select Your Payment Method
        </Text>

        <View style={styles.policyBox}>
          <Ionicons
            name={
              isBridal
                ? "heart"
                : advanceAvailable
                  ? "information-circle"
                  : "wallet-outline"
            }
            size={21}
            color="#FF2D75"
          />

          <Text style={styles.policyText}>
            {isBridal
              ? "Bridal bookings require at least a 20% online advance. Full online payment is also available."
              : advanceAvailable
                ? "Bookings of LKR 10,000 or more require at least a 10% online advance. Full online payment is also available."
                : "You may pay the full amount online or pay at the salon."}
          </Text>
        </View>

        {methods.map((item) => {
          const active = paymentMethod === item.id;

          return (
            <TouchableOpacity
              key={item.id}
              disabled={item.disabled || loading || holdExpired}
              style={[
                styles.paymentCard,
                active && styles.paymentActive,
                item.disabled && styles.disabledCard,
              ]}
              onPress={() => setPaymentMethod(item.id)}
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.radio,
                  active && styles.radioActive,
                ]}
              >
                {active && <View style={styles.radioInner} />}
              </View>

              <Ionicons
                name={item.icon}
                size={34}
                color={item.disabled ? "#888" : "#333"}
                style={styles.icon}
              />

              <View style={styles.methodTextBox}>
                <Text style={styles.methodTitle}>{item.title}</Text>
                <Text style={styles.methodSub}>{item.sub}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>Booking Total</Text>
          <Text style={styles.amountValue}>{formatMoney(total)}</Text>

          {advanceAvailable && (
            <View style={styles.advanceSummary}>
              <Text style={styles.advanceLabel}>
                Minimum advance
              </Text>
              <Text style={styles.advanceValue}>
                {formatMoney(advancePayment)}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          disabled={!paymentMethod || loading || holdExpired}
          style={[
            styles.payBtn,
            (!paymentMethod || loading || holdExpired) &&
              styles.disabledButton,
          ]}
          onPress={handleContinue}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.payText}>
              {holdExpired ? "Reservation Expired" : "Continue"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={alertState.visible} transparent animationType="fade" onRequestClose={closeAlert}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <Feather name="alert-circle" size={28} color="#FF2D75" />
            </View>
            <Text style={styles.modalTitle}>{alertState.title}</Text>
            <Text style={styles.modalMessage}>{alertState.message}</Text>
            <TouchableOpacity style={styles.modalButton} activeOpacity={0.8} onPress={closeAlert}>
              <Text style={styles.modalButtonText}>{alertState.buttonLabel || "OK"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  scrollContent: {
    paddingBottom: 60,
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
  divider: {
    height: 1,
    backgroundColor: "#DADADA",
    marginBottom: 20,
  },
  holdBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF4F8",
    borderWidth: 1,
    borderColor: "#F5B8CE",
    borderRadius: 13,
    padding: 13,
    marginBottom: 18,
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
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
    marginBottom: 18,
  },
  policyBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    backgroundColor: "#FFF1F6",
    borderWidth: 1,
    borderColor: "#F1C1D1",
    borderRadius: 12,
    marginBottom: 18,
  },
  policyText: {
    flex: 1,
    marginLeft: 10,
    color: "#713348",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
  paymentCard: {
    backgroundColor: "#D86B91",
    borderRadius: 12,
    padding: 18,
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#C94E78",
  },
  paymentActive: {
    backgroundColor: "#FF2D75",
    borderColor: "#B9003D",
  },
  disabledCard: {
    opacity: 0.42,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 18,
  },
  radioActive: {
    borderColor: "#FFFFFF",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFFFFF",
  },
  icon: {
    marginRight: 17,
  },
  methodTextBox: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111",
  },
  methodSub: {
    fontSize: 13,
    color: "#FFFFFF",
    marginTop: 4,
    lineHeight: 18,
  },
  amountBox: {
    marginTop: 24,
    borderRadius: 14,
    padding: 18,
    backgroundColor: "#FFFFFF",
  },
  amountLabel: {
    fontSize: 14,
    color: "#666",
  },
  amountValue: {
    fontSize: 30,
    fontWeight: "800",
    color: "#FF2D75",
    marginTop: 5,
  },
  advanceSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 13,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
  },
  advanceLabel: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
  },
  advanceValue: {
    fontSize: 14,
    color: "#111",
    fontWeight: "800",
  },
  payBtn: {
    marginTop: 35,
    backgroundColor: "#FF2D75",
    minHeight: 56,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.5,
  },
  payText: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "800",
  },

  /* ===== Custom Alert Modal ===== */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  modalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFE1EC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#111",
    marginBottom: 6,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    marginBottom: 22,
    lineHeight: 20,
  },
  modalButton: {
    width: "100%",
    backgroundColor: "#FF2D75",
    paddingVertical: 13,
    borderRadius: 25,
    alignItems: "center",
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
});