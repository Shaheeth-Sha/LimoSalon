import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";

// Bridal-only step inserted between staff.tsx and confirm.tsx. The
// slot hold is already created by staff.tsx by the time this screen
// is reached, so every param it already carries (selectedServices,
// selectedLength, selectedDate, selectedTime, selectedStaff,
// totalAmount, bookingType, estimatedDuration, holdId,
// holdExpiresAt, holdExpiresInSeconds) is simply forwarded unchanged
// — this screen only adds wantsTrialMakeup on top.
//
// Shows the same "Slot temporarily reserved" countdown confirm.tsx
// shows right after staff selection for every other booking type —
// bridal used to jump straight into this multi-screen trial mini-flow
// with no visible reminder that the main event hold was still
// ticking down underneath it.

// Matches the backend's HOLD_DURATION_MINUTES.
const HOLD_DURATION_SECONDS = 10 * 60;

const getParamValue = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
};

const formatCountdown = (seconds: number): string => {
  const safeSeconds = Math.max(seconds, 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
};

export default function TrialMakeup() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const forwardParams = {
    selectedServices: getParamValue(params.selectedServices),
    selectedLength: getParamValue(params.selectedLength),
    selectedDate: getParamValue(params.selectedDate),
    selectedTime: getParamValue(params.selectedTime),
    selectedStaff: getParamValue(params.selectedStaff),
    totalAmount: getParamValue(params.totalAmount),
    bookingType: getParamValue(params.bookingType),
    estimatedDuration: getParamValue(params.estimatedDuration),
    holdId: getParamValue(params.holdId),
    holdExpiresAt: getParamValue(params.holdExpiresAt),
    holdExpiresInSeconds: getParamValue(params.holdExpiresInSeconds),
  };

  // Only ever set on the "Change Trial" path from reviewBooking.tsx.
  const existingTrialMakeupDate = getParamValue(params.trialMakeupDate);
  const existingTrialMakeupTime = getParamValue(params.trialMakeupTime);
  const existingNotes = getParamValue(params.notes);
  const editMode = getParamValue(params.editMode) === "true";

  // No trial hold exists yet at this point in the flow — only the
  // main event slot's hold, created back at staff.tsx — so this
  // countdown tracks that one.
  const holdIdText = forwardParams.holdId;
  const holdExpiresAtText = forwardParams.holdExpiresAt;
  const holdExpiresInSecondsText = forwardParams.holdExpiresInSeconds;

  const isFocused = useIsFocused();
  const deadlineRef = useRef<number | null>(null);

  if (deadlineRef.current === null) {
    if (holdExpiresAtText) {
      const expiryTime = new Date(holdExpiresAtText).getTime();
      // Clamped against clock skew — see reviewBooking.tsx for why.
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

  const goReselectDateTime = () => {
    router.replace({
      pathname: "/(customer)/(services)/eventDate",
      params: {
        selectedServices: forwardParams.selectedServices,
        selectedLength: forwardParams.selectedLength,
        totalAmount: forwardParams.totalAmount,
        bookingType: forwardParams.bookingType,
      },
    });
  };

  // Notes apply to the booking as a whole, not just the trial makeup
  // — so declining the trial no longer clears them. In edit mode
  // (switching an existing "Yes" back to "No") whatever notes were
  // already written are simply preserved and we skip straight back
  // to Review. On a fresh run-through there's nothing written yet,
  // so this still routes through additionalNotes.tsx once to collect
  // them.
  const goToTrialDate = () => {
    if (holdExpired) {
      goReselectDateTime();
      return;
    }

    router.push({
      pathname: "/(customer)/(services)/trialMakeupDate",
      params: {
        ...forwardParams,
        trialMakeupDate: existingTrialMakeupDate,
        trialMakeupTime: existingTrialMakeupTime,
        notes: existingNotes,
        editMode: editMode ? "true" : undefined,
      },
    });
  };

  const skipTrial = () => {
    if (holdExpired) {
      goReselectDateTime();
      return;
    }

    if (editMode) {
      router.replace({
        pathname: "/(customer)/(services)/reviewBooking",
        params: {
          ...forwardParams,
          wantsTrialMakeup: "false",
          trialMakeupDate: "",
          trialMakeupTime: "",
          // Any trial hold that already existed no longer matters —
          // it's simply left to expire on its own (same as every
          // other unused hold in the app).
          trialHoldId: "",
          trialHoldExpiresAt: "",
          trialHoldExpiresInSeconds: "",
          notes: existingNotes,
        },
      });
      return;
    }

    router.push({
      pathname: "/(customer)/(services)/additionalNotes",
      params: {
        ...forwardParams,
        wantsTrialMakeup: "false",
        trialMakeupDate: "",
        trialMakeupTime: "",
        trialHoldId: "",
        trialHoldExpiresAt: "",
        trialHoldExpiresInSeconds: "",
      },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Trial Makeup</Text>
      </View>

      {holdIdText && (
        <View style={[styles.holdBox, holdExpired && styles.holdExpiredBox]}>
          <Ionicons
            name={holdExpired ? "alert-circle-outline" : "time-outline"}
            size={21}
            color={holdExpired ? "#D62828" : "#FF2D75"}
          />
          <View style={styles.holdTextBox}>
            <Text style={styles.holdTitle}>
              {holdExpired ? "Reservation expired" : "Slot temporarily reserved"}
            </Text>
            <Text style={styles.holdText}>
              {holdExpired
                ? "Please return and select this booking slot again."
                : `Complete the booking within ${formatCountdown(remainingSeconds)}.`}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.iconCircle}>
        <Ionicons name="color-palette-outline" size={48} color="#FF2D75" />
      </View>

      <Text style={styles.question}>
        Would you like to do a trial makeup?
      </Text>

      <Text style={styles.subText}>
        A trial session lets you preview your bridal look before the
        big day.
      </Text>

      <View style={styles.bottom}>
        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.8}
          onPress={goToTrialDate}
        >
          <Text style={styles.primaryBtnText}>
            {holdExpired ? "Select Date & Time Again" : "Yes, I want trial makeup"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          activeOpacity={0.8}
          onPress={skipTrial}
        >
          <Text style={styles.secondaryBtnText}>No, Skip this</Text>
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
  header: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  headerText: { fontSize: 18, fontWeight: "700", marginLeft: 10 },
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
  holdExpiredBox: { backgroundColor: "#FFF0F0", borderColor: "#F1B0B0" },
  holdTextBox: { flex: 1, marginLeft: 9 },
  holdTitle: { fontSize: 14, fontWeight: "800", color: "#111" },
  holdText: { marginTop: 2, fontSize: 12, color: "#666" },
  iconCircle: {
    alignSelf: "center",
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#FFE1EC",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  question: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111",
    textAlign: "center",
    marginBottom: 10,
  },
  subText: {
    fontSize: 13,
    color: "#777",
    textAlign: "center",
    paddingHorizontal: 10,
  },
  bottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 20,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    elevation: 8,
  },
  primaryBtn: {
    backgroundColor: "#FF2D75",
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: "#FF2D75",
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
  },
  secondaryBtnText: { color: "#FF2D75", fontWeight: "700", fontSize: 15 },
});
