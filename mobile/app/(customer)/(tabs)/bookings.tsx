import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import { useEffect, useState } from "react";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "http://10.0.2.2:5000";
const MY_BOOKINGS_API = `${BASE_URL}/api/bookings/my-bookings`;
const CANCEL_BOOKING_API = (bookingId: string) =>
  `${BASE_URL}/api/bookings/${bookingId}/cancel`;

type Booking = {
  _id: string;
  services: { name: string }[];
  staff: { name: string; staffId?: string };
  estimatedDuration?: number;
  selectedDate: string;
  selectedTime: string;
  totalAmount: number;
  status: string;
  effectiveStatus: string;
  paymentStatus: string;
  isPast: boolean;
  rescheduleHistory?: { previousDate: string; previousTime: string; rescheduledAt: string }[];
};

type AlertState = {
  visible: boolean;
  title: string;
  message: string;
};

export default function Bookings() {
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const [alert, setAlert] = useState<AlertState>({
    visible: false,
    title: "",
    message: "",
  });

  const showAlert = (title: string, message: string) => {
    setAlert({ visible: true, title, message });
  };

  const closeAlert = () => setAlert((prev) => ({ ...prev, visible: false }));

  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  // Feedback is tracked locally per booking id, since there's
  // no feedback backend yet. This is a demo-only simulation — it won't
  // survive an app restart. Map of bookingId -> feedback text.
  const [feedbackByBookingId, setFeedbackByBookingId] = useState<Record<string, string>>({});
  const [feedbackModal, setFeedbackModal] = useState<{
    mode: "write" | "view";
    bookingId: string | null;
    text: string;
  }>({ mode: "write", bookingId: null, text: "" });

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("customerToken");

      if (!token) {
        showAlert("Not Logged In", "Please log in to view your bookings.");
        return;
      }

      const res = await fetch(MY_BOOKINGS_API, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        // Response wasn't JSON at all.
      }

      if (!res.ok) {
        throw new Error(
          data.message || `Request failed with status ${res.status}`
        );
      }

      setBookings(Array.isArray(data.bookings) ? data.bookings : []);
    } catch (error: any) {
      console.log("Load bookings error:", error);
      showAlert("Error", `Unable to load your bookings.\n\n${error?.message || ""}`);
    } finally {
      setLoading(false);
    }
  };

  const runCancelBooking = async (bookingId: string) => {
    try {
      setCancellingId(bookingId);
      const token = await AsyncStorage.getItem("customerToken");

      const res = await fetch(CANCEL_BOOKING_API(bookingId), {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to cancel booking");
      }

      setBookings((prev) =>
        prev.map((b) =>
          b._id === bookingId
            ? { ...b, status: "Cancelled", effectiveStatus: "Cancelled", isPast: true }
            : b
        )
      );

      showAlert("Booking Cancelled", "Your booking has been cancelled.");
    } catch (error) {
      console.log("Cancel booking error:", error);
      showAlert("Error", "Unable to cancel this booking.");
    } finally {
      setCancellingId(null);
      setConfirmCancelId(null);
    }
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

  const upcomingBookings = bookings.filter((b) => !b.isPast);
  const pastBookings = bookings.filter((b) => b.isPast);

  const visibleBookings = activeTab === "upcoming" ? upcomingBookings : pastBookings;

  const getStatusPillStyle = (status: string) => {
    if (status === "Cancelled") return styles.cancelPill;
    if (status === "Completed") return styles.completedPill;
    if (status === "Awaiting Confirmation") return styles.awaitingPill;
    return styles.statusPill;
  };

  const openFeedbackModal = (bookingId: string) => {
    const existing = feedbackByBookingId[bookingId];
    setFeedbackModal({
      mode: existing ? "view" : "write",
      bookingId,
      text: existing || "",
    });
  };

  const submitFeedback = () => {
    if (!feedbackModal.bookingId || !feedbackModal.text.trim()) return;

    setFeedbackByBookingId((prev) => ({
      ...prev,
      [feedbackModal.bookingId as string]: feedbackModal.text.trim(),
    }));

    setFeedbackModal({ mode: "write", bookingId: null, text: "" });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>

        <Text style={styles.header}>My Bookings</Text>

        <View style={{ width: 24 }} />
      </View>

      {/* Toggle */}
      <View style={styles.toggleWrapper}>
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            activeTab === "upcoming" && styles.activeBtn,
          ]}
          onPress={() => setActiveTab("upcoming")}
        >
          <Text
            style={[
              styles.toggleText,
              activeTab === "upcoming" && styles.activeText,
            ]}
          >
            Upcoming
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toggleBtn,
            activeTab === "past" && styles.activeBtn,
          ]}
          onPress={() => setActiveTab("past")}
        >
          <Text
            style={[
              styles.toggleText,
              activeTab === "past" && styles.activeText,
            ]}
          >
            Past
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#FF2D75" />
        </View>
      ) : visibleBookings.length === 0 ? (
        <View style={styles.loader}>
          <Text style={styles.emptyText}>
            {activeTab === "upcoming"
              ? "You have no upcoming bookings."
              : "You have no past bookings yet."}
          </Text>
        </View>
      ) : (
        // FIX: ScrollView needs an explicit flex:1 so it actually claims
        // the remaining vertical space in this layout, and a bottom
        // padding on contentContainerStyle so the last card can scroll
        // clear of the bottom tab bar instead of being hidden under it.
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {visibleBookings.map((booking) => {
            const serviceNames = (booking.services || [])
              .map((s) => s.name)
              .filter(Boolean)
              .join(", ");

            // Use the computed effectiveStatus (Completed for
            // past-due Confirmed bookings) instead of the raw status,
            // so the pill and feedback button reflect reality.
            const displayStatus = booking.effectiveStatus || booking.status;
            const hasFeedback = !!feedbackByBookingId[booking._id];

            return (
              <View key={booking._id} style={styles.card}>
                <View style={styles.rowBetween}>
                  <View style={getStatusPillStyle(displayStatus)}>
                    <Text style={styles.statusText}>{displayStatus}</Text>
                  </View>
                  <Text style={styles.priceTop}>
                    LKR {booking.totalAmount?.toLocaleString()}
                  </Text>
                </View>

                <Text style={styles.title}>{serviceNames || "Service"}</Text>
                {booking.staff?.name ? (
                  <Text style={styles.sub}>With {booking.staff.name}</Text>
                ) : null}

                {/* Shows when this booking has been moved at
                    least once, so the customer (and staff, if this
                    view is reused there later) can tell at a glance
                    that the current date/time isn't the original one. */}
                {booking.rescheduleHistory && booking.rescheduleHistory.length > 0 && (
                  <View style={styles.rescheduledBadge}>
                    <Feather name="refresh-cw" size={11} color="#8A1230" />
                    <Text style={styles.rescheduledBadgeText}>
                      Rescheduled
                      {booking.rescheduleHistory.length > 1
                        ? ` ${booking.rescheduleHistory.length}x`
                        : ""}
                    </Text>
                  </View>
                )}

                <Text style={styles.info}>📅 {formatDate(booking.selectedDate)}</Text>
                <Text style={styles.info}>⏰ {booking.selectedTime}</Text>

                {booking.paymentStatus && booking.paymentStatus !== "Paid" && (
                  <Text style={styles.paymentNote}>
                    Payment: {booking.paymentStatus}
                  </Text>
                )}

                <View style={styles.rowBetween}>
                  <Text style={styles.priceBottom}>
                    LKR {booking.totalAmount?.toLocaleString()}
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: "/(customer)/(services)/bookingDetails",
                        params: { booking: JSON.stringify(booking) },
                      })
                    }
                  >
                    <Text style={styles.viewDetails}>View Details</Text>
                  </TouchableOpacity>
                </View>

                {activeTab === "upcoming" && displayStatus !== "Cancelled" && (
                  <View style={styles.rowBetween}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      activeOpacity={0.8}
                      disabled={cancellingId === booking._id}
                      onPress={() => setConfirmCancelId(booking._id)}
                    >
                      <Text style={styles.cancelText}>
                        {cancellingId === booking._id ? "Cancelling..." : "Cancel"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.rescheduleBtn}
                      activeOpacity={0.8}
                      onPress={() =>
                        router.push({
                          pathname: "/(customer)/(services)/reschedule",
                          params: {
                            bookingId: booking._id,
                            serviceName: serviceNames || "Service",
                            date: formatDate(booking.selectedDate),
                            time: booking.selectedTime,
                            staffId: booking.staff?.staffId || "",
                            estimatedDuration: String(booking.estimatedDuration || ""),
                          },
                        })
                      }
                    >
                      <Text style={styles.rescheduleText}>Reschedule</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {activeTab === "past" && displayStatus === "Completed" && (
                  <TouchableOpacity
                    style={styles.feedbackBtn}
                    activeOpacity={0.8}
                    onPress={() => openFeedbackModal(booking._id)}
                  >
                    <Text style={styles.feedbackText}>
                      {hasFeedback ? "View Your Feedback" : "Leave Feedback"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Cancel confirmation modal */}
      <Modal
        visible={!!confirmCancelId}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmCancelId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <Feather name="alert-triangle" size={28} color="#FF2D75" />
            </View>
            <Text style={styles.modalTitle}>Cancel this booking?</Text>
            <Text style={styles.modalMessage}>
              This can't be undone. You'll need to book again if you change your mind.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              activeOpacity={0.8}
              onPress={() => confirmCancelId && runCancelBooking(confirmCancelId)}
            >
              <Text style={styles.modalButtonText}>Yes, Cancel Booking</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalButtonSecondary}
              activeOpacity={0.8}
              onPress={() => setConfirmCancelId(null)}
            >
              <Text style={styles.modalButtonSecondaryText}>Keep Booking</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Feedback modal — write or view, same modal, different mode.
          NOTE: this is a local, demo-only simulation — feedback text
          lives in component state only and is not sent to any backend
          yet. Wire up a real endpoint here if you want it to persist. */}
      <Modal
        visible={!!feedbackModal.bookingId}
        transparent
        animationType="fade"
        onRequestClose={() => setFeedbackModal({ mode: "write", bookingId: null, text: "" })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <Feather
                name={feedbackModal.mode === "view" ? "message-circle" : "edit-3"}
                size={28}
                color="#FF2D75"
              />
            </View>
            <Text style={styles.modalTitle}>
              {feedbackModal.mode === "view" ? "Your Feedback" : "Leave Feedback"}
            </Text>

            {feedbackModal.mode === "view" ? (
              <Text style={styles.modalMessage}>{feedbackModal.text}</Text>
            ) : (
              <TextInput
                style={styles.feedbackInput}
                placeholder="How was your experience?"
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                value={feedbackModal.text}
                onChangeText={(text) =>
                  setFeedbackModal((prev) => ({ ...prev, text }))
                }
              />
            )}

            <TouchableOpacity
              style={styles.modalButton}
              activeOpacity={0.8}
              onPress={
                feedbackModal.mode === "view"
                  ? () => setFeedbackModal({ mode: "write", bookingId: null, text: "" })
                  : submitFeedback
              }
            >
              <Text style={styles.modalButtonText}>
                {feedbackModal.mode === "view" ? "Close" : "Submit Feedback"}
              </Text>
            </TouchableOpacity>

            {feedbackModal.mode === "write" && (
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                activeOpacity={0.8}
                onPress={() => setFeedbackModal({ mode: "write", bookingId: null, text: "" })}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Custom branded alert modal — replaces Alert.alert() */}
      <Modal visible={alert.visible} transparent animationType="fade" onRequestClose={closeAlert}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <Feather name="info" size={28} color="#FF2D75" />
            </View>
            <Text style={styles.modalTitle}>{alert.title}</Text>
            <Text style={styles.modalMessage}>{alert.message}</Text>
            <TouchableOpacity style={styles.modalButton} activeOpacity={0.8} onPress={closeAlert}>
              <Text style={styles.modalButtonText}>OK</Text>
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
    backgroundColor: "#F4F4F4",
    paddingHorizontal: 20,
    paddingTop: 60,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  header: {
    fontSize: 18,
    fontWeight: "600",
  },

  toggleWrapper: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },

  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 10,
  },

  activeBtn: {
    backgroundColor: "#FF2D75",
  },

  toggleText: {
    fontSize: 13,
    color: "#777",
  },

  activeText: {
    color: "#fff",
    fontWeight: "600",
  },

  // FIX: give the ScrollView itself a defined flex so it fills the
  // remaining space below the header/toggle instead of collapsing to
  // its content size (which can prevent scrolling in some RN versions).
  scrollArea: {
    flex: 1,
  },

  // FIX: extra bottom padding so the last card in the list can be
  // scrolled up clear of the bottom tab bar instead of sitting behind it.
  scrollContent: {
    paddingBottom: 100,
  },

  card: {
    backgroundColor: "#d86a86",
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 6,
  },

  sub: {
    fontSize: 12,
    marginBottom: 6,
  },

  rescheduledBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#F5C5D4",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    marginBottom: 6,
  },

  rescheduledBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#8A1230",
  },

  info: {
    fontSize: 12,
    marginTop: 4,
  },

  paymentNote: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: "600",
    color: "#5A1020",
  },

  priceTop: {
    fontSize: 12,
  },

  priceBottom: {
    fontSize: 12,
    marginVertical: 10,
  },

  statusPill: {
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },

  completedPill: {
    backgroundColor: "#eee",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },

  awaitingPill: {
    backgroundColor: "#FFF3D6",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },

  cancelPill: {
    backgroundColor: "#eee",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },

  statusText: {
    fontSize: 11,
  },

  viewDetails: {
    fontSize: 11,
    textDecorationLine: "underline",
  },

  feedbackBtn: {
    backgroundColor: "#FF2D75",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },

  feedbackText: {
    color: "#fff",
    fontSize: 13,
  },

  cancelBtn: {
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
  },

  cancelText: {
    fontSize: 12,
  },

  rescheduleBtn: {
    backgroundColor: "#FF2D75",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
  },

  rescheduleText: {
    color: "#fff",
    fontSize: 12,
  },

  loader: {
    marginTop: 80,
    alignItems: "center",
    paddingHorizontal: 30,
  },

  emptyText: {
    color: "#777",
    fontSize: 14,
    textAlign: "center",
  },

  feedbackInput: {
    width: "100%",
    minHeight: 90,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: "#111",
    textAlignVertical: "top",
    marginBottom: 18,
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

  modalButtonSecondary: {
    width: "100%",
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 4,
  },

  modalButtonSecondaryText: {
    color: "#777",
    fontWeight: "600",
    fontSize: 14,
  },
});