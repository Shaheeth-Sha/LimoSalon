import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../../config/api";

const DASHBOARD_API = `${BASE_URL}/api/loyalty/dashboard`;
const PROFILE_API = `${BASE_URL}/api/customers/profile`;

export default function MembershipCard() {
  const router = useRouter();

  const [customerName, setCustomerName] = useState("");
  const [tier, setTier] = useState("Bronze");
  const [memberSince, setMemberSince] = useState("");
  const [loading, setLoading] = useState(true);

  const [alert, setAlert] = useState({ visible: false, title: "", message: "" });
  const showAlert = (title: string, message: string) =>
    setAlert({ visible: true, title, message });
  const closeAlert = () => setAlert((prev) => ({ ...prev, visible: false }));

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem("customerToken");

        if (!token) {
          showAlert("Login Required", "Please log in again.");
          return;
        }

        const [dashboardRes, profileRes] = await Promise.all([
          fetch(DASHBOARD_API, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(PROFILE_API, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        const dashboardData = await dashboardRes.json();
        const profileData = await profileRes.json();

        if (dashboardRes.ok) {
          setTier(dashboardData.loyalty?.tier || "Bronze");
          setMemberSince(dashboardData.loyalty?.memberSince || "");
        }

        if (profileRes.ok) {
          setCustomerName(profileData.customer?.name || "Member");
        }
      } catch (error) {
        console.log("Membership card load error:", error);
        showAlert("Error", "Unable to load your membership card.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // Member ID derived from the account creation date + tier initial,
  // just for display — not stored anywhere separately since it isn't
  // used for anything functional (no barcode scanner integration).
  const memberId = memberSince
    ? `GM${new Date(memberSince).getFullYear()}${tier.charAt(0)}`
    : "GM----";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Membership Card</Text>
      </View>

      {loading ? (
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color="#FF2D75" />
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <View style={styles.cardTopRow}>
              <Text style={styles.tierLabel}>{tier.toUpperCase()} MEMBER</Text>
              <MaterialCommunityIcons name="crown" size={28} color="#FFD166" />
            </View>

            <Text style={styles.name}>{customerName}</Text>
            <Text style={styles.memberId}>Member ID: {memberId}</Text>
            <Text style={styles.since}>
              Since{" "}
              {memberSince
                ? new Date(memberSince).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })
                : "-"}
            </Text>

            <View style={styles.barcodeBox}>
              {Array.from({ length: 28 }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.barcodeLine,
                    { width: i % 3 === 0 ? 3 : 1.5 },
                  ]}
                />
              ))}
            </View>
          </View>

          <Text style={styles.sectionTitle}>Membership Benefits</Text>

          <View style={styles.benefitsBox}>
            {[
              "Earn points on every visit",
              "Exclusive member offers",
              "Priority bookings",
              "Special birthday treats",
            ].map((benefit, index) => (
              <View key={index} style={styles.benefitRow}>
                <Ionicons name="sparkles" size={14} color="#FF2D75" />
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))}
          </View>

          <View style={styles.thankYouBox}>
            <Text style={styles.thankYouText}>
              Thank you for being a valued member! ♥
            </Text>
          </View>
        </>
      )}

      <Modal visible={alert.visible} transparent animationType="fade" onRequestClose={closeAlert}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <Feather name="alert-circle" size={28} color="#FF2D75" />
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
  container: { flex: 1, backgroundColor: "#F5F5F7", paddingTop: 50, paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  headerText: { fontSize: 18, fontWeight: "700", marginLeft: 10 },
  loaderBox: { flex: 1, justifyContent: "center", alignItems: "center" },

  card: {
    backgroundColor: "#B8860B", borderRadius: 18, padding: 22, marginBottom: 24,
  },
  cardTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  tierLabel: { color: "#fff", fontWeight: "800", fontSize: 13, letterSpacing: 1 },
  name: { color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 14 },
  memberId: { color: "#fff", fontSize: 13, opacity: 0.9, marginTop: 6 },
  since: { color: "#fff", fontSize: 12, opacity: 0.8, marginTop: 2 },

  barcodeBox: { flexDirection: "row", alignItems: "center", marginTop: 22, gap: 2 },
  barcodeLine: { height: 34, backgroundColor: "#111" },

  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },

  benefitsBox: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 20 },
  benefitRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6, gap: 10 },
  benefitText: { fontSize: 14, color: "#333" },

  thankYouBox: {
    backgroundColor: "#FFF1F6", borderRadius: 12, padding: 18, alignItems: "center",
  },
  thankYouText: { fontSize: 14, fontWeight: "700", color: "#8A1230" },

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