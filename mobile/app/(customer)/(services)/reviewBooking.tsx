import React, { useEffect, useRef, useState } from "react";
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

// Bridal-only "Review Booking" screen, matching the Figma frame —
// replaces confirm.tsx for the bridal flow only. Every other booking
// type still uses confirm.tsx unchanged. Reached from either
// trialMakeup.tsx ("No, Skip this") or additionalNotes.tsx
// ("Continue"), both of which forward the exact same param set
// staff.tsx originally produced, plus wantsTrialMakeup/
// trialMakeupDate/notes.

type ServiceItem = {
  _id?: string;
  serviceId?: string;
  name?: string;
  price?: number | string;
  duration?: number | string;
};

type StaffItem = {
  _id?: string;
  staffId?: string;
  name?: string;
  role?: string;
};

// Match the backend's HOLD_DURATION_MINUTES / TRIAL_MAKEUP_DURATION_MINUTES
// — used only to clamp the displayed countdown, see resolveDeadline below.
const HOLD_DURATION_SECONDS = 10 * 60;
const TRIAL_MAKEUP_DURATION_SECONDS = 60 * 60;

const getParamValue = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) return value[0] ?? "";
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

const formatDate = (value: string): string => {
  if (!value) return "-";

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatMoney = (amount: number): string =>
  `LKR ${amount.toLocaleString("en-LK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

export default function ReviewBooking() {
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
      pathname: "/(customer)/(services)/eventDate",
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
    trialMakeupTime,
    trialHoldId,
    trialHoldExpiresAt,
    trialHoldExpiresInSeconds,
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
  const holdExpiresInSecondsText = getParamValue(holdExpiresInSeconds);
  const wantsTrialMakeupText = getParamValue(wantsTrialMakeup);
  const trialMakeupDateText = getParamValue(trialMakeupDate);
  const trialMakeupTimeText = getParamValue(trialMakeupTime);
  const trialHoldIdText = getParamValue(trialHoldId);
  const trialHoldExpiresAtText = getParamValue(trialHoldExpiresAt);
  const trialHoldExpiresInSecondsText = getParamValue(trialHoldExpiresInSeconds);
  const notesText = getParamValue(notes);
  const wantsTrialMakeupBool = wantsTrialMakeupText === "true";
  // A trial makeup slot is only actually reserved once a real hold
  // exists for it — this is what handleContinue and the countdown
  // below both key off, not just the Yes/No answer.
  const trialSlotReserved = wantsTrialMakeupBool && Boolean(trialHoldIdText);

  const services = safeJsonParse<ServiceItem[]>(selectedServices, []);
  const staff = safeJsonParse<StaffItem | null>(selectedStaff, null);

  const total = (() => {
    const parsedTotal = Number(totalAmountText);
    return Number.isFinite(parsedTotal) && parsedTotal > 0 ? parsedTotal : 0;
  })();

  const packageLabel =
    services.length > 0
      ? services.map((item) => item.name || "Service").join(", ")
      : "-";

  // Resolves a hold's own deadline from whichever of its two forms
  // arrived in params. Shared by both the main slot and (when
  // reserved) the trial slot below, so the countdown always reflects
  // whichever of the two expires first.
  //
  // Fixed: this used to check expiresInSeconds FIRST. That value is a
  // plain duration ("600"), not a point in time — every pass-through
  // screen between staff.tsx (where the hold is actually created) and
  // here forwards it completely unchanged, since none of them run a
  // countdown of their own. So whichever screen happened to compute
  // its deadline from that stale "600" was really saying "10 minutes
  // from right now, whenever now happens to be" — silently pushing
  // the apparent deadline further into the future every time a new
  // screen mounted, no matter how much real time had actually passed
  // browsing through the bridal-only screens in between. The visible
  // countdown looked perfectly fresh while the server's real,
  // unmoving expiresAt had already passed — exactly the "still shows
  // time left, then hold expired at payment" bug. expiresAt is a
  // fixed clock time and never drifts like that, so it has to win.
  const resolveDeadline = (
    expiresInSecondsText: string,
    expiresAtText: string,
    maxDurationSeconds: number
  ): number | null => {
    if (expiresAtText) {
      const expiryTime = new Date(expiresAtText).getTime();

      // A few seconds of clock skew between this device and the
      // server (common enough on emulators) can make the server's
      // absolute expiresAt look slightly MORE than the real hold
      // duration away from this device's own clock — showing "10:01"
      // instead of "10:00". A hold can never legitimately have more
      // than maxDurationSeconds left from right now, so cap it there.
      if (!Number.isNaN(expiryTime)) {
        return Math.min(expiryTime, Date.now() + maxDurationSeconds * 1000);
      }
    }

    const suppliedSeconds = Number(expiresInSecondsText);

    if (Number.isFinite(suppliedSeconds) && suppliedSeconds > 0) {
      return Date.now() + suppliedSeconds * 1000;
    }

    return null;
  };

  const deadlineRef = useRef<number | null>(null);

  if (deadlineRef.current === null) {
    const mainDeadline =
      resolveDeadline(holdExpiresInSecondsText, holdExpiresAtText, HOLD_DURATION_SECONDS) ??
      Date.now();

    // Whichever of the two reserved slots (main event, trial makeup)
    // expires first drives the single countdown/expiry gate below —
    // there's no value in the booking staying "active" once either
    // reservation lapses.
    const trialDeadline = trialSlotReserved
      ? resolveDeadline(
          trialHoldExpiresInSecondsText,
          trialHoldExpiresAtText,
          TRIAL_MAKEUP_DURATION_SECONDS
        )
      : null;

    deadlineRef.current =
      trialDeadline !== null ? Math.min(mainDeadline, trialDeadline) : mainDeadline;
  }

  const computeRemainingSeconds = () =>
    Math.max(0, Math.ceil(((deadlineRef.current as number) - Date.now()) / 1000));

  const [remainingSeconds, setRemainingSeconds] = useState(computeRemainingSeconds);

  const holdExpired = Boolean(holdIdText) && remainingSeconds <= 0;

  useEffect(() => {
    if (!holdIdText) return;
    setRemainingSeconds(computeRemainingSeconds());
  }, [isFocused, holdIdText]);

  useEffect(() => {
    if (!isFocused || !holdIdText) return;

    const timer = setInterval(() => {
      setRemainingSeconds(computeRemainingSeconds());
    }, 1000);

    return () => clearInterval(timer);
  }, [isFocused, holdIdText]);

  useEffect(() => {
    if (!holdExpired || !isFocused) return;

    showAlert(
      "Reservation Expired",
      "Your temporary reservation has expired. Please select the date and time again.",
      "Select Date & Time Again",
      goReselectDateTime
    );
  }, [holdExpired, isFocused]);

  const handleContinue = () => {
    if (!holdIdText) {
      showAlert(
        "Reservation Missing",
        "The temporary reservation is missing. Please select the date and time again.",
        "Select Date & Time Again",
        goReselectDateTime
      );
      return;
    }

    if (holdExpired) {
      showAlert(
        "Reservation Expired",
        "Your temporary reservation has expired. Please select the date and time again.",
        "Select Date & Time Again",
        goReselectDateTime
      );
      return;
    }

    if (!staff?._id && !staff?.staffId) {
      showAlert("Staff Missing", "Please return and select a staff member.");
      return;
    }

    if (wantsTrialMakeupBool && trialMakeupDateText && trialMakeupTimeText && !trialHoldIdText) {
      showAlert(
        "Trial Reservation Missing",
        "The temporary reservation on your trial makeup slot is missing. Please select the trial time again.",
        "Select Trial Time Again",
        handleChangeTrialTime
      );
      return;
    }

    const trialDeadline = trialSlotReserved
      ? resolveDeadline(
          trialHoldExpiresInSecondsText,
          trialHoldExpiresAtText,
          TRIAL_MAKEUP_DURATION_SECONDS
        )
      : null;
    const remainingTrialSeconds =
      trialDeadline !== null
        ? Math.max(0, Math.ceil((trialDeadline - Date.now()) / 1000))
        : 0;

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
        estimatedDuration: estimatedDurationText,
        holdId: holdIdText,
        holdExpiresAt: holdExpiresAtText,
        holdExpiresInSeconds: String(remainingSeconds),
        wantsTrialMakeup: wantsTrialMakeupText,
        trialMakeupDate: trialMakeupDateText,
        trialMakeupTime: trialMakeupTimeText,
        trialHoldId: trialHoldIdText,
        trialHoldExpiresAt: trialHoldExpiresAtText,
        trialHoldExpiresInSeconds: String(remainingTrialSeconds),
        notes: notesText,
      },
    });
  };

  // Every "Change" link jumps to the specific screen that owns that
  // field, carrying the full current booking state along as params.
  // Each of those screens knows (via editMode="true") to skip the
  // rest of its normal chain and land straight back here instead of
  // re-walking the whole flow.
  const editBaseParams = {
    selectedServices: selectedServicesText,
    selectedLength: selectedLengthText,
    selectedDate: selectedDateText,
    selectedTime: selectedTimeText,
    selectedStaff: selectedStaffText,
    totalAmount: totalAmountText,
    bookingType: bookingTypeText,
    estimatedDuration: estimatedDurationText,
    holdId: holdIdText,
    holdExpiresAt: holdExpiresAtText,
    holdExpiresInSeconds: String(remainingSeconds),
    wantsTrialMakeup: wantsTrialMakeupText,
    trialMakeupDate: trialMakeupDateText,
    trialMakeupTime: trialMakeupTimeText,
    trialHoldId: trialHoldIdText,
    trialHoldExpiresAt: trialHoldExpiresAtText,
    trialHoldExpiresInSeconds: trialHoldExpiresInSecondsText,
    notes: notesText,
    editMode: "true",
  };

  const handleChangePackage = () =>
    router.push({
      pathname: "/(customer)/(services)/bridal",
      params: editBaseParams,
    });

  const handleChangeDate = () =>
    router.push({
      pathname: "/(customer)/(services)/eventDate",
      params: editBaseParams,
    });

  const handleChangeTime = () =>
    router.push({
      pathname: "/(customer)/(services)/eventTime",
      params: editBaseParams,
    });

  const handleChangeArtist = () =>
    router.push({
      pathname: "/(customer)/(services)/staff",
      params: editBaseParams,
    });

  const handleChangeTrial = () =>
    router.push({
      pathname: "/(customer)/(services)/trialMakeup",
      params: editBaseParams,
    });

  const handleChangeTrialDate = () =>
    router.push({
      pathname: "/(customer)/(services)/trialMakeupDate",
      params: editBaseParams,
    });

  const handleChangeTrialTime = () =>
    router.push({
      pathname: "/(customer)/(services)/trialMakeupTime",
      params: editBaseParams,
    });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Review Booking</Text>
      </View>

      <Text style={styles.subText}>Please review your booking details</Text>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Row label="Package" value={packageLabel} onChange={handleChangePackage} />
          <Row label="Date" value={formatDate(selectedDateText)} onChange={handleChangeDate} />
          <Row label="Time" value={selectedTimeText || "-"} onChange={handleChangeTime} />
          <Row
            label="Trial"
            value={wantsTrialMakeupBool ? "Yes" : "No"}
            onChange={handleChangeTrial}
          />
          {wantsTrialMakeupBool && trialMakeupDateText ? (
            <Row
              label="Trial Date"
              value={formatDate(trialMakeupDateText)}
              onChange={handleChangeTrialDate}
            />
          ) : null}
          {wantsTrialMakeupBool && trialMakeupTimeText ? (
            <Row
              label="Trial Time"
              value={trialMakeupTimeText}
              onChange={handleChangeTrialTime}
            />
          ) : null}
          <Row label="Artist" value={staff?.name || "-"} onChange={handleChangeArtist} last />

          {notesText ? (
            <View style={styles.notesBox}>
              <Text style={styles.notesLabel}>Notes</Text>
              <Text style={styles.notesValue}>{notesText}</Text>
            </View>
          ) : null}

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>{formatMoney(total)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottom}>
        <TouchableOpacity
          disabled={holdExpired}
          style={[styles.continue, holdExpired && styles.continueDisabled]}
          onPress={handleContinue}
        >
          <Text style={styles.continueText}>Continue to payment</Text>
        </TouchableOpacity>
      </View>

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

function Row({
  label,
  value,
  onChange,
  last,
}: {
  label: string;
  value: string;
  onChange: () => void;
  last?: boolean;
}) {
  return (
    <View style={[rowStyles.row, last && rowStyles.rowLast]}>
      <Text style={rowStyles.label}>{label}</Text>
      <View style={rowStyles.right}>
        <Text style={rowStyles.value}>{value}</Text>
        <TouchableOpacity onPress={onChange} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={rowStyles.change}>Change</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  rowLast: { borderBottomWidth: 0 },
  label: { fontSize: 14, fontWeight: "700", color: "#111" },
  right: { flexDirection: "row", alignItems: "center", gap: 10 },
  value: { fontSize: 14, color: "#333" },
  change: { fontSize: 13, fontWeight: "700", color: "#FF2D75" },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F7", paddingTop: 50, paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  headerText: { fontSize: 18, fontWeight: "700", marginLeft: 10 },
  subText: { fontSize: 13, color: "#777", marginBottom: 18 },
  scrollContent: { paddingBottom: 125 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  notesBox: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F0F0F0" },
  notesLabel: { fontSize: 14, fontWeight: "700", color: "#111", marginBottom: 4 },
  notesValue: { fontSize: 13, color: "#555", lineHeight: 18 },
  divider: { height: 1, backgroundColor: "#F0F0F0", marginVertical: 16 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontSize: 15, fontWeight: "800", color: "#111" },
  totalValue: { fontSize: 16, fontWeight: "800", color: "#FF2D75" },
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
  continue: { backgroundColor: "#FF2D75", padding: 14, borderRadius: 25, alignItems: "center" },
  continueDisabled: { opacity: 0.45 },
  continueText: { color: "#fff", fontWeight: "700", fontSize: 15 },
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
  modalTitle: { fontSize: 17, fontWeight: "bold", color: "#111", marginBottom: 6, textAlign: "center" },
  modalMessage: { fontSize: 14, color: "#555", textAlign: "center", marginBottom: 22, lineHeight: 20 },
  modalButton: { width: "100%", backgroundColor: "#FF2D75", paddingVertical: 13, borderRadius: 25, alignItems: "center" },
  modalButtonText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
});
