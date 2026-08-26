import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../config/api';
import { useStaffUnreadCount } from '../../hooks/useStaffUnreadCount';
import { groupNotificationsByDate } from '../../utils/groupNotificationsByDate';

const NOTIFICATIONS_API = `${BASE_URL}/api/staff/notifications`;
const MARK_ALL_READ_API = `${BASE_URL}/api/staff/notifications/read-all`;

type NotificationItem = {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

const ICON_BY_TYPE: Record<string, keyof typeof Ionicons.glyphMap> = {
  new_booking: 'calendar',
  booking_cancelled_by_customer: 'close-circle',
  booking_rescheduled_by_customer: 'swap-horizontal',
  new_review: 'star',
};

const formatRelativeTime = (dateStr: string): string => {
  const then = new Date(dateStr).getTime();
  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export default function Notifications() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { unreadCount, refresh: refreshBadge } = useStaffUnreadCount();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('staffToken');
      if (!token) {
        router.replace('/');
        return;
      }

      const res = await fetch(NOTIFICATIONS_API, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (res.ok) {
        setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
      }
    } catch (error) {
      console.error('Load staff notifications failed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    if (isFocused) {
      load();
    }
  }, [isFocused, load]);

  // Matches the customer app's notifications screen: the badge clears
  // the moment you open the list, not only once you tap each item —
  // that's what "seeing" a notification tray means in most real
  // apps (Instagram, Twitter/X, Gmail). Runs once right after the
  // list loads, only if there's actually something unread to clear.
  useEffect(() => {
    if (!loading && notifications.some((n) => !n.isRead)) {
      markAllRead();
    }
  }, [loading]);

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

    try {
      const token = await AsyncStorage.getItem('staffToken');
      await fetch(MARK_ALL_READ_API, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      refreshBadge();
    } catch (error) {
      console.error('Mark all staff notifications read failed:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const groups = groupNotificationsByDate(notifications);

  return (
    <View style={styles.mainContainer}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {loading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color="#FF1462" />
          </View>
        ) : (
          <ScrollView
            style={styles.content}
            contentContainerStyle={{ paddingBottom: 20 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF1462" />}
          >
            <Text style={styles.title}>Notifications</Text>

            {notifications.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="notifications-outline" size={40} color="#D0D0D0" />
                <Text style={styles.emptyText}>
                  Nothing here yet — new bookings, cancellations, reschedules, and reviews will show up as they happen.
                </Text>
              </View>
            ) : (
              groups.map((group) => (
                <View key={group.label}>
                  <Text style={styles.groupLabel}>{group.label}</Text>
                  {group.items.map((item) => (
                    <View key={item._id} style={styles.card}>
                      <View style={styles.iconBox}>
                        <Ionicons name={ICON_BY_TYPE[item.type] || 'notifications'} size={24} color="#FF1462" />
                      </View>
                      <View style={styles.textContainer}>
                        <Text style={styles.cardTitle}>{item.title}</Text>
                        <Text style={styles.cardDesc}>{item.message}</Text>
                        <Text style={styles.time}>{formatRelativeTime(item.createdAt)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ))
            )}
          </ScrollView>
        )}
      </SafeAreaView>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/home')}>
          <Ionicons name="home-outline" size={22} color="#FFFFFF" />
          <Text style={styles.tabText}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/my-schedule')}>
          <Ionicons name="calendar-outline" size={22} color="#FFFFFF" />
          <Text style={styles.tabText}>Schedule</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/Notifications')}>
          <View style={styles.activeIconBg}>
            <Ionicons name="chatbubble-ellipses" size={22} color="#FF1462" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </View>
          <Text style={styles.activeTabText}>Notification</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/Profile Page')}>
          <Ionicons name="person-outline" size={22} color="#FFFFFF" />
          <Text style={styles.tabText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#FFF' },
  container: { flex: 1 },
  content: { padding: 25 },
  loaderBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: '#8E8E93', fontSize: 14, marginTop: 12, textAlign: 'center', lineHeight: 19 },
  groupLabel: { fontSize: 13, fontWeight: '700', color: '#8E8E93', marginBottom: 10, marginTop: 6, textTransform: 'uppercase' },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FBE4ED',
    padding: 15,
    borderRadius: 20,
    marginBottom: 15,
    alignItems: 'center',
  },
  iconBox: { backgroundColor: '#FFF', padding: 10, borderRadius: 10, marginRight: 15 },
  textContainer: { flex: 1 },
  cardTitle: { fontWeight: 'bold', fontSize: 16 },
  cardDesc: { fontSize: 13, color: '#555', marginTop: 2 },
  time: { fontSize: 11, color: '#888', marginTop: 6 },

  // Tab Bar Styles
  bottomTabBar: { flexDirection: 'row', backgroundColor: '#FF1462', height: 85, borderTopLeftRadius: 30, borderTopRightRadius: 30, justifyContent: 'space-around', alignItems: 'center', paddingBottom: 5 },
  tabItem: { alignItems: 'center', flex: 1 },
  activeIconBg: { backgroundColor: '#FFFFFF', width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  tabText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  activeTabText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF1462',
    borderWidth: 1.5,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
