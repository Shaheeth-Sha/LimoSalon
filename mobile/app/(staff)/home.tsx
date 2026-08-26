import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../config/api';
import { useStaffUnreadCount } from '../../hooks/useStaffUnreadCount';

const MY_BOOKINGS_API = `${BASE_URL}/api/staff/my-bookings`;
const HOME_STATS_API = `${BASE_URL}/api/staff/stats/home`;

type Booking = {
  _id: string;
  customer?: { name?: string };
  services: { name: string }[];
  selectedDate: string;
  selectedTime: string;
  status: string;
  effectiveStatus: string;
  isPast: boolean;
};

type HomeStats = {
  todaysJobs: number;
  weekJobs: number;
  weekRevenue: number;
  rating: number;
  reviewCount: number;
};

const formatLocalDate = (date: Date): string => {
  return (
    `${date.getFullYear()}-` +
    `${String(date.getMonth() + 1).padStart(2, '0')}-` +
    `${String(date.getDate()).padStart(2, '0')}`
  );
};

// "10.00 am" (how the booking flow stores it) -> "10.00 A.M" for the
// staff-side card style already designed here.
const formatDisplayTime = (time: string): string =>
  time ? time.replace(/am$/i, 'A.M').replace(/pm$/i, 'P.M') : '';

export default function Home() {
  const [search, setSearch] = useState('');
  const [staffName, setStaffName] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<HomeStats | null>(null);
  const router = useRouter();
  const isFocused = useIsFocused();
  const { unreadCount } = useStaffUnreadCount();

  const loadStats = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('staffToken');
      if (!token) return;

      const res = await fetch(HOME_STATS_API, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (res.ok && data.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      // Non-critical — the stat tiles just stay blank/zero if this fails,
      // the rest of the home screen still works.
      console.error('Load staff home stats failed:', error);
    }
  }, []);

  const loadBookings = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('staffToken');

      if (!token) {
        router.replace('/');
        return;
      }

      const res = await fetch(MY_BOOKINGS_API, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        // An expired/invalid token is the only realistic failure here
        // (this endpoint has no other user-facing error case) — send
        // them back to log in again rather than showing a dead screen.
        await AsyncStorage.multiRemove(['staffToken', 'staffData']);
        router.replace('/');
        return;
      }

      setBookings(Array.isArray(data.bookings) ? data.bookings : []);
    } catch (error) {
      console.error('Load staff bookings failed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('staffData');
        if (stored) {
          const staff = JSON.parse(stored);
          setStaffName(staff?.name || '');
        }
      } catch {
        // Non-critical — greeting just falls back to no name.
      }
    })();
  }, []);

  // Refetches every time this screen regains focus (e.g. coming back
  // from marking a booking complete on another screen), not just on
  // first mount.
  useEffect(() => {
    if (isFocused) {
      loadBookings();
      loadStats();
    }
  }, [isFocused, loadBookings, loadStats]);

  const onRefresh = () => {
    setRefreshing(true);
    loadBookings();
    loadStats();
  };

  const todayStr = formatLocalDate(new Date());

  const activeBookings = bookings.filter(
    (b) => b.status !== 'Cancelled' && b.status !== 'Completed'
  );

  const searchText = search.trim().toLowerCase();

  const matchesSearch = (b: Booking) => {
    if (!searchText) return true;
    const name = b.customer?.name?.toLowerCase() || '';
    const services = (b.services || []).map((s) => s.name).join(', ').toLowerCase();
    return name.includes(searchText) || services.includes(searchText);
  };

  const toCardItem = (b: Booking) => ({
    id: b._id,
    name: b.customer?.name || 'Customer',
    service: (b.services || []).map((s) => s.name).join(', ') || 'Service',
    time: formatDisplayTime(b.selectedTime),
    rawTime: b.selectedTime,
    date: b.selectedDate,
    status: b.effectiveStatus || b.status,
    rawStatus: b.status,
  });

  const todaysAppointments = activeBookings
    .filter((b) => b.selectedDate === todayStr && matchesSearch(b))
    .map(toCardItem);

  const upcomingAppointments = activeBookings
    .filter((b) => b.selectedDate > todayStr && matchesSearch(b))
    .map(toCardItem);

  return (
    <View style={styles.mainContainer}>
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF1462" />}
      >

        {}
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.greetingText}>Good Morning,</Text>
          <Text style={styles.userNameText}>{staffName || 'Welcome back'}</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchWrapper}>
          <Ionicons name="search-outline" size={22} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Appointments"
            placeholderTextColor="#A0A4A8"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Stat Tiles — Home's entry point into the dashboard flow
            (Today's Jobs / Average Rating / Recent Reviews / Weekly
            Summary / Top Customer / Appointment History). */}
        <Text style={styles.sectionTitle}>Your Stats</Text>
        <View style={styles.statsGrid}>
          <TouchableOpacity
            style={styles.statTile}
            activeOpacity={0.8}
            onPress={() => router.push('/today-jobs')}
          >
            <View style={styles.statIconBg}>
              <Ionicons name="briefcase-outline" size={20} color="#FF1462" />
            </View>
            <Text style={styles.statValue}>{stats ? stats.todaysJobs : '-'}</Text>
            <Text style={styles.statLabel}>Today's Jobs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statTile}
            activeOpacity={0.8}
            onPress={() => router.push('/weekly-summary')}
          >
            <View style={styles.statIconBg}>
              <Ionicons name="cash-outline" size={20} color="#FF1462" />
            </View>
            <Text style={styles.statValue}>
              {stats ? `LKR ${stats.weekRevenue.toLocaleString()}` : '-'}
            </Text>
            <Text style={styles.statLabel}>This Week</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statTile}
            activeOpacity={0.8}
            onPress={() => router.push('/average-rating')}
          >
            <View style={styles.statIconBg}>
              <Ionicons name="star" size={20} color="#FF1462" />
            </View>
            <Text style={styles.statValue}>{stats ? stats.rating.toFixed(1) : '-'}</Text>
            <Text style={styles.statLabel}>Average Rating</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statTile}
            activeOpacity={0.8}
            onPress={() => router.push('/recent-reviews')}
          >
            <View style={styles.statIconBg}>
              <Ionicons name="chatbubbles-outline" size={20} color="#FF1462" />
            </View>
            <Text style={styles.statValue}>{stats ? stats.reviewCount : '-'}</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statTile}
            activeOpacity={0.8}
            onPress={() => router.push('/top-customer')}
          >
            <View style={styles.statIconBg}>
              <Ionicons name="trophy-outline" size={20} color="#FF1462" />
            </View>
            <Text style={styles.statValue}>{'★'}</Text>
            <Text style={styles.statLabel}>Top Customer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statTile}
            activeOpacity={0.8}
            onPress={() => router.push('/appointment-history')}
          >
            <View style={styles.statIconBg}>
              <Ionicons name="time-outline" size={20} color="#FF1462" />
            </View>
            <Text style={styles.statValue}>{stats ? stats.weekJobs : '-'}</Text>
            <Text style={styles.statLabel}>History</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {loading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color="#FF1462" />
          </View>
        ) : (
          <>
            {}
            {/* Today's Appointment Section */}
            <Text style={styles.sectionTitle}>Today's Appointment</Text>
            {todaysAppointments.length === 0 ? (
              <Text style={styles.emptyText}>No appointments today.</Text>
            ) : (
              todaysAppointments.map((item) => (
                <View key={item.id} style={styles.appointmentCard}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarInitial}>{item.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.cardDetails}>
                    <View style={styles.rowLayout}>
                      <Text style={styles.clientName} numberOfLines={2}>{item.name}</Text>

                      <View style={styles.infoStack}>
                        <Text style={styles.serviceText} numberOfLines={1}>{item.service}</Text>
                        <Text style={styles.timeText}>{item.time}</Text>
                      </View>
                    </View>
                  </View>
                  {/* 💡 මෙතන soft pink status badge එක TouchableOpacity එකක් කරලා /schedule පේජ් එකට ලින්ක් කලා */}
                  <TouchableOpacity
                    style={styles.statusBadge}
                    activeOpacity={0.7}
                    onPress={() =>
                      router.push({
                        pathname: '/schedule',
                        params: {
                          bookingId: item.id,
                          customerName: item.name,
                          service: item.service,
                          date: item.date,
                          time: item.rawTime,
                          status: item.rawStatus,
                        },
                      })
                    }
                  >
                    <Text style={styles.statusText}>{item.status}</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}

            {/* Clean Divider Line */}
            <View style={styles.divider} />

            {}
            {/* Upcoming Appointments Section */}
            <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
            {upcomingAppointments.length === 0 ? (
              <Text style={styles.emptyText}>No upcoming appointments.</Text>
            ) : (
              upcomingAppointments.map((item) => (
                <View key={item.id} style={styles.appointmentCard}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarInitial}>{item.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.cardDetails}>
                    <View style={styles.rowLayout}>
                      <Text style={styles.clientName} numberOfLines={2}>{item.name}</Text>

                      <View style={styles.infoStack}>
                        <Text style={styles.serviceText} numberOfLines={1}>{item.service}</Text>
                        <Text style={styles.timeText}>{item.time}</Text>
                      </View>
                    </View>
                  </View>
                  {/* 💡 මෙතනත් soft pink status badge එක TouchableOpacity එකක් කරලා /schedule පේජ් එකට ලින්ක් කලා */}
                  <TouchableOpacity
                    style={styles.statusBadge}
                    activeOpacity={0.7}
                    onPress={() =>
                      router.push({
                        pathname: '/schedule',
                        params: {
                          bookingId: item.id,
                          customerName: item.name,
                          service: item.service,
                          date: item.date,
                          time: item.rawTime,
                          status: item.rawStatus,
                        },
                      })
                    }
                  >
                    <Text style={styles.statusText}>{item.status}</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </>
        )}

        {/* Extra bottom padding */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {}
      {/* Modern Bottom Navigation Bar */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity style={styles.tabItem}>
          <View style={styles.activeIconBg}>
            <Ionicons name="home" size={22} color="#FF1462" />
          </View>
          <Text style={styles.activeTabText}>Home</Text>
        </TouchableOpacity>

        {/* 👈 💡 Schedule ක්ලික් කරපු ගමන් කෙලින්ම My Schedule (Calendar) පේජ් එකට යන්න '/my-schedule' පාර දුන්නා */}
        <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/my-schedule')}>
          <Ionicons name="calendar-outline" size={22} color="#FFFFFF" style={styles.inactiveIcon} />
          <Text style={styles.tabText}>Schedule</Text>
        </TouchableOpacity>
         
         <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/Notifications')}>
          <View>
            <Ionicons name="chatbubble-ellipses-outline" size={22} color="#FFFFFF" style={styles.inactiveIcon} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </View>
          <Text style={styles.tabText}>Notification</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/Profile Page')}>
          <Ionicons name="person-outline" size={22} color="#FFFFFF" style={styles.inactiveIcon} />
          <Text style={styles.tabText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 35 : 55,
  },
  headerSection: {
    marginBottom: 25,
  },
  greetingText: {
    fontSize: 28,
    color: '#1A1A1A',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    letterSpacing: -0.2,
  },
  userNameText: {
    fontSize: 28,
    color: '#1A1A1A',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    letterSpacing: -0.2,
    marginTop: 4,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F3F6',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 54,
    marginBottom: 30,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
  },
  sectionTitle: {
    fontSize: 19,
    color: '#1A1A1A',
    fontWeight: '500',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statTile: {
    width: '31.5%',
    backgroundColor: '#FFF6F9',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  statIconBg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 2,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 10.5,
    color: '#8E8E93',
    textAlign: 'center',
  },
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12, // image_c76906.png එකේ විදිහට කලා
    paddingHorizontal: 12,
    height: 95,
    marginBottom: 15,
    backgroundColor: '#FFFFFF',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 12,
    backgroundColor: '#FFE1EC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FF1462',
  },
  loaderBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#8E8E93',
    fontSize: 14,
    marginBottom: 20,
  },
  cardDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  rowLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clientName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    width: '45%',
  },
  infoStack: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
    width: '55%',
    paddingLeft: 5,
  },
  serviceText: {
    fontSize: 15,
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 2,
  },
  timeText: {
    fontSize: 15,
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  statusBadge: {
    width: 90,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EAAEC5',
    borderRadius: 8, // image_c76906.png එකේ විදිහට කලා
    marginLeft: 5,
  },
  statusText: {
    color: '#000000',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 22,
    width: '100%',
  },
  bottomTabBar: {
    flexDirection: 'row',
    backgroundColor: '#FF1462',
    height: 85,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 20 : 5,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  activeIconBg: {
    backgroundColor: '#FFFFFF',
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  inactiveIcon: {
    marginBottom: 4,
  },
  tabText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#FF1462',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  badgeText: {
    color: '#FF1462',
    fontSize: 9,
    fontWeight: '700',
  },
});