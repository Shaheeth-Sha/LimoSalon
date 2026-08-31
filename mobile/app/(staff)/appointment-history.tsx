import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../config/api';
import Avatar from '../../components/Avatar';

const MY_BOOKINGS_API = `${BASE_URL}/api/staff/my-bookings`;

type Booking = {
  _id: string;
  customer?: { name?: string; avatar?: string };
  services: { name: string }[];
  selectedDate: string;
  selectedTime: string;
  estimatedDuration?: number;
  totalAmount: number;
  status: string;
  isPast: boolean;
};

type FilterTab = 'all' | 'Completed' | 'Cancelled' | 'No-show';

const formatDisplayDate = (dateStr: string): string => {
  try {
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const statusColor = (status: string) => {
  if (status === 'Completed') return { bg: '#E4F7E9', text: '#1E8A3C' };
  if (status === 'Cancelled') return { bg: '#FBE4E4', text: '#C13333' };
  if (status === 'No-show') return { bg: '#FBE9D2', text: '#B9791F' };
  return { bg: '#FDE4ED', text: '#FF1462' };
};

export default function AppointmentHistory() {
  const router = useRouter();
  // Optional — set when this screen is reached via a specific
  // customer's "View Appointment History" button (Customer Profile /
  // Top Customer). Left unset for the general "my appointment
  // history" entry point from home.tsx, which keeps showing every
  // customer exactly as before.
  const { customerId, customerName } = useLocalSearchParams<{
    customerId?: string;
    customerName?: string;
  }>();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterTab>('all');

  const load = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('staffToken');
      if (!token) {
        router.replace('/');
        return;
      }

      const url = customerId
        ? `${MY_BOOKINGS_API}?customerId=${encodeURIComponent(customerId)}`
        : MY_BOOKINGS_API;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        setBookings([]);
        return;
      }

      const all: Booking[] = Array.isArray(data.bookings) ? data.bookings : [];
      setBookings(all.filter((b) => b.isPast));
    } catch (error) {
      console.error('Load appointment history failed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router, customerId]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const filteredBookings = bookings.filter((b) => filter === 'all' || b.status === filter);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backArrow} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {customerName ? `${customerName}'s History` : 'Appointment History'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.tabRow}>
        {(['all', 'Completed', 'Cancelled', 'No-show'] as FilterTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, filter === tab && styles.tabBtnActive]}
            onPress={() => setFilter(tab)}
          >
            <Text style={[styles.tabText, filter === tab && styles.tabTextActive]}>
              {tab === 'all' ? 'All' : tab}
            </Text>
          </TouchableOpacity>
        ))}
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
          {filteredBookings.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="time-outline" size={40} color="#D0D0D0" />
              <Text style={styles.emptyText}>No appointments here yet.</Text>
            </View>
          ) : (
            filteredBookings.map((b) => {
              const colors = statusColor(b.status);
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
                  <View style={styles.cardTop}>
                    <View style={styles.nameRow}>
                      <Avatar
                        uri={b.customer?.avatar}
                        name={b.customer?.name || 'Customer'}
                        size={32}
                        fallbackColor="#FFE1EC"
                        style={{ marginRight: 8 }}
                        textStyle={{ color: '#FF1462' }}
                      />
                      <Text style={styles.name} numberOfLines={1}>{b.customer?.name || 'Customer'}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
                      <Text style={[styles.statusText, { color: colors.text }]}>{b.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.service} numberOfLines={1}>{serviceNames}</Text>
                  <View style={styles.cardBottom}>
                    <Text style={styles.date}>{formatDisplayDate(b.selectedDate)}</Text>
                    <Text style={styles.amount}>LKR {(b.totalAmount || 0).toLocaleString()}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          <View style={{ height: 20 }} />
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
  headerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#111', textAlign: 'center' },
  headerSpacer: { width: 36 },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginHorizontal: 24,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 9 },
  tabBtnActive: { backgroundColor: '#FF1462' },
  tabText: { fontSize: 12, color: '#777', fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  loaderBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 20 },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: '#8E8E93', fontSize: 14, marginTop: 12 },
  card: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  name: { fontSize: 15, fontWeight: '600', color: '#111', flex: 1 },
  service: { fontSize: 13, color: '#666', marginBottom: 8 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: 12, color: '#999' },
  amount: { fontSize: 13, fontWeight: '600', color: '#333' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '600' },
});
