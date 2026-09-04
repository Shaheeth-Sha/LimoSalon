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
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../../config/api";
import { getTierGradient, getTierAccent, getTierBorder } from "../../../utils/tierTheme";

const DASHBOARD_API = `${BASE_URL}/api/loyalty/dashboard`;

type LoyaltyData = {
  tier: string;
  points: number;
  lifetimePoints: number;
  completedAppointments: number;
  memberSince: string;
  nextTier: string | null;
  visitsToNextTier: number;
  nextTierThreshold: number | null;
  nextReward: {
    title: string;
    pointsCost: number;
    pointsNeeded: number;
    appointmentsAway: number | null;
  } | null;
};

export default function LoyaltyDashboard() {
  const router = useRouter();

  const [loyalty, setLoyalty] = useState<LoyaltyData | null>(null);
  const [loading, setLoading] = useState(true);

  const [alert, setAlert] = useState({ visible: false, title: "", message: "" });
  const showAlert = (title: string, message: string) =>
    setAlert({ visible: true, title, message });
  const closeAlert = () => setAlert((prev) => ({ ...prev, visible: false }));

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("customerToken");

      if (!token) {
        showAlert("Login Required", "Please log in again.");
        return;
      }

      const res = await fetch(DASHBOARD_API, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to load loyalty dashboard");
      }

      setLoyalty(data.loyalty);
    } catch (error) {
      console.log("Loyalty dashboard error:", error);
      showAlert("Error", "Unable to load your loyalty dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  // Same premium-card gradient theme used on Home and the physical
  // Membership Card, kept consistent across all three so a customer's
  // tier always looks the same everywhere it's shown.
  const tierGradient = getTierGradient(loyalty?.tier);
  const tierAccent = getTierAccent(loyalty?.tier);
  const tierBorder = getTierBorder(loyalty?.tier);

  // Same derivation as membershipCard.tsx, kept consistent across
  // both screens rather than duplicating slightly different logic.
  const memberId = loyalty?.memberSince
    ? `GM${new Date(loyalty.memberSince).getFullYear()}${loyalty.tier.charAt(0)}`
    : "GM----";

  const progressPercent =
    loyalty && loyalty.nextTierThreshold
      ? Math.min(
          (loyalty.completedAppointments / loyalty.nextTierThreshold) * 100,
          100
        )
      : 100;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Loyalty Dashboard</Text>
      </View>

      {loading ? (
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color="#FF2D75" />
        </View>
      ) : loyalty ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={tierGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.tierCard, { borderColor: tierBorder }]}
          >
            <View style={styles.tierTopRow}>
              <View>
                <Text style={styles.tierLabel}>{loyalty.tier} Member</Text>
                <Text style={styles.memberIdText}>Member ID: {memberId}</Text>
                <Text style={styles.memberSince}>
                  Since{" "}
                  {new Date(loyalty.memberSince).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
              </View>

              <View style={styles.crownCircle}>
                <MaterialCommunityIcons name="crown" size={32} color={tierAccent} />
              </View>
            </View>

            <Text style={[styles.pointsValue, { color: tierAccent }]}>
              {loyalty.points} Points
            </Text>

            <Text style={styles.visitsLabel}>
              {loyalty.nextTierThreshold
                ? `${loyalty.completedAppointments}/${loyalty.nextTierThreshold} Visits`
                : `${loyalty.completedAppointments} Visits`}
            </Text>

            {loyalty.nextTier ? (
              <>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${progressPercent}%`, backgroundColor: tierAccent },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {loyalty.visitsToNextTier} visit
                  {loyalty.visitsToNextTier === 1 ? "" : "s"} to reach {loyalty.nextTier}
                </Text>
              </>
            ) : (
              <Text style={styles.progressText}>
                You've reached the highest tier!
              </Text>
            )}
          </LinearGradient>

          <Text style={styles.sectionTitle}>My Overview</Text>

          <View style={styles.overviewBox}>
            <View style={styles.overviewRow}>
              <Ionicons name="sparkles-outline" size={18} color="#FF2D75" />
              <Text style={styles.overviewLabel}>Total Points</Text>
              <Text style={styles.overviewValue}>{loyalty.points}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.overviewRow}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#FF2D75" />
              <Text style={styles.overviewLabel}>Completed Appointments</Text>
              <Text style={styles.overviewValue}>
                {loyalty.completedAppointments}
              </Text>
            </View>

            {loyalty.nextReward && (
              <>
                <View style={styles.divider} />

                <View style={styles.overviewRow}>
                  <Ionicons name="gift-outline" size={18} color="#FF2D75" />
                  <Text style={styles.overviewLabel}>Next Reward</Text>
                  <Text style={styles.overviewValue}>
                    {loyalty.nextReward.appointmentsAway !== null
                      ? `${loyalty.nextReward.appointmentsAway} Appointments Away`
                      : `${loyalty.nextReward.pointsNeeded} pts to go`}
                  </Text>
                </View>
              </>
            )}
          </View>

          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => router.push("/(customer)/(services)/membershipCard")}
          >
            <Text style={styles.actionText}>View Membership Card</Text>
            <Ionicons name="chevron-forward" size={18} color="#111" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => router.push("/(customer)/(services)/myRewards")}
          >
            <Text style={styles.actionText}>My Rewards</Text>
            <Ionicons name="chevron-forward" size={18} color="#111" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => router.push("/(customer)/(services)/couponsOffers")}
          >
            <Text style={styles.actionText}>Available Coupons</Text>
            <Ionicons name="chevron-forward" size={18} color="#111" />
          </TouchableOpacity>

          <View style={{ height: 30 }} />
        </ScrollView>
      ) : (
        <View style={styles.loaderBox}>
          <Text style={{ color: "#777" }}>Unable to load loyalty data.</Text>
        </View>
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

  tierCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },
  tierTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  tierLabel: { fontSize: 20, fontWeight: "800", color: "#fff" },
  memberIdText: { fontSize: 12, color: "#fff", opacity: 0.9, marginTop: 6 },
  memberSince: { fontSize: 12, color: "#fff", opacity: 0.85, marginTop: 4 },
  crownCircle: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  pointsValue: { fontSize: 26, fontWeight: "900", color: "#FFD166", marginTop: 18 },
  visitsLabel: { fontSize: 13, color: "#fff", opacity: 0.9, marginTop: 4 },

  progressTrack: { height: 8, backgroundColor: "rgba(255,255,255,0.3)", borderRadius: 4, marginTop: 14 },
  progressFill: { height: 8, backgroundColor: "#fff", borderRadius: 4 },
  progressText: { color: "#fff", fontSize: 12, marginTop: 8, opacity: 0.9 },

  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10, marginTop: 4 },

  overviewBox: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 20 },
  overviewRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  overviewLabel: { flex: 1, marginLeft: 10, fontSize: 14, color: "#333" },
  overviewValue: { fontSize: 14, fontWeight: "700", color: "#111" },
  divider: { height: 1, backgroundColor: "#EEE" },

  actionRow: {
    backgroundColor: "#FFF1F6", borderRadius: 12, paddingVertical: 16, paddingHorizontal: 16,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12,
  },
  actionText: { fontSize: 14, fontWeight: "700", color: "#111" },

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