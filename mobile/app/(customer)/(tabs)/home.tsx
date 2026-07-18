import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
} from "react-native";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PROFILE_API = "http://10.0.2.2:5000/api/customers/profile";

type AlertState = {
  visible: boolean;
  title: string;
  message: string;
};

export default function Home() {
  const router = useRouter();

  const [customerName, setCustomerName] = useState("Customer");
  const [searchQuery, setSearchQuery] = useState("");

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
          // Fixed: was .slice(-1)[0], which grabs the LAST word of the
          // full name (the last name). Greeting someone by their last
          // name reads backwards — real apps greet by first name.
          const firstName = fullName.trim().split(" ")[0];
          setCustomerName(firstName || "Customer");
        }
      } catch (error) {
        console.log("Profile load failed:", error);
      }
    };

    loadProfile();
  }, []);

  // Fixed: search bar had no state, no submit handler, and the icon
  // wasn't even wrapped in a touchable — nothing happened when typing
  // or tapping it. Now it navigates to the Services tab with the
  // query attached, so that screen can filter by it once it reads
  // this param.
  const runSearch = () => {
    if (!searchQuery.trim()) return;
    router.push({
      pathname: "/(customer)/(tabs)/services",
      params: { query: searchQuery.trim() },
    });
  };

  return (
    <View style={styles.container}>
      {/* Fixed: previously the greeting and search bar scrolled away
          with everything else. Real-world booking apps typically keep
          the search bar reachable while scrolling — using
          stickyHeaderIndices pins just the search bar (index 0 below)
          while the rest of the content scrolls normally underneath. */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        stickyHeaderIndices={[1]}
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello {customerName}!</Text>
          <Ionicons name="notifications-outline" size={24} color="#000" />
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

        {/* LOYALTY CARD */}
        <View style={styles.loyaltyCard}>
          <View>
            <Text style={styles.memberTitle}>Gold Member</Text>
            <Text style={styles.points}>780 Points</Text>

            <TouchableOpacity
              style={styles.loyaltyBtn}
              activeOpacity={0.8}
              onPress={() => showAlert("Loyalty Dashboard", "This feature is coming soon.")}
            >
              <Text style={styles.loyaltyBtnText}>
                View Loyalty Dashboard &gt;
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.crownCircle}>
            <MaterialCommunityIcons name="crown" size={38} color="#FFD166" />
          </View>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Upcoming</Text>
          <TouchableOpacity onPress={() => router.push("/(customer)/(tabs)/bookings")}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.upcomingCard}>
          <View style={styles.cardTopRow}>
            <Text style={styles.status}>Confirmed</Text>
            <Ionicons name="receipt-outline" size={26} color="#FF2D75" />
          </View>

          <Text style={styles.serviceTitle}>Hair Cut & Styling</Text>
          <Text style={styles.staff}>With Rashmi W.</Text>

          <View style={styles.dateRow}>
            <View style={styles.dateItem}>
              <Text style={styles.label}>Date</Text>
              <Text style={styles.value}>Oct 24</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.dateItem}>
              <Text style={styles.label}>Time</Text>
              <Text style={styles.value}>10.00 AM</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.dateItem}>
              <Text style={styles.label}>In</Text>
              <Text style={styles.value}>2 days</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Available Coupons & Offers</Text>
          <TouchableOpacity onPress={() => showAlert("Offers", "This feature is coming soon.")}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.offerCard}>
          <Text style={styles.offerTitle}>Bridal Season</Text>
          <Text style={styles.offerSub}>20% off Bridal Packages</Text>
          <Text style={styles.offerDesc}>
            Book your complete bridal look this month and save
          </Text>

          <TouchableOpacity
            style={styles.offerBtn}
            activeOpacity={0.8}
            onPress={() => showAlert("Bridal Season", "This feature is coming soon.")}
          >
            <Text style={styles.offerBtnText}>Claim Offer</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.offerCard}>
          <Text style={styles.offerTitle}>Festival Special</Text>
          <Text style={styles.offerSub}>Combo Offer</Text>
          <Text style={styles.offerDesc}>
            Any stylish haircut with wash + Threading 25%
          </Text>

          <TouchableOpacity
            style={styles.offerBtn}
            activeOpacity={0.8}
            onPress={() => showAlert("Festival Special", "This feature is coming soon.")}
          >
            <Text style={styles.offerBtnText}>Claim Offer</Text>
          </TouchableOpacity>
        </View>
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

      {/* Custom branded alert modal — matches the pattern used across
          the rest of the app instead of native Alert.alert(). */}
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

// =====================================================
// App primary color: #FF2D75 (matches project design spec)
// Was #ff4d6d in several places (status text, view-all links, nav
// icons, offer button text) — fixed to the correct hex.
// Loyalty card intentionally keeps its own maroon/gold palette per
// request — real apps commonly differentiate a "Gold Member" card
// from the main brand color for a premium feel.
// =====================================================
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
    backgroundColor: "#A60F1C",
    borderRadius: 12,
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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

  offerCard: {
    backgroundColor: "#D94A70",
    borderRadius: 14,
    padding: 18,
    marginTop: 15,
    marginHorizontal: 20,
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