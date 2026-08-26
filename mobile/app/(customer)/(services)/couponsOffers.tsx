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
import { useRouter } from "expo-router";
import { BASE_URL } from "../../../config/api";

const COUPONS_API = `${BASE_URL}/api/coupons`;

type Coupon = {
  _id: string;
  title: string;
  description: string;
  discountType: string;
  discountValue: number;
  validUntil: string;
  categories: string[];
};

type FilterTab = "All" | "New" | "Expiring Soon";

const CARD_COLORS = ["#FDECC8", "#D6E8F5", "#DDF3DD", "#F5DDEE"];

const formatDiscount = (coupon: Coupon) =>
  coupon.discountType === "percentage"
    ? `${coupon.discountValue}% OFF`
    : `LKR ${coupon.discountValue} OFF`;

export default function CouponsOffers() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<FilterTab>("All");
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  const [alert, setAlert] = useState({ visible: false, title: "", message: "" });
  const showAlert = (title: string, message: string) =>
    setAlert({ visible: true, title, message });
  const closeAlert = () => setAlert((prev) => ({ ...prev, visible: false }));

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const res = await fetch(COUPONS_API);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to load coupons");
      }

      setCoupons(data.coupons || []);
    } catch (error) {
      console.log("Coupons load error:", error);
      showAlert("Error", "Unable to load current offers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const visibleCoupons =
    activeTab === "All"
      ? coupons
      : coupons.filter((coupon) => coupon.categories.includes(activeTab));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Coupons & Offers</Text>
      </View>

      <View style={styles.tabRow}>
        {(["All", "New", "Expiring Soon"] as FilterTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color="#FF2D75" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {visibleCoupons.length === 0 ? (
            <Text style={styles.emptyText}>No offers in this category right now.</Text>
          ) : (
            visibleCoupons.map((coupon, index) => (
              <View
                key={coupon._id}
                style={[
                  styles.couponCard,
                  { backgroundColor: CARD_COLORS[index % CARD_COLORS.length] },
                ]}
              >
                <View style={styles.couponTextBox}>
                  <Text style={styles.discountText}>{formatDiscount(coupon)}</Text>
                  <Text style={styles.titleText}>{coupon.title}</Text>
                  <Text style={styles.validText}>
                    Valid till{" "}
                    {new Date(coupon.validUntil).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.viewBtn}
                  onPress={() =>
                    showAlert(
                      coupon.title,
                      coupon.description ||
                        "Mention this offer to your stylist at your next visit, or apply it at checkout."
                    )
                  }
                >
                  <Text style={styles.viewBtnText}>View</Text>
                </TouchableOpacity>
              </View>
            ))
          )}

          <View style={{ height: 30 }} />
        </ScrollView>
      )}

      <Modal visible={alert.visible} transparent animationType="fade" onRequestClose={closeAlert}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <Feather name="tag" size={28} color="#FF2D75" />
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
  header: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  headerText: { fontSize: 18, fontWeight: "700", marginLeft: 10 },
  loaderBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { textAlign: "center", color: "#777", marginTop: 40 },

  tabRow: { flexDirection: "row", marginBottom: 18, gap: 8 },
  tabBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "#fff",
  },
  tabBtnActive: { backgroundColor: "#FF2D75" },
  tabText: { fontSize: 13, color: "#555", fontWeight: "600" },
  tabTextActive: { color: "#fff" },

  couponCard: { borderRadius: 16, padding: 18, marginBottom: 14, flexDirection: "row", alignItems: "center" },
  couponTextBox: { flex: 1 },
  discountText: { fontSize: 18, fontWeight: "900", color: "#111" },
  titleText: { fontSize: 14, fontWeight: "700", color: "#111", marginTop: 2 },
  validText: { fontSize: 12, color: "#555", marginTop: 6 },

  viewBtn: { backgroundColor: "#FF2D75", paddingHorizontal: 18, paddingVertical: 9, borderRadius: 25 },
  viewBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },

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