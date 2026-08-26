import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { BASE_URL } from "../../../config/api";

// Bridal-only: pick a time for the trial makeup session, right after
// trialMakeupDate.tsx. The trial is a second real appointment for the
// same staff member, so it goes through the exact same hold-then-
// consume protection the main event slot uses (createBookingHold),
// with a fixed assumed duration since the customer never picks one —
// this is what actually stops two brides' trial sessions (or a trial
// and someone else's haircut) from double-booking the same stylist.
//
// keepHoldId is passed on that call so reserving this second slot
// doesn't wipe out the customer's already-active hold on the main
// event slot — the hold-cleanup step only ever nukes one at a time
// otherwise.
//
// Continue hands off to additionalNotes.tsx in the normal flow.
// "Change Trial Time"/"Change Trial Date" from reviewBooking.tsx
// (editMode="true") creates a fresh hold for the (possibly changed)
// date/time and jumps straight back to Review instead.

const TIME_SLOTS_API = `${BASE_URL}/api/time-slots`;
const HOLD_API = `${BASE_URL}/api/bookings/hold`;

// The customer never picks a trial duration — this is a reasonable
// fixed assumption used purely so the trial slot's hold behaves like
// every other slot's (staff busy for staffId+date+time+duration).
const TRIAL_MAKEUP_DURATION_MINUTES = 60;

// Matches the backend's HOLD_DURATION_MINUTES — this screen still
// tracks the MAIN event hold (no trial hold exists until Continue
// succeeds), same as trialMakeup.tsx/trialMakeupDate.tsx before it.
const HOLD_DURATION_SECONDS = 10 * 60;

const formatCountdown = (seconds: number): string => {
  const safeSeconds = Math.max(seconds, 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
};

const FALLBACK_TIMES = [
  "08.00 am", "09.00 am", "10.00 am", "11.00 am",
  "12.00 pm", "01.00 pm", "02.00 pm", "03.00 pm",
];

const getParamValue = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
};

const safeJsonParse = <T,>(value: string, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const formatLocalDate = (date: Date): string => {
  return (
    `${date.getFullYear()}-` +
    `${String(date.getMonth() + 1).padStart(2, "0")}-` +
    `${String(date.getDate()).padStart(2, "0")}`
  );
};

const timeToMinutes = (time: string): number => {
  const clean = time.replace(".", ":").toLowerCase();
  const match = clean.match(/(\d+):(\d+)\s(am|pm)/);
  if (!match) return 0;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3];

  if (period === "pm" && hour !== 12) hour += 12;
  if (period === "am" && hour === 12) hour = 0;

  return hour * 60 + minute;
};

const isPastTime = (date: string, time: string): boolean => {
  const today = new Date();
  const todayDate = formatLocalDate(today);

  if (date > todayDate) return false;
  if (date < todayDate) return true;

  const currentMinutes = today.getHours() * 60 + today.getMinutes();
  return timeToMinutes(time) <= currentMinutes;
};

const formatDisplayDate = (dateStr: string): string => {
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

const readJsonResponse = async (response: Response): Promise<any> => {
  const rawBody = await response.text();
  if (!rawBody) return {};

  try {
    return JSON.parse(rawBody);
  } catch {
    throw new Error(`Unexpected server response (${response.status})`);
  }
};

export default function TrialMakeupTime() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const editMode = getParamValue(params.editMode) === "true";
  const rescheduleMode = getParamValue(params.rescheduleMode) === "true";
  const bookingIdText = getParamValue(params.bookingId);
  const serviceNameText = getParamValue(params.serviceName);
  const bookingTypeText = getParamValue(params.bookingType);
  const trialMakeupDateText = getParamValue(params.trialMakeupDate);
  const notesText = getParamValue(params.notes);
  const selectedStaffText = getParamValue(params.selectedStaff);
  // The main event's own hold — passed as keepHoldId when reserving
  // the trial slot so that reservation doesn't get wiped out by it.
  // Never set on the reschedule path (rescheduleMode), since no other
  // hold is active there — excludeBookingId is used instead.
  const holdIdText = getParamValue(params.holdId);

  const forwardParams = {
    selectedServices: getParamValue(params.selectedServices),
    selectedLength: getParamValue(params.selectedLength),
    selectedDate: getParamValue(params.selectedDate),
    selectedTime: getParamValue(params.selectedTime),
    selectedStaff: selectedStaffText,
    totalAmount: getParamValue(params.totalAmount),
    bookingType: bookingTypeText,
    estimatedDuration: getParamValue(params.estimatedDuration),
    holdId: holdIdText,
    holdExpiresAt: getParamValue(params.holdExpiresAt),
    holdExpiresInSeconds: getParamValue(params.holdExpiresInSeconds),
  };

  const holdExpiresAtText = forwardParams.holdExpiresAt;
  const holdExpiresInSecondsText = forwardParams.holdExpiresInSeconds;

  const isFocused = useIsFocused();
  const deadlineRef = useRef<number | null>(null);

  if (deadlineRef.current === null) {
    if (holdExpiresAtText) {
      const expiryTime = new Date(holdExpiresAtText).getTime();
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

  const [selectedTime, setSelectedTime] = useState(
    getParamValue(params.trialMakeupTime)
  );
  const [times, setTimes] = useState<string[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(true);
  const [creatingHold, setCreatingHold] = useState(false);
  const [errorState, setErrorState] = useState({ visible: false, message: "" });

  useEffect(() => {
    let isCancelled = false;

    const loadTimes = async () => {
      try {
        setLoadingTimes(true);

        const response = await fetch(
          `${TIME_SLOTS_API}?bookingType=${encodeURIComponent(bookingTypeText)}`
        );

        const data = await readJsonResponse(response);

        if (!response.ok) {
          throw new Error(data.message || "Unable to load available times");
        }

        if (!isCancelled) {
          const fetchedTimes = Array.isArray(data.times) ? data.times : FALLBACK_TIMES;
          setTimes(fetchedTimes.length > 0 ? fetchedTimes : FALLBACK_TIMES);
        }
      } catch (error) {
        console.error("Load time slots failed:", error);

        if (!isCancelled) {
          setTimes(FALLBACK_TIMES);
        }
      } finally {
        if (!isCancelled) {
          setLoadingTimes(false);
        }
      }
    };

    loadTimes();

    return () => {
      isCancelled = true;
    };
  }, [bookingTypeText]);

  // Reserves the trial slot exactly like staff.tsx/eventTime.tsx
  // reserve the main slot — same endpoint, same conflict-checking —
  // so two brides (or a bride and any other customer) can never end
  // up with the same staff member double-booked for overlapping
  // times. Runs on every Continue press, edit or not, since the trial
  // date/time can't be considered "confirmed" without a real hold on
  // it.
  const reserveTrialSlotAndContinue = async () => {
    if (creatingHold || !selectedTime) return;

    if (holdExpired) {
      goReselectDateTime();
      return;
    }

    setCreatingHold(true);
    setErrorState({ visible: false, message: "" });

    try {
      const staff = safeJsonParse<{ _id?: string; staffId?: string }>(
        selectedStaffText,
        {}
      );
      const staffId = String(staff.staffId || staff._id || "");

      if (!staffId) {
        setErrorState({
          visible: true,
          message: "No staff member on file for this booking — please go back and pick one again.",
        });
        return;
      }

      const token = await AsyncStorage.getItem("customerToken");

      if (!token) {
        setErrorState({ visible: true, message: "Please log in again." });
        return;
      }

      const res = await fetch(HOLD_API, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          staffId,
          selectedDate: trialMakeupDateText,
          selectedTime,
          estimatedDuration: TRIAL_MAKEUP_DURATION_MINUTES,
          // Reschedule path: no other hold is active for this
          // customer right now, so the new trial slot is reserved
          // with excludeBookingId instead — the booking's own current
          // trial slot should never count as a conflict against
          // itself. Normal/edit paths keep the main event's hold
          // alive via keepHoldId, same as before.
          ...(rescheduleMode
            ? { excludeBookingId: bookingIdText }
            : { keepHoldId: holdIdText || undefined }),
        }),
      });

      const data = await readJsonResponse(res);

      if (!res.ok || !data.hold?.holdId) {
        throw new Error(
          data.message || "This trial time is no longer available for your artist."
        );
      }

      if (rescheduleMode) {
        router.push({
          pathname: "/(customer)/(services)/rescheduleConfirm",
          params: {
            bookingId: bookingIdText,
            serviceName: serviceNameText,
            selectedDate: trialMakeupDateText,
            selectedTime,
            trialHoldId: String(data.hold.holdId),
            kind: "trial",
          },
        });
        return;
      }

      const trialHoldParams = {
        trialHoldId: String(data.hold.holdId),
        trialHoldExpiresAt: String(data.hold.expiresAt),
        trialHoldExpiresInSeconds: String(data.hold.expiresInSeconds),
      };

      if (editMode) {
        router.replace({
          pathname: "/(customer)/(services)/reviewBooking",
          params: {
            ...forwardParams,
            wantsTrialMakeup: "true",
            trialMakeupDate: trialMakeupDateText,
            trialMakeupTime: selectedTime,
            notes: notesText,
            ...trialHoldParams,
          },
        });
        return;
      }

      router.push({
        pathname: "/(customer)/(services)/additionalNotes",
        params: {
          ...forwardParams,
          wantsTrialMakeup: "true",
          trialMakeupDate: trialMakeupDateText,
          trialMakeupTime: selectedTime,
          ...trialHoldParams,
        },
      });
    } catch (error: any) {
      setErrorState({
        visible: true,
        message: error?.message || "Unable to reserve this trial time. Please try another slot.",
      });
    } finally {
      setCreatingHold(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Trial Makeup Time</Text>
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

      <Text style={styles.subText}>Select Event Time</Text>

      {trialMakeupDateText ? (
        <View style={styles.dateBox}>
          <Ionicons name="calendar-outline" size={16} color="#FF2D75" />
          <Text style={styles.dateBoxText}>
            {formatDisplayDate(trialMakeupDateText)}
          </Text>
        </View>
      ) : null}

      <ScrollView showsVerticalScrollIndicator={false}>
        {loadingTimes ? (
          <View style={styles.timeLoaderBox}>
            <ActivityIndicator size="small" color="#FF2D75" />
            <Text style={styles.timeLoaderText}>Loading available times...</Text>
          </View>
        ) : (
          times.map((time) => {
            const blocked =
              !trialMakeupDateText || isPastTime(trialMakeupDateText, time);
            const selected = selectedTime === time;

            return (
              <TouchableOpacity
                key={time}
                disabled={blocked}
                style={[
                  styles.timeRow,
                  selected && styles.timeActive,
                  blocked && styles.timeDisabled,
                ]}
                onPress={() => setSelectedTime(time)}
              >
                <Text
                  style={[
                    styles.timeText,
                    selected && styles.timeTextActive,
                    blocked && styles.disabledText,
                  ]}
                >
                  {time}
                </Text>
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.bottom}>
        <TouchableOpacity
          disabled={!holdExpired && (!selectedTime || creatingHold)}
          style={[
            styles.continue,
            !holdExpired && (!selectedTime || creatingHold) && styles.disabledButton,
          ]}
          onPress={reserveTrialSlotAndContinue}
        >
          <Text style={styles.continueText}>
            {holdExpired
              ? "Select Date & Time Again"
              : creatingHold
              ? "Reserving..."
              : "Continue"}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={errorState.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setErrorState({ visible: false, message: "" })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <Feather name="alert-circle" size={28} color="#FF2D75" />
            </View>
            <Text style={styles.modalTitle}>Unable to Reserve</Text>
            <Text style={styles.modalMessage}>{errorState.message}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              activeOpacity={0.8}
              onPress={() => setErrorState({ visible: false, message: "" })}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F7", paddingTop: 50, paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  headerText: { fontSize: 18, fontWeight: "700", marginLeft: 10 },
  subText: { fontSize: 13, color: "#777", marginBottom: 12 },
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
  dateBox: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#FFF4F8",
    borderWidth: 1, borderColor: "#F5B8CE", borderRadius: 12, padding: 12,
    marginBottom: 18,
  },
  dateBoxText: { marginLeft: 8, fontSize: 14, fontWeight: "700", color: "#111" },
  timeLoaderBox: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 30 },
  timeLoaderText: { marginLeft: 10, color: "#777", fontSize: 13 },
  timeRow: {
    width: "100%", height: 50, borderWidth: 1, borderColor: "#FF2D75", borderRadius: 10,
    justifyContent: "center", alignItems: "center", marginBottom: 14, backgroundColor: "#fff",
  },
  timeActive: { backgroundColor: "#FFE1EC" },
  timeDisabled: { backgroundColor: "#E5E5E5", borderColor: "#CCC" },
  timeText: { color: "#111", fontSize: 15, fontWeight: "700" },
  timeTextActive: { color: "#111" },
  disabledText: { color: "#999" },
  bottom: {
    position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff",
    padding: 15, borderTopLeftRadius: 25, borderTopRightRadius: 25, elevation: 8,
  },
  continue: { backgroundColor: "#FF2D75", padding: 14, borderRadius: 25, alignItems: "center" },
  disabledButton: { opacity: 0.5 },
  continueText: { color: "#fff", fontWeight: "700", fontSize: 15 },
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
