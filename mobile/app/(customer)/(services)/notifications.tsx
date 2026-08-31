import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../../config/api";
import { groupNotificationsByDate } from "../../../utils/groupNotificationsByDate";

const NOTIFICATIONS_API = `${BASE_URL}/api/notifications`;
const MARK_READ_API = (id: string) => `${BASE_URL}/api/notifications/${id}/read`;
const MARK_ALL_READ_API = `${BASE_URL}/api/notifications/read-all`;

type Notification = {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  booking_pending: "hourglass-outline",
  booking_confirmed: "checkmark-circle-outline",
  booking_rescheduled: "time-outline",
  booking_cancelled: "close-circle-outline",
  booking_no_show: "alert-circle-outline",
  points_earned: "sparkles-outline",
  reward_claimed: "gift-outline",
  tier_upgraded: "trophy-outline",
};

const formatTimeAgo = (dateStr: string) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
};

export default function Notifications() {
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("customerToken");
      if (!token) return;

      const res = await fetch(NOTIFICATIONS_API, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (res.ok) {
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.log("Notifications load error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  // Fixed: previously the badge only cleared if you tapped each
  // notification individually — most real apps (Instagram, Twitter/X,
  // etc.) clear the badge the moment you open the notification tray
  // itself, which is what a user actually expects "seeing" the list
  // to do. This runs once, right after the list loads, and marks
  // everything read in one call rather than requiring per-item taps.
  useEffect(() => {
    if (!loading && notifications.some((n) => !n.isRead)) {
      markAllRead();
    }
  }, [loading]);

  const handlePress = async (notification: Notification) => {
    if (notification.isRead) return;

    // Optimistic update — flip it locally right away, don't wait on
    // the network round trip for the UI to feel responsive.
    setNotifications((prev) =>
      prev.map((n) => (n._id === notification._id ? { ...n, isRead: true } : n))
    );

    try {
      const token = await AsyncStorage.getItem("customerToken");
      await fetch(MARK_READ_API(notification._id), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.log("Mark as read failed:", error);
    }
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

    try {
      const token = await AsyncStorage.getItem("customerToken");
      await fetch(MARK_ALL_READ_API, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.log("Mark all as read failed:", error);
    }
  };

  const hasUnread = notifications.some((n) => !n.isRead);
  const groups = groupNotificationsByDate(notifications);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Notifications</Text>

        {hasUnread ? (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      {loading ? (
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color="#FF2D75" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.loaderBox}>
          <Ionicons name="notifications-off-outline" size={40} color="#ccc" />
          <Text style={styles.emptyText}>No notifications yet.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {groups.map((group) => (
            <View key={group.label}>
              <Text style={styles.groupLabel}>{group.label}</Text>
              {group.items.map((notification) => (
                <TouchableOpacity
                  key={notification._id}
                  style={[styles.card, !notification.isRead && styles.cardUnread]}
                  activeOpacity={0.8}
                  onPress={() => handlePress(notification)}
                >
                  <View style={styles.iconCircle}>
                    <Ionicons
                      name={ICONS[notification.type] || "notifications-outline"}
                      size={20}
                      color="#FF2D75"
                    />
                  </View>

                  <View style={styles.textBox}>
                    <Text style={styles.title}>{notification.title}</Text>
                    <Text style={styles.message}>{notification.message}</Text>
                    <Text style={styles.timeAgo}>{formatTimeAgo(notification.createdAt)}</Text>
                  </View>

                  {!notification.isRead && <View style={styles.unreadDot} />}
                </TouchableOpacity>
              ))}
            </View>
          ))}

          <View style={{ height: 30 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F7", paddingTop: 50, paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  headerText: { fontSize: 18, fontWeight: "700" },
  markAllText: { fontSize: 12, fontWeight: "700", color: "#FF2D75" },
  loaderBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#777", marginTop: 10 },
  groupLabel: { fontSize: 12, fontWeight: "700", color: "#999", marginBottom: 8, marginTop: 4, textTransform: "uppercase" },

  card: {
    backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10,
    flexDirection: "row", alignItems: "flex-start",
  },
  cardUnread: { backgroundColor: "#FFF5F8" },

  iconCircle: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: "#FFE1EC",
    alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  textBox: { flex: 1 },
  title: { fontWeight: "700", fontSize: 14, color: "#111" },
  message: { fontSize: 13, color: "#555", marginTop: 2, lineHeight: 18 },
  timeAgo: { fontSize: 11, color: "#999", marginTop: 6 },

  unreadDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: "#FF2D75", marginTop: 4, marginLeft: 8,
  },
});