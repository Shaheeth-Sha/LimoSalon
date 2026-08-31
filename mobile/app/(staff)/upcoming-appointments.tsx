import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../config/api';
import Avatar from '../../components/Avatar';

// Home's "Upcoming Appointments" View All — mirrors today-jobs.tsx's
// single scrollable list pattern, but for every future date rather
// than just today, since a real "View All" on a list means the whole
// list, not a calendar you tap through one day at a time.
const MY_BOOKINGS_API = `${BASE_URL}/api/staff/my-bookings`;

type Booking = {
  _id: string;
  customer?: { name?: string; avatar?: string };
  services: { name: string }[];
  selectedDate: string;
  selectedTime: string;
  estimatedDuration?: number;
  status: string;
  effectiveStatus: string;
};

const formatLocalDate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const formatDisplayTime = (time: string): string =>
  time ? time.replace(/am$/i, 'A.M').replace(/pm$/i, 'P.M') : '';

const formatDisplayDate = (dateStr: string): string => {
  try {
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const statusColor = (status: string) => {
  if (status === 'Completed') return { bg: '#E4F7E9', text: '#1E8A3C' };
  if (status === 'Cancelled') return { bg: '#FBE4E4', text: '#C13333' };
  if (status === 'Awaiting Completion') return { bg: '#FFF3D6', text: '#8A6D1F' };
  if (status === 'Pending') return { bg: '#DCEBFF', text: '#1D5FAB' };
  if (status === 'No-show') return { bg: '#FBE9D2', text: '#B9791F' };
  return { bg: '#FDE4ED', text: '#FF1462' };
};

export default function UpcomingAppointments() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
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
        setBookings([]);
        return;
      }

      const todayStr = formatLocalDate(new Date());
      const all: Booking[] = Array.isArray(data.bookings) ? data.bookings : [];

      // Same "active, future-dated" definition Home's Upcoming
      // Appointments section uses, sorted soonest-first — the API
      // itself returns newest-first, which read backwards here.
      setBookings(
        all
          .filter(
            (b) =>
              b.selectedDate > todayStr &&
              b.status !== 'Cancelled' &&
              b.status !== 'Completed' &&
              b.status !== 'No-show'
          )
          .sort((a, b) => {
            if (a.selectedDate !== b.selectedDate) {
              return a.selectedDate < b.selectedDate ? -1 : 1;
            }
            return a.selectedTime.localeCompare(b.selectedTime);
          })
      );
    } catch (error) {
      console.error('Load upcoming appointments failed:', error);
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

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backArrow} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upcoming Appointments</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color="#FF1462" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF1462" />}
        >
          <Text style={styles.countText}>
            {bookings.length} upcoming appointment{bookings.length === 1 ? '' : 's'}
          </Text>

          {bookings.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="calendar-outline" size={40} color="#D0D0D0" />
              <Text style={styles.emptyText}>No upcoming appointments scheduled.</Text>
            </View>
          ) : (
            bookings.map((b) => {
              const status = b.effectiveStatus || b.status;
              const colors = statusColor(status);
              const serviceNames = (b.services || []).map((s) => s.name).join(', ') || 'Service';

              return (
                <TouchableOpacity
                  key={b._id}
                  style={styles.card}
                  activeOpacity={0.8}
                  onPress={() =>
                    router.push({
                      pathname: '/schedule',
                      params: {
                        bookingId: b._id,
                        customerName: b.customer?.name || 'Customer',
                        service: serviceNames,
                        date: b.selectedDate,
                        time: b.selectedTime,
                        status: b.status,
                        estimatedDuration: String(b.estimatedDuration || 0),
                        customerAvatar: b.customer?.avatar || '',
                      },
                    })
                  }
                >
                  <Avatar
                    uri={b.customer?.avatar}
                    name={b.customer?.name || 'Customer'}
                    size={52}
                    fallbackColor="#FFE1EC"
                    style={{ marginRight: 12 }}
                    textStyle={{ color: '#FF1462' }}
                  />
                  <View style={styles.cardBody}>
                    <Text style={styles.name} numberOfLines={1}>{b.customer?.name || 'Customer'}</Text>
                    <Text style={styles.service} numberOfLines={1}>{serviceNames}</Text>
                    <Text style={styles.time}>
                      {formatDisplayDate(b.selectedDate)} · {formatDisplayTime(b.selectedTime)}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
                    <Text style={[styles.statusText, { color: colors.text }]}>{status}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
    marginBottom: 12,
  },
  backArrow: { width: 36, height: 36, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111' },
  headerSpacer: { width: 36 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 20 },
  loaderBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  countText: { fontSize: 13, color: '#8E8E93', marginBottom: 16 },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: '#8E8E93', fontSize: 14, marginTop: 12, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 14,
  },
  cardBody: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#111', marginBottom: 3 },
  service: { fontSize: 13, color: '#666', marginBottom: 3 },
  time: { fontSize: 12, color: '#999' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '600' },
});
