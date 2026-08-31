import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../config/api';
import Avatar from '../../components/Avatar';

const TOP_CUSTOMER_API = `${BASE_URL}/api/staff/stats/top-customer`;

type TopCustomer = {
  customerId: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  visits: number;
  totalSpent: number;
  lastVisit: string;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  loyaltyPoints: number;
  memberSince: string;
};

// Matches LoyaltyAccount.js's tier enum exactly — this is the
// customer's real loyalty tier, not a made-up label.
const TIER_COLORS: Record<string, { bg: string; text: string }> = {
  Platinum: { bg: '#E9E9F5', text: '#4B4B8A' },
  Gold: { bg: '#FFF3D6', text: '#8A6D1F' },
  Silver: { bg: '#EFEFEF', text: '#5A5A5A' },
  Bronze: { bg: '#F5E4D6', text: '#8A5A2A' },
};

// memberSince comes straight from the LoyaltyAccount/Customer document
// (a real ISO timestamp), not our app's "YYYY-MM-DD" booking-date
// convention — needs its own parser, not formatDisplayDate above.
const formatMemberSince = (value: string): string => {
  if (!value) return '-';
  try {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '-';
    return parsed.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
};

export default function TopCustomer() {
  const router = useRouter();
  const [customer, setCustomer] = useState<TopCustomer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('staffToken');
        if (!token) {
          router.replace('/');
          return;
        }

        const res = await fetch(TOP_CUSTOMER_API, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (res.ok) {
          setCustomer(data.topCustomer || null);
        }
      } catch (error) {
        console.error('Load top customer failed:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const tierStyle = customer ? TIER_COLORS[customer.tier] || TIER_COLORS.Bronze : TIER_COLORS.Bronze;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backArrow} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Top Customer</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color="#FF1462" />
        </View>
      ) : !customer ? (
        <View style={styles.emptyBox}>
          <Ionicons name="trophy-outline" size={40} color="#D0D0D0" />
          <Text style={styles.emptyText}>
            No completed appointments yet — your top customer will appear here once you have some.
          </Text>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.photoCard}>
            <View style={styles.crownBadge}>
              <MaterialCommunityIcons name="crown" size={20} color="#F5A623" />
            </View>
            <Avatar
              uri={customer.avatar}
              name={customer.name}
              size={92}
              fallbackColor="#fff"
              textStyle={{ color: '#FF1462' }}
            />
            <Text style={styles.name}>{customer.name}</Text>
            <View style={[styles.tierBadge, { backgroundColor: tierStyle.bg }]}>
              <Ionicons name="star" size={12} color={tierStyle.text} />
              <Text style={[styles.tierText, { color: tierStyle.text }]}>{customer.tier} Member</Text>
            </View>
          </View>

          <View style={styles.statsBox}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total Visits</Text>
              <Text style={styles.statValue}>{customer.visits}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total Spent</Text>
              <Text style={styles.statValue}>LKR {(customer.totalSpent ?? 0).toLocaleString()}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Loyalty Points</Text>
              <Text style={styles.statValue}>{(customer.loyaltyPoints ?? 0).toLocaleString()}</Text>
            </View>
            <View style={[styles.statRow, { marginBottom: 0 }]}>
              <Text style={styles.statLabel}>Member Since</Text>
              <Text style={styles.statValue}>{formatMemberSince(customer.memberSince)}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.outlineButton}
            activeOpacity={0.8}
            onPress={() =>
              router.push({
                pathname: '/customer-profile',
                params: {
                  customerId: customer.customerId,
                  name: customer.name,
                  email: customer.email,
                  phone: customer.phone,
                  avatar: customer.avatar || '',
                  tier: customer.tier,
                  visits: String(customer.visits),
                  totalSpent: String(customer.totalSpent),
                  loyaltyPoints: String(customer.loyaltyPoints),
                  memberSince: customer.memberSince,
                },
              })
            }
          >
            <Text style={styles.outlineButtonText}>View Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.outlineButton, { marginTop: 12 }]}
            activeOpacity={0.8}
            onPress={() =>
              router.push({
                pathname: '/appointment-history',
                params: {
                  customerId: customer.customerId,
                  customerName: customer.name,
                },
              })
            }
          >
            <Text style={styles.outlineButtonText}>View Appointment History</Text>
          </TouchableOpacity>
        </View>
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
  loaderBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyText: { color: '#8E8E93', fontSize: 14, marginTop: 12, textAlign: 'center', lineHeight: 19 },
  content: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 30 },
  photoCard: {
    width: '100%',
    backgroundColor: '#FDE4ED',
    borderRadius: 20,
    paddingTop: 26,
    paddingBottom: 20,
    alignItems: 'center',
    marginBottom: 18,
  },
  crownBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: { fontSize: 20, fontWeight: '700', color: '#111', marginTop: 14, marginBottom: 10 },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  tierText: { fontSize: 12, fontWeight: '700' },
  statsBox: {
    width: '100%',
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 22,
  },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  statLabel: { fontSize: 14, fontWeight: '700', color: '#111' },
  statValue: { fontSize: 14, fontWeight: '600', color: '#444' },
  outlineButton: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#FF1462',
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: 'center',
  },
  outlineButtonText: { color: '#FF1462', fontWeight: '700', fontSize: 14 },
});
