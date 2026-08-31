import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";

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
  image?: string;
};

const NON_BRIDAL_ADVANCE_MINIMUM = 10000;
const BRIDAL_ADVANCE_RATE = 0.2;
const OTHER_ADVANCE_RATE = 0.1;

// Matches the backend's HOLD_DURATION_MINUTES — used only to clamp
// the displayed countdown, see the note below.
const HOLD_DURATION_SECONDS = 10 * 60;

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
  const isFocused = useIsFocused();

  const [alertState, setAlertState] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttonLabel?: string;
    onConfirm?: () => void;
  }>({ visible: false, title: "", message: "" });

  const showAlert = (
    title: string,
    message: string,
    buttonLabel?: string,
    onConfirm?: () => void
  ) => {
    setAlertState({ visible: true, title, message, buttonLabel, onConfirm });
  };

  const closeAlert = () => {
    const onConfirm = alertState.onConfirm;
    setAlertState((prev) => ({ ...prev, visible: false }));
    if (onConfirm) onConfirm();
  };

  const goReselectDateTime = () => {
    router.replace({
      pathname: "/(customer)/(services)/staff",
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
    wantsTrialMakeup,
    trialMakeupDate,
    notes,
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
  // Bridal-only, set by the trialMakeup.tsx / trialMakeupDate.tsx /
  // additionalNotes.tsx mini-flow inserted between staff.tsx and this
  // screen. Empty/undefined for every other booking type.
  const wantsTrialMakeupText = getParamValue(wantsTrialMakeup);
  const trialMakeupDateText = getParamValue(trialMakeupDate);
  const notesText = getParamValue(notes);
  const wantsTrialMakeupBool = wantsTrialMakeupText === "true";

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

  // Fixed: this used to trust holdExpiresInSeconds (a plain duration,
  // not a point in time) over holdExpiresAt (a fixed clock time). Any
  // screen that forwards the hold onward without running its own
  // countdown just passes that duration through unchanged, so
  // recomputing "now + that duration" on arrival here silently pushed
  // the apparent deadline later the longer the customer spent on
  // earlier screens — showing time remaining even after the real,
  // unmoving server-side expiresAt had already passed. expiresAt has
  // to win whenever it's present.
  const deadlineRef = useRef<number | null>(null);

  if (deadlineRef.current === null) {
    if (holdExpiresAtText) {
      const expiryTime = new Date(holdExpiresAtText).getTime();
      // A few seconds of clock skew between this device and the
      // server (common enough on emulators) can make the server's
      // absolute expiresAt look slightly MORE than 10 minutes away
      // from this device's own clock — showing "10:01" instead of
      // "10:00". The hold can never legitimately have more than
      // HOLD_DURATION_SECONDS left from right now, so cap it there.
      deadlineRef.current = Number.isNaN(expiryTime)
        ? Date.now()
        : Math.min(expiryTime, Date.now() + HOLD_DURATION_SECONDS * 1000);
    } else {
      const suppliedSeconds = Number(holdExpiresInSecondsText);

      deadlineRef.current =
        Number.isFinite(suppliedSeconds) && suppliedSeconds > 0
          ? Date.now() + suppliedSeconds * 1000
          : Date.now();
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

  const isHairFlow = bookingTypeText.toLowerCase() === "hair";

  // Nail also has an extra step (its "Choose Style" screen), so it
  // needs the same 5-step count AND the same small-dot styling as
  // Hair. Fixed: totalSteps already correctly used hasExtraStep, but
  // the JSX rendering the dots themselves (further down) still
  // checked `!isHairFlow` alone in two places — same class of bug
  // just fixed in staff.tsx, here in a second file.
  const hasExtraStep =
    isHairFlow || bookingTypeText.toLowerCase() === "nail";
  const totalSteps = hasExtraStep ? 5 : 4;

  useEffect(() => {
    if (!holdIdText) {
      return;
    }

    setRemainingSeconds(computeRemainingSeconds());
  }, [isFocused, holdIdText]);

  useEffect(() => {
    if (!isFocused || !holdIdText) {
      return;
    }

    const timer = setInterval(() => {
      setRemainingSeconds(computeRemainingSeconds());
    }, 1000);

    return () => clearInterval(timer);
  }, [isFocused, holdIdText]);

  useEffect(() => {
    if (!holdExpired || !isFocused) {
      return;
    }

    showAlert(
      "Reservation Expired",
      "Your temporary reservation has expired. Please select the staff and time again.",
      "Select Time & Staff Again",
      goReselectDateTime
    );
  }, [holdExpired, isFocused]);

  const handleContinue = () => {
    if (!holdIdText) {
      showAlert(
        "Reservation Missing",
        "The temporary reservation is missing. Please select the staff and time again.",
        "Select Time & Staff Again",
        goReselectDateTime
      );
      return;
    }

    if (holdExpired) {
      showAlert(
        "Reservation Expired",
        "Your temporary reservation has expired. Please select the staff and time again.",
        "Select Time & Staff Again",
        goReselectDateTime
      );
      return;
    }

    if (!staff?._id && !staff?.staffId) {
      showAlert(
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
        wantsTrialMakeup: wantsTrialMakeupText,
        trialMakeupDate: trialMakeupDateText,
        notes: notesText,
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
                  !hasExtraStep && styles.bodyStepCircle,
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
                    !hasExtraStep && styles.bodyStepLine,
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
            color={holdExpired ? "#D62828" : "#FF2D75"}
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

          {isBridal && (
            <>
              <Text style={styles.cardTitle}>Trial Makeup</Text>
              <Text style={styles.cardValue}>
                {wantsTrialMakeupBool ? "Yes" : "No"}
              </Text>

              {wantsTrialMakeupBool && trialMakeupDateText && (
                <>
                  <Text style={styles.cardTitle}>Trial Date</Text>
                  <Text style={styles.cardValue}>
                    {formatDate(trialMakeupDateText)}
                  </Text>
                </>
              )}

              {notesText ? (
                <>
                  <Text style={styles.cardTitle}>Notes</Text>
                  <Text style={styles.cardValue}>{notesText}</Text>
                </>
              ) : null}
            </>
          )}

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

      <Modal
        visible={alertState.visible}
        transparent
        animationType="fade"
        onRequestClose={closeAlert}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <Feather name="alert-circle" size={28} color="#FF2D75" />
            </View>
            <Text style={styles.modalTitle}>{alertState.title}</Text>
            <Text style={styles.modalMessage}>{alertState.message}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              activeOpacity={0.8}
              onPress={closeAlert}
            >
              <Text style={styles.modalButtonText}>
                {alertState.buttonLabel || "OK"}
              </Text>
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
    backgroundColor: "#FF2D75",
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
    backgroundColor: "#FF2D75",
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