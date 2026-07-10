import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {useEffect, useState} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PROFILE_API = "http://10.0.2.2:5000/api/customers/profile";

export default function Home() {
  const router = useRouter();
  
const [customerName, setCustomerName] = useState("Customer");

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
          const lastName = fullName.trim().split(" ").slice(-1)[0];
          setCustomerName(lastName || "Customer");
        } 
      } catch (error) {
        console.log("Profile load failed:", error);
      }
    };

    loadProfile();
  }, []);
  
  
    return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello {customerName}!</Text>
          <Ionicons name="notifications-outline" size={24} color="#000" />
        </View>

        <View style={styles.searchBox}>
          <TextInput
            placeholder="Search for services or staff....."
            style={styles.searchInput}
          />
          <Ionicons name="search" size={20} color="#333" />
        </View>

        {/* LOYALTY CARD */}
        <View style={styles.loyaltyCard}>
          <View>
            <Text style={styles.memberTitle}>Gold Member</Text>
            <Text style={styles.points}>780 Points</Text>

            <TouchableOpacity style={styles.loyaltyBtn}>
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
            <Ionicons name="receipt-outline" size={26} color="#ff4d6d" />
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
          <Text style={styles.viewAll}>View All</Text>
        </View>

        <View style={styles.offerCard}>
          <Text style={styles.offerTitle}>Bridal Season</Text>
          <Text style={styles.offerSub}>20% off Bridal Packages</Text>
          <Text style={styles.offerDesc}>
            Book your complete bridal look this month and save
          </Text>

          <TouchableOpacity style={styles.offerBtn}>
            <Text style={styles.offerBtnText}>Claim Offer</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.offerCard}>
          <Text style={styles.offerTitle}>Festival Special</Text>
          <Text style={styles.offerSub}>Combo Offer</Text>
          <Text style={styles.offerDesc}>
            Any stylish haircut with wash + Threading 25%
          </Text>

          <TouchableOpacity style={styles.offerBtn}>
            <Text style={styles.offerBtnText}>Claim Offer</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="home" size={26} color="#ff4d6d" />
          <Text style={styles.activeTab}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/(customer)/(tabs)/services")}
        >
          <Ionicons name="cut-outline" size={24} color="#777" />
          <Text style={styles.tab}>Services</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/(customer)/(tabs)/bookings")}
        >
          <Ionicons name="calendar-outline" size={24} color="#777" />
          <Text style={styles.tab}>Bookings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/(customer)/(tabs)/profile")}
        >
          <Ionicons name="person-outline" size={24} color="#777" />
          <Text style={styles.tab}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f2f2",
    paddingTop: 45,
    paddingHorizontal: 20,
  },

  scrollContent: {
    paddingBottom: 100,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  greeting: {
    fontSize: 24,
    fontWeight: "800",
  },

  searchBox: {
    marginTop: 18,
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
  },

  sectionTitle: {
    fontSize: 21,
    fontWeight: "800",
  },

  viewAll: {
    color: "#ff4d6d",
    fontSize: 15,
    fontWeight: "600",
  },

  upcomingCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    marginTop: 12,
  },

  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  status: {
    color: "#ff4d6d",
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
    backgroundColor: "#E26B91",
  },

  offerCard: {
    backgroundColor: "#D94A70",
    borderRadius: 14,
    padding: 18,
    marginTop: 15,
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
    color: "#ff4d6d",
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
  },

  navItem: {
    alignItems: "center",
  },

  activeTab: {
    color: "#ff4d6d",
    fontWeight: "bold",
    fontSize: 14,
  },

  tab: {
    color: "#777",
    fontSize: 14,
  },
});