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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../../config/api";

const DASHBOARD_API = `${BASE_URL}/api/loyalty/dashboard`;
const REWARDS_API = `${BASE_URL}/api/loyalty/rewards`;
const MY_REWARDS_API = `${BASE_URL}/api/loyalty/my-rewards`;
const CLAIM_API = (rewardId: string) =>
  `${BASE_URL}/api/loyalty/rewards/${rewardId}/claim`;

type Reward = {
  _id: string;
  title: string;
  pointsCost: number;
  discountType: string;
  discountValue: number;
  freeServiceName?: string;
};

type ClaimedReward = {
  _id: string;
  title: string;
  code: string;
  pointsSpent: number;
  redeemedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

const formatDiscount = (reward: Reward) => {
  if (reward.discountType === "percentage") return `${reward.discountValue}% OFF`;
  if (reward.discountType === "fixed") return `LKR ${reward.discountValue} OFF`;
  return reward.freeServiceName || "Free Service";
};

export default function MyRewards() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"available" | "claimed">("available");

  const [myPoints, setMyPoints] = useState(0);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [claimedRewards, setClaimedRewards] = useState<ClaimedReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const [alert, setAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
    isSuccess?: boolean;
  }>({ visible: false, title: "", message: "" });

  const showAlert = (title: string, message: string, isSuccess?: boolean) =>
    setAlert({ visible: true, title, message, isSuccess });
  const closeAlert = () => setAlert((prev) => ({ ...prev, visible: false }));

  const [confirmClaim, setConfirmClaim] = useState<Reward | null>(null);

  const loadAll = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("customerToken");

      if (!token) {
        showAlert("Login Required", "Please log in again.");
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      const [dashboardRes, rewardsRes, myRewardsRes] = await Promise.all([
        fetch(DASHBOARD_API, { headers }),
        fetch(REWARDS_API, { headers }),
        fetch(MY_REWARDS_API, { headers }),
      ]);

      const dashboardData = await dashboardRes.json();
      const rewardsData = await rewardsRes.json();
      const myRewardsData = await myRewardsRes.json();

      if (dashboardRes.ok) setMyPoints(dashboardData.loyalty?.points || 0);
      if (rewardsRes.ok) setRewards(rewardsData.rewards || []);
      if (myRewardsRes.ok) setClaimedRewards(myRewardsData.claimedRewards || []);
    } catch (error) {
      console.log("My Rewards load error:", error);
      showAlert("Error", "Unable to load rewards.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const runClaim = async () => {
    if (!confirmClaim) return;

    try {
      setClaimingId(confirmClaim._id);
      const token = await AsyncStorage.getItem("customerToken");

      const res = await fetch(CLAIM_API(confirmClaim._id), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Unable to claim this reward");
      }

      setConfirmClaim(null);
      await loadAll();
      showAlert(
        "Reward Claimed!",
        `Your coupon code is ${data.claimedReward.code}. You can view it anytime under the Claimed tab.`,
        true
      );
    } catch (error: any) {
      setConfirmClaim(null);
      showAlert("Unable to Claim", error?.message || "Something went wrong.");
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerText}>My Rewards</Text>
      </View>

      <Text style={styles.pointsBadge}>{myPoints} points available</Text>

      <View style={styles.toggleWrapper}>
        <TouchableOpacity
          style={[styles.toggleBtn, activeTab === "available" && styles.activeBtn]}
          onPress={() => setActiveTab("available")}
        >
          <Text style={[styles.toggleText, activeTab === "available" && styles.activeText]}>
            Available ({rewards.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleBtn, activeTab === "claimed" && styles.activeBtn]}
          onPress={() => setActiveTab("claimed")}
        >
          <Text style={[styles.toggleText, activeTab === "claimed" && styles.activeText]}>
            Claimed ({claimedRewards.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color="#FF2D75" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {activeTab === "available" ? (
            rewards.length === 0 ? (
              <Text style={styles.emptyText}>No rewards available right now.</Text>
            ) : (
              rewards.map((reward) => {
                const canAfford = myPoints >= reward.pointsCost;

                return (
                  <View key={reward._id} style={styles.rewardCard}>
                    <View style={styles.iconCircle}>
                      <Ionicons name="gift-outline" size={20} color="#FF2D75" />
                    </View>

                    <View style={styles.rewardTextBox}>
                      <Text style={styles.rewardTitle}>{formatDiscount(reward)}</Text>
                      <Text style={styles.rewardSub}>{reward.title}</Text>
                      <Text style={styles.rewardPoints}>{reward.pointsCost} pts</Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.claimBtn, !canAfford && styles.claimBtnDisabled]}
                      disabled={!canAfford || claimingId === reward._id}
                      onPress={() => setConfirmClaim(reward)}
                    >
                      <Text style={styles.claimBtnText}>
                        {canAfford ? "Claim" : "Locked"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )
          ) : claimedRewards.length === 0 ? (
            <Text style={styles.emptyText}>You haven't claimed any rewards yet.</Text>
          ) : (
            claimedRewards.map((claimed) => (
              <View key={claimed._id} style={styles.claimedCard}>
                <Text style={styles.rewardTitle}>{claimed.title}</Text>
                <Text style={styles.codeText}>Code: {claimed.code}</Text>
                <Text style={styles.rewardSub}>
                  {claimed.redeemedAt ? "Used" : "Not yet used"}
                  {claimed.expiresAt
                    ? ` · Expires ${new Date(claimed.expiresAt).toLocaleDateString()}`
                    : ""}
                </Text>
              </View>
            ))
          )}

          <View style={{ height: 30 }} />
        </ScrollView>
      )}

      {/* Claim confirmation */}
      <Modal visible={!!confirmClaim} transparent animationType="fade" onRequestClose={() => setConfirmClaim(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <Feather name="gift" size={28} color="#FF2D75" />
            </View>
            <Text style={styles.modalTitle}>Claim this reward?</Text>
            <Text style={styles.modalMessage}>
              {confirmClaim?.pointsCost} points will be deducted from your balance.
              This can't be undone.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              activeOpacity={0.8}
              disabled={!!claimingId}
              onPress={runClaim}
            >
              <Text style={styles.modalButtonText}>
                {claimingId ? "Claiming..." : "Yes, Claim Reward"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalButtonSecondary}
              onPress={() => setConfirmClaim(null)}
            >
              <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Generic alert */}
      <Modal visible={alert.visible} transparent animationType="fade" onRequestClose={closeAlert}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIconCircle, alert.isSuccess && styles.modalIconCircleSuccess]}>
              <Feather
                name={alert.isSuccess ? "check" : "alert-circle"}
                size={28}
                color={alert.isSuccess ? "#2ECC71" : "#FF2D75"}
              />
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
  header: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  headerText: { fontSize: 18, fontWeight: "700", marginLeft: 10 },
  pointsBadge: { fontSize: 13, fontWeight: "700", color: "#FF2D75", marginBottom: 14 },
  loaderBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { textAlign: "center", color: "#777", marginTop: 40 },

  toggleWrapper: {
    flexDirection: "row", backgroundColor: "#fff", borderRadius: 12, padding: 4, marginBottom: 18,
  },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 10 },
  activeBtn: { backgroundColor: "#FF2D75" },
  toggleText: { fontSize: 13, color: "#777" },
  activeText: { color: "#fff", fontWeight: "600" },

  rewardCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 12,
    flexDirection: "row", alignItems: "center",
  },
  iconCircle: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFE1EC",
    alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  rewardTextBox: { flex: 1 },
  rewardTitle: { fontWeight: "800", fontSize: 15, color: "#111" },
  rewardSub: { fontSize: 12, color: "#777", marginTop: 2 },
  rewardPoints: { fontSize: 12, fontWeight: "700", color: "#FF2D75", marginTop: 4 },

  claimBtn: { backgroundColor: "#FF2D75", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 25 },
  claimBtnDisabled: { backgroundColor: "#ccc" },
  claimBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },

  claimedCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 12 },
  codeText: { fontSize: 14, fontWeight: "700", color: "#8A1230", marginTop: 4, letterSpacing: 1 },

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
  modalIconCircleSuccess: { backgroundColor: "#E8F8EF" },
  modalTitle: { fontSize: 17, fontWeight: "bold", color: "#111", marginBottom: 6, textAlign: "center" },
  modalMessage: { fontSize: 14, color: "#555", textAlign: "center", marginBottom: 22, lineHeight: 20 },
  modalButton: { width: "100%", backgroundColor: "#FF2D75", paddingVertical: 13, borderRadius: 25, alignItems: "center" },
  modalButtonText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  modalButtonSecondary: { width: "100%", paddingVertical: 13, alignItems: "center", marginTop: 4 },
  modalButtonSecondaryText: { color: "#777", fontWeight: "600", fontSize: 14 },
});