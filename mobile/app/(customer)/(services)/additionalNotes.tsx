import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";

// Bridal-only step: free-text notes for the booking as a whole — not
// gated behind the trial makeup choice, so this is reached either way
// (from trialMakeup.tsx's "No, Skip this", or from
// trialMakeupTime.tsx after a "Yes"). wantsTrialMakeup/
// trialMakeupDate/trialMakeupTime just pass through unchanged;
// whichever path got here already set them correctly. Forwards
// straight into reviewBooking.tsx.
//
// A trial hold may already exist here (customer said "Yes" and picked
// a trial time), so — like reviewBooking.tsx/payment.tsx — the
// countdown shown tracks whichever of the main event hold and the
// trial hold expires first.

const NOTES_MAX_LENGTH = 200;

// Match the backend's HOLD_DURATION_MINUTES / TRIAL_MAKEUP_DURATION_MINUTES.
const HOLD_DURATION_SECONDS = 10 * 60;
const TRIAL_MAKEUP_DURATION_SECONDS = 60 * 60;

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

export default function AdditionalNotes() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const isFocused = useIsFocused();

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
    wantsTrialMakeup: getParamValue(params.wantsTrialMakeup),
    trialMakeupDate: getParamValue(params.trialMakeupDate),
    trialMakeupTime: getParamValue(params.trialMakeupTime),
    trialHoldId: getParamValue(params.trialHoldId),
    trialHoldExpiresAt: getParamValue(params.trialHoldExpiresAt),
    trialHoldExpiresInSeconds: getParamValue(params.trialHoldExpiresInSeconds),
  };

  const holdIdText = forwardParams.holdId;
  const holdExpiresAtText = forwardParams.holdExpiresAt;
  const holdExpiresInSecondsText = forwardParams.holdExpiresInSeconds;
  const trialHoldIdText = forwardParams.trialHoldId;
  const trialHoldExpiresAtText = forwardParams.trialHoldExpiresAt;
  const trialHoldExpiresInSecondsText = forwardParams.trialHoldExpiresInSeconds;
  const trialSlotReserved =
    forwardParams.wantsTrialMakeup === "true" && Boolean(trialHoldIdText);

  const resolveDeadline = (
    expiresInSecondsText: string,
    expiresAtText: string,
    maxDurationSeconds: number
  ): number | null => {
    if (expiresAtText) {
      const expiryTime = new Date(expiresAtText).getTime();

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

  // Pre-fills when re-entering via the "Change Trial" edit path with
  // notes already collected, so the customer isn't forced to retype
  // something they already wrote.
  const [notes, setNotes] = useState(getParamValue(params.notes));

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerText}>Additional Notes</Text>
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

        <Text style={styles.subText}>
          Any special requests or additional information?
        </Text>

        <View style={styles.notesBox}>
          <TextInput
            style={styles.notesInput}
            placeholder="Type your notes here......(optional)"
            placeholderTextColor="#999"
            multiline
            maxLength={NOTES_MAX_LENGTH}
            value={notes}
            onChangeText={setNotes}
            textAlignVertical="top"
          />
          <Text style={styles.counter}>
            {notes.length}/{NOTES_MAX_LENGTH}
          </Text>
        </View>

        <View style={styles.bottom}>
          <TouchableOpacity
            style={styles.continue}
            onPress={() => {
              if (holdExpired) {
                goReselectDateTime();
                return;
              }

              router.replace({
                pathname: "/(customer)/(services)/reviewBooking",
                params: {
                  ...forwardParams,
                  notes: notes.trim(),
                },
              });
            }}
          >
            <Text style={styles.continueText}>
              {holdExpired ? "Select Date & Time Again" : "Continue"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F7", paddingTop: 50, paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  headerText: { fontSize: 18, fontWeight: "700", marginLeft: 10 },
  subText: { fontSize: 13, color: "#777", marginBottom: 18 },
  holdBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF4F8",
    borderWidth: 1,
    borderColor: "#F5B8CE",
    borderRadius: 13,
    padding: 13,
    marginBottom: 14,
  },
  holdExpiredBox: { backgroundColor: "#FFF0F0", borderColor: "#F1B0B0" },
  holdTextBox: { flex: 1, marginLeft: 9 },
  holdTitle: { fontSize: 14, fontWeight: "800", color: "#111" },
  holdText: { marginTop: 2, fontSize: 12, color: "#666" },
  notesBox: {
    flex: 1, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1,
    borderColor: "#DADADA", padding: 16, marginBottom: 130,
  },
  notesInput: { flex: 1, fontSize: 14, color: "#111" },
  counter: { fontSize: 12, color: "#999", textAlign: "right", marginTop: 6 },
  bottom: {
    position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff",
    padding: 15, borderTopLeftRadius: 25, borderTopRightRadius: 25, elevation: 8,
  },
  continue: { backgroundColor: "#FF2D75", padding: 14, borderRadius: 25, alignItems: "center" },
  continueText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
