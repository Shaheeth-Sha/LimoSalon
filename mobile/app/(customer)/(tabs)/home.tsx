import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
} from "react-native";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../../config/api";
import Avatar from "../../../components/Avatar";
import { getTierGradient, getTierAccent, getTierBorder } from "../../../utils/tierTheme";

const PROFILE_API = `${BASE_URL}/api/customers/profile`;
const MY_BOOKINGS_API = `${BASE_URL}/api/bookings/my-bookings`;
const LOYALTY_DASHBOARD_API = `${BASE_URL}/api/loyalty/dashboard`;
const COUPONS_API = `${BASE_URL}/api/coupons`;
const UNREAD_COUNT_API = `${BASE_URL}/api/notifications/unread-count`;

type AlertState = {
  visible: boolean;
  title: string;
  message: string;
};

type Booking = {
  _id: string;
  services: { name: string }[];
  staff: { name: string; image?: string };
  selectedDate: string;
  selectedTime: string;
  status: string;
  isPast: boolean;
};

type LoyaltySummary = {
  tier: string;
  points: number;
};

type Coupon = {
  _id: string;
  title: string;
  description: string;
  discountType: string;
  discountValue: number;
  validUntil: string;
};

// Converts a normalized time like "10:00 am" into minutes since
// midnight, used only to break ties when two bookings share the same
// date (so the earliest one in the day is picked as "next").
const timeToMinutes = (time: string) => {
  const match = time.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (!match) return 0;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toLowerCase();

  if (period === "am" && hours === 12) hours = 0;
  if (period === "pm" && hours !== 12) hours += 12;

  return hours * 60 + minutes;
};

// "10:00 am" -> "10.00 AM", matching the existing design's time format.
const formatTimeDisplay = (time: string) => {
  const match = time.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (!match) return time;
  return `${match[1]}.${match[2]} ${match[3].toUpperCase()}`;
};

// "2026-07-24" -> "Jul 24"
const formatDateShort = (dateStr: string) => {
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
};

// "2026-07-24" -> "Today" / "Tomorrow" / "3 days"
const formatDaysUntil = (dateStr: string) => {
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const target = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);

    if (diffDays <= 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    return `${diffDays} days`;
  } catch {
    return "";
  }
};

const formatDiscount = (coupon: Coupon) =>
  coupon.discountType === "percentage"
    ? `${coupon.discountValue}% off`
    : `LKR ${coupon.discountValue} off`;

export default function Home() {
  const router = useRouter();

  const [customerName, setCustomerName] = useState("Customer");
  const [searchQuery, setSearchQuery] = useState("");

  const [nextBooking, setNextBooking] = useState<Booking | null>(null);
  const [bookingLoading, setBookingLoading] = useState(true);

  // Fixed: previously a hardcoded "Gold Member / 780 Points" card
  // regardless of the actual logged-in customer. Now loads the real
  // tier/points from the same loyalty endpoint the Loyalty Dashboard
  // screen already uses successfully.
  const [loyalty, setLoyalty] = useState<LoyaltySummary | null>(null);
  const [loyaltyLoading, setLoyaltyLoading] = useState(true);

  // Fixed: previously two hardcoded offer cards ("Bridal Season",
  // "Festival Special") that never changed and led to a "coming
  // soon" popup. Now loads real active coupons from the backend.
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(true);

  // Fixed: the bell icon previously had no onPress at all — a dead
  // UI element, same pattern found and fixed on several other
  // screens earlier in this project.
  const [unreadCount, setUnreadCount] = useState(0);

  const [alert, setAlert] = useState<AlertState>({
    visible: false,
    title: "",
    message: "",
  });

  const showAlert = (title: string, message: string) => {
    setAlert({ visible: true, title, message });
  };

  const closeAlert = () => setAlert((prev) => ({ ...prev, visible: false }));

  useEffect(() => {
    loadProfile();
    loadNextBooking();
    loadLoyalty();
    loadCoupons();
    loadUnreadCount();
  }, []);

  // Fixed: previously the badge only fetched once, on first mount —
  // navigating to Notifications and back never refreshed it, so it
  // stayed frozen at the original count even after you'd read
  // everything. Same root cause (and same fix pattern) as the
  // "next booking" card going stale earlier in this project: tab
  // navigators don't destroy Home when you leave it, so it needs to
  // explicitly re-check on every return, not just once.
  //
  // Fixed: the "Upcoming" card had the exact same staleness bug but
  // was never actually wired into this refetch — it only loaded once
  // on mount (see the old useEffect below). So if staff cancelled or
  // completed the booking while the customer was elsewhere in the
  // app, Home kept showing the stale "Confirmed" card indefinitely
  // even though Bookings (which fetches fresh every time) was
  // already correct. Now both refresh together whenever Home regains
  // focus, matching the same pattern already used for the badge.
  //
  // Fixed: the loyalty card (and the coupons list) had this exact
  // same bug too — loaded once on mount and never again. That meant
  // if a customer had Home open (or backgrounded, or just hadn't
  // force-closed the app) from before a booking was marked Completed,
  // the card kept showing stale points/tier forever, even though
  // Loyalty Dashboard — which always fetches fresh on its own mount —
  // showed the correct, up-to-date number. Now both refresh on every
  // focus too.
  useFocusEffect(
    useCallback(() => {
      loadUnreadCount();
      loadNextBooking();
      loadLoyalty();
      loadCoupons();
    }, [])
  );

  const loadUnreadCount = async () => {
    try {
      const token = await AsyncStorage.getItem("customerToken");
      if (!token) return;

      const res = await fetch(UNREAD_COUNT_API, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (res.ok) {
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.log("Unread count load failed:", error);
    }
  };

  const loadProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("customerToken");
      if (!token) return;

      const res = await fetch(PROFILE_API, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (res.ok && data.customer?.name) {
        const fullName = data.customer.name || "";
        const firstName = fullName.trim().split(" ")[0];
        setCustomerName(firstName || "Customer");
      }
    } catch (error) {
      console.log("Profile load failed:", error);
    }
  };

  const loadNextBooking = async () => {
    try {
      setBookingLoading(true);
      const token = await AsyncStorage.getItem("customerToken");
      if (!token) return;

      const res = await fetch(MY_BOOKINGS_API, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) return;

      const bookings: Booking[] = Array.isArray(data.bookings) ? data.bookings : [];

      const upcoming = bookings
        .filter((b) => !b.isPast && b.status !== "Cancelled")
        .sort((a, b) => {
          if (a.selectedDate !== b.selectedDate) {
            return a.selectedDate < b.selectedDate ? -1 : 1;
          }
          return timeToMinutes(a.selectedTime) - timeToMinutes(b.selectedTime);
        });

      setNextBooking(upcoming[0] || null);
    } catch (error) {
      console.log("Next booking load failed:", error);
    } finally {
      setBookingLoading(false);
    }
  };

  const loadLoyalty = async () => {
    try {
      setLoyaltyLoading(true);
      const token = await AsyncStorage.getItem("customerToken");
      if (!token) return;

      const res = await fetch(LOYALTY_DASHBOARD_API, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (res.ok && data.loyalty) {
        setLoyalty({
          tier: data.loyalty.tier,
          points: data.loyalty.points,
        });
      }
    } catch (error) {
      console.log("Loyalty load failed:", error);
    } finally {
      setLoyaltyLoading(false);
    }
  };

  const loadCoupons = async () => {
    try {
      setCouponsLoading(true);

      const res = await fetch(COUPONS_API);
      const data = await res.json();

      if (res.ok && Array.isArray(data.coupons)) {
        // Home only needs a couple of highlights, not the full list —
        // couponsOffers.tsx is where the complete catalog lives.
        setCoupons(data.coupons.slice(0, 2));
      }
    } catch (error) {
      console.log("Coupons load failed:", error);
    } finally {
      setCouponsLoading(false);
    }
  };

  const runSearch = () => {
    if (!searchQuery.trim()) return;
    router.push({
      pathname: "/(customer)/(tabs)/services",
      params: { query: searchQuery.trim() },
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        stickyHeaderIndices={[1]}
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello {customerName}!</Text>
          <TouchableOpacity
            onPress={() => router.push("/(customer)/(services)/notifications")}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="notifications-outline" size={24} color="#000" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.stickyHeader}>
          <View style={styles.searchBox}>
            <TextInput
              placeholder="Search for services or staff....."
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              onSubmitEditing={runSearch}
            />
            <TouchableOpacity onPress={runSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="search" size={20} color="#333" />
            </TouchableOpacity>
          </View>
        </View>

        {/* LOYALTY CARD — gradient + accent recolor per membership tier,
            like a real premium card (Bronze copper, Silver brushed
            steel, Gold gold-leaf, Platinum graphite-black), instead of
            one flat color shown to every customer regardless of tier. */}
        <LinearGradient
          colors={getTierGradient(loyalty?.tier)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.loyaltyCard, { borderColor: getTierBorder(loyalty?.tier) }]}
        >
          <View>
            {loyaltyLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : loyalty ? (
              <>
                <Text style={styles.memberTitle}>{loyalty.tier} Member</Text>
                <Text style={[styles.points, { color: getTierAccent(loyalty.tier) }]}>
                  {loyalty.points} Points
                </Text>
              </>
            ) : (
              <Text style={styles.memberTitle}>Welcome!</Text>
            )}

            <TouchableOpacity
              style={styles.loyaltyBtn}
              activeOpacity={0.8}
              onPress={() => router.push("/(customer)/(services)/loyaltyDashboard")}
            >
              <Text style={styles.loyaltyBtnText}>
                View Loyalty Dashboard &gt;
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.crownCircle}>
            <MaterialCommunityIcons
              name="crown"
              size={38}
              color={getTierAccent(loyalty?.tier)}
            />
          </View>
        </LinearGradient>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Upcoming</Text>
          <TouchableOpacity onPress={() => router.push("/(customer)/(tabs)/bookings")}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>

        {bookingLoading ? (
          <View style={styles.upcomingCard}>
            <ActivityIndicator size="small" color="#FF2D75" />
          </View>
        ) : nextBooking ? (
          <View style={styles.upcomingCard}>
            <View style={styles.cardTopRow}>
              <Text style={styles.status}>{nextBooking.status}</Text>
              <Ionicons name="receipt-outline" size={26} color="#FF2D75" />
            </View>

            <Text style={styles.serviceTitle}>
              {(nextBooking.services || []).map((s) => s.name).filter(Boolean).join(", ") ||
                "Service"}
            </Text>
            {nextBooking.staff?.name ? (
              <View style={styles.staffRow}>
                <Avatar uri={nextBooking.staff.image} name={nextBooking.staff.name} size={20} style={{ marginRight: 6 }} />
                <Text style={styles.staff}>With {nextBooking.staff.name}</Text>
              </View>
            ) : null}

            <View style={styles.dateRow}>
              <View style={styles.dateItem}>
                <Text style={styles.label}>Date</Text>
                <Text style={styles.value}>{formatDateShort(nextBooking.selectedDate)}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.dateItem}>
                <Text style={styles.label}>Time</Text>
                <Text style={styles.value}>{formatTimeDisplay(nextBooking.selectedTime)}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.dateItem}>
                <Text style={styles.label}>In</Text>
                <Text style={styles.value}>{formatDaysUntil(nextBooking.selectedDate)}</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.upcomingCard}>
            <Text style={styles.emptyBookingText}>
              You have no upcoming bookings.
            </Text>
            <TouchableOpacity
              style={styles.emptyBookingBtn}
              activeOpacity={0.8}
              onPress={() => router.push("/(customer)/(tabs)/services")}
            >
              <Text style={styles.emptyBookingBtnText}>Book a Service</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Available Coupons & Offers</Text>
          <TouchableOpacity onPress={() => router.push("/(customer)/(services)/couponsOffers")}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>

        {couponsLoading ? (
          <View style={styles.offerCard}>
            <ActivityIndicator size="small" color="#fff" />
          </View>
        ) : coupons.length === 0 ? (
          <View style={styles.offerCard}>
            <Text style={styles.offerTitle}>No offers right now</Text>
            <Text style={styles.offerSub}>Check back soon for new promotions.</Text>
          </View>
        ) : (
          coupons.map((coupon) => (
            <View key={coupon._id} style={styles.offerCard}>
              <Text style={styles.offerTitle}>{coupon.title}</Text>
              <Text style={styles.offerSub}>{formatDiscount(coupon)}</Text>
              <Text style={styles.offerDesc}>
                {coupon.description ||
                  `Valid till ${new Date(coupon.validUntil).toLocaleDateString()}`}
              </Text>

              <TouchableOpacity
                style={styles.offerBtn}
                activeOpacity={0.8}
                onPress={() => router.push("/(customer)/(services)/couponsOffers")}
              >
                <Text style={styles.offerBtnText}>View Details</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} activeOpacity={0.8}>
          <Ionicons name="home" size={26} color="#FF2D75" />
          <Text style={styles.activeTab}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          activeOpacity={0.8}
          onPress={() => router.push("/(customer)/(tabs)/services")}
        >
          <Ionicons name="cut-outline" size={24} color="#777" />
          <Text style={styles.tab}>Services</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          activeOpacity={0.8}
          onPress={() => router.push("/(customer)/(tabs)/bookings")}
        >
          <Ionicons name="calendar-outline" size={24} color="#777" />
          <Text style={styles.tab}>Bookings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          activeOpacity={0.8}
          onPress={() => router.push("/(customer)/(tabs)/profile")}
        >
          <Ionicons name="person-outline" size={24} color="#777" />
          <Text style={styles.tab}>Profile</Text>
        </TouchableOpacity>
      </View>

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
    backgroundColor: "#f2f2f2",
    paddingTop: 45,
  },

  scrollContent: {
    paddingBottom: 100,
  },

  stickyHeader: {
    backgroundColor: "#f2f2f2",
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 10,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  greeting: {
    fontSize: 24,
    fontWeight: "800",
  },

  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#FF2D75",
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },

  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },

  searchBox: {
    backgroundColor: "#fff",
    borderRadius: 30,
    paddingHorizontal: 18,
    height: 58,
    flexDirection: "row",
    alignItems: "center",
  },

  searchInput: {
    flex: 1,
    fontSize: 16,
  },

  loyaltyCard: {
    marginTop: 28,
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 140,
    // Card-like depth so it reads as a physical membership card sitting
    // on the page, matching the "premium card" feel of real loyalty apps.
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },

  memberTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
  },

  points: {
    color: "#FFC107",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 14,
  },

  loyaltyBtn: {
    backgroundColor: "#F5C5D4",
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 20,
  },

  loyaltyBtnText: {
    color: "#8A1230",
    fontSize: 16,
    fontWeight: "800",
  },

  crownCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 28,
    marginHorizontal: 20,
  },

  sectionTitle: {
    fontSize: 21,
    fontWeight: "800",
  },

  viewAll: {
    color: "#FF2D75",
    fontSize: 15,
    fontWeight: "600",
  },

  upcomingCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    marginTop: 12,
    marginHorizontal: 20,
  },

  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  status: {
    color: "#FF2D75",
    fontWeight: "800",
    fontSize: 16,
  },

  serviceTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginTop: 6,
  },

  staffRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  staff: {
    color: "#666",
    fontSize: 16,
    marginBottom: 16,
  },

  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#F7E8EE",
    padding: 14,
    borderRadius: 12,
  },

  dateItem: {
    flex: 1,
    alignItems: "center",
  },

  label: {
    fontSize: 12,
    color: "#777",
  },

  value: {
    fontWeight: "800",
    fontSize: 14,
  },

  divider: {
    width: 1,
    backgroundColor: "#FF2D75",
    opacity: 0.3,
  },

  emptyBookingText: {
    fontSize: 14,
    color: "#777",
    textAlign: "center",
    paddingVertical: 8,
  },

  emptyBookingBtn: {
    marginTop: 10,
    backgroundColor: "#FF2D75",
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: "center",
  },

  emptyBookingBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  offerCard: {
    backgroundColor: "#D94A70",
    borderRadius: 14,
    padding: 18,
    marginTop: 15,
    marginHorizontal: 20,
    minHeight: 60,
  },

  offerTitle: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 18,
  },

  offerSub: {
    color: "#fff",
    marginTop: 5,
    fontSize: 16,
  },

  offerDesc: {
    marginTop: 8,
    color: "#000",
    fontSize: 15,
  },

  offerBtn: {
    marginTop: 15,
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
    alignSelf: "flex-start",
  },

  offerBtnText: {
    color: "#FF2D75",
    fontWeight: "800",
  },

  bottomNav: {
    height: 72,
    backgroundColor: "#fff",
    borderRadius: 25,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 10,
    marginHorizontal: 20,
  },

  navItem: {
    alignItems: "center",
  },

  activeTab: {
    color: "#FF2D75",
    fontWeight: "bold",
    fontSize: 14,
  },

  tab: {
    color: "#777",
    fontSize: 14,
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