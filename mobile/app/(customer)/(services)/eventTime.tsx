import React, { useEffect, useState } from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";

import { BASE_URL } from "../../../config/api";

// Bridal-only, second half of the date/time step — matches the Figma
// "Event Time" frame: a single full-width column of time slots
// (rather than the two-column grid dateTime.tsx/rescheduleDateTime.tsx
// use elsewhere). Fetches the same admin-editable business-hours
// window dateTime.tsx already uses (bridal gets 4am-10pm via
// /api/time-slots).
//
// Two ways to land here:
//  - Normal flow (editMode not set): Continue hands off to staff.tsx,
//    same as dateTime.tsx's Continue always did.
//  - "Change Date" / "Change Time" from reviewBooking.tsx (editMode
//    ="true", staff/hold/trial info all carried in params): Continue
//    creates a FRESH hold for the already-chosen staff at the new
//    date/time, then jumps straight back to reviewBooking.tsx — no
//    need to re-visit staff.tsx or any of the trial-makeup screens.

const TIME_SLOTS_API = `${BASE_URL}/api/time-slots`;
const HOLD_API = `${BASE_URL}/api/bookings/hold`;

// Third way to land here, alongside the normal flow and the
// editMode="true" ("Change Date"/"Change Time" from reviewBooking.tsx)
// path above: rescheduleMode="true" arrives from reschedule.tsx for
// an already-CONFIRMED bridal booking. There's no active hold to
// protect here (keepHoldId doesn't apply — nothing else is reserved
// for this customer right now), so the new slot is reserved with
// excludeBookingId instead, exactly like rescheduleDateTime.tsx does
// for every other booking type. Continue then hands off to
// rescheduleConfirm.tsx to actually commit the change, rather than
// going anywhere in the booking wizard.

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

export default function EventTime() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const selectedServicesText = getParamValue(params.selectedServices);
  const selectedLengthText = getParamValue(params.selectedLength);
  const totalAmountText = getParamValue(params.totalAmount);
  const bookingTypeText = getParamValue(params.bookingType);
  const selectedDateText = getParamValue(params.selectedDate);
  const selectedStaffText = getParamValue(params.selectedStaff);
  const estimatedDurationText = getParamValue(params.estimatedDuration);
  const wantsTrialMakeupText = getParamValue(params.wantsTrialMakeup);
  const trialMakeupDateText = getParamValue(params.trialMakeupDate);
  const trialMakeupTimeText = getParamValue(params.trialMakeupTime);
  // Only meaningful once a trial hold already exists (edit path) —
  // forwarded on so it survives the main-hold refresh below (via
  // keepHoldId) instead of getting silently deleted by it.
  const trialHoldIdText = getParamValue(params.trialHoldId);
  const trialHoldExpiresAtText = getParamValue(params.trialHoldExpiresAt);
  const trialHoldExpiresInSecondsText = getParamValue(params.trialHoldExpiresInSeconds);
  const notesText = getParamValue(params.notes);
  const editMode = getParamValue(params.editMode) === "true";
  const rescheduleMode = getParamValue(params.rescheduleMode) === "true";
  const bookingIdText = getParamValue(params.bookingId);
  const serviceNameText = getParamValue(params.serviceName);

  // Pre-fills when arriving via "Change Time" (editMode, existing
  // time carried in params) — empty in the normal flow from
  // eventDate.tsx, which never forwards a selectedTime.
  const [selectedTime, setSelectedTime] = useState(
    getParamValue(params.selectedTime)
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

  const goToStaff = () => {
    router.push({
      pathname: "/(customer)/(services)/staff",
      params: {
        selectedServices: selectedServicesText,
        selectedLength: selectedLengthText,
        selectedDate: selectedDateText,
        selectedTime,
        totalAmount: totalAmountText,
        bookingType: bookingTypeText,
      },
    });
  };

  // "Change Date"/"Change Time" path: the staff member is already
  // chosen, so instead of sending the customer back through staff.tsx
  // we create a fresh hold for the SAME staff at the new date/time
  // and jump straight back to reviewBooking.tsx.
  const refreshHoldAndReturnToReview = async () => {
    if (creatingHold) return;
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
          selectedDate: selectedDateText,
          selectedTime,
          estimatedDuration: Number(estimatedDurationText) || 0,
          // Protects the already-reserved trial slot from being
          // wiped out by this hold's cleanup step.
          keepHoldId: trialHoldIdText || undefined,
        }),
      });

      const data = await readJsonResponse(res);

      if (!res.ok || !data.hold?.holdId) {
        throw new Error(
          data.message || "This time is no longer available for your artist."
        );
      }

      router.replace({
        pathname: "/(customer)/(services)/reviewBooking",
        params: {
          selectedServices: selectedServicesText,
          selectedLength: selectedLengthText,
          selectedDate: selectedDateText,
          selectedTime,
          selectedStaff: selectedStaffText,
          totalAmount: totalAmountText,
          bookingType: bookingTypeText,
          estimatedDuration: estimatedDurationText,
          holdId: String(data.hold.holdId),
          holdExpiresAt: String(data.hold.expiresAt),
          holdExpiresInSeconds: String(data.hold.expiresInSeconds),
          wantsTrialMakeup: wantsTrialMakeupText,
          trialMakeupDate: trialMakeupDateText,
          trialMakeupTime: trialMakeupTimeText,
          trialHoldId: trialHoldIdText,
          trialHoldExpiresAt: trialHoldExpiresAtText,
          trialHoldExpiresInSeconds: trialHoldExpiresInSecondsText,
          notes: notesText,
        },
      });
    } catch (error: any) {
      setErrorState({
        visible: true,
        message: error?.message || "Unable to reserve this time. Please try another slot.",
      });
    } finally {
      setCreatingHold(false);
    }
  };

  // Reschedule path: the staff member and current slot already exist
  // on a real, confirmed booking — this just reserves the new date/
  // time (excluding the booking's own current slot from the conflict
  // check, same as rescheduleDateTime.tsx) and hands off to
  // rescheduleConfirm.tsx to actually commit it.
  const reserveAndGoToRescheduleConfirm = async () => {
    if (creatingHold) return;
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
          selectedDate: selectedDateText,
          selectedTime,
          estimatedDuration: Number(estimatedDurationText) || 0,
          excludeBookingId: bookingIdText,
        }),
      });

      const data = await readJsonResponse(res);

      if (!res.ok || !data.hold?.holdId) {
        throw new Error(
          data.message || "This time is no longer available for your artist."
        );
      }

      router.push({
        pathname: "/(customer)/(services)/rescheduleConfirm",
        params: {
          bookingId: bookingIdText,
          serviceName: serviceNameText,
          selectedDate: selectedDateText,
          selectedTime,
          holdId: String(data.hold.holdId),
        },
      });
    } catch (error: any) {
      setErrorState({
        visible: true,
        message: error?.message || "Unable to reserve this time. Please try another slot.",
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
        <Text style={styles.headerText}>Event Time</Text>
      </View>

      <Text style={styles.subText}>Select Event Time</Text>

      {selectedDateText ? (
        <View style={styles.dateBox}>
          <Ionicons name="calendar-outline" size={16} color="#FF2D75" />
          <Text style={styles.dateBoxText}>
            {formatDisplayDate(selectedDateText)}
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
              !selectedDateText || isPastTime(selectedDateText, time);
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
          disabled={!selectedTime || creatingHold}
          style={[
            styles.continue,
            (!selectedTime || creatingHold) && styles.disabledButton,
          ]}
          onPress={
            rescheduleMode
              ? reserveAndGoToRescheduleConfirm
              : editMode
              ? refreshHoldAndReturnToReview
              : goToStaff
          }
        >
          <Text style={styles.continueText}>
            {creatingHold ? "Reserving..." : "Continue"}
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
