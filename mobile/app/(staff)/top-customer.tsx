import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../config/api';

const TOP_CUSTOMER_API = `${BASE_URL}/api/staff/stats/top-customer`;

type TopCustomer = {
  name: string;
  email: string;
  phone: string;
  visits: number;
  totalSpent: number;
  lastVisit: string;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
};

// Matches LoyaltyAccount.js's tier enum exactly — this is the
// customer's real loyalty tier, not a made-up label.
const TIER_COLORS: Record<string, { bg: string; text: string }> = {
  Platinum: { bg: '#E9E9F5', text: '#4B4B8A' },
  Gold: { bg: '#FFF3D6', text: '#8A6D1F' },
  Silver: { bg: '#EFEFEF', text: '#5A5A5A' },
  Bronze: { bg: '#F5E4D6', text: '#8A5A2A' },
};

const formatDisplayDate = (dateStr: string): string => {
  if (!dateStr) return '';
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
          <Feather name="chevron-left" size={26} color="#111" />
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
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>{customer.name.charAt(0).toUpperCase()}</Text>
          </View>

          <Text style={styles.name}>{customer.name}</Text>

          <View style={[styles.tierBadge, { backgroundColor: tierStyle.bg }]}>
            <Ionicons name="star" size={12} color={tierStyle.text} />
            <Text style={[styles.tierText, { color: tierStyle.text }]}>{customer.tier} Member</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>{customer.visits}</Text>
              <Text style={styles.statLabel}>Visits</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>LKR {customer.totalSpent.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Total Spent</Text>
            </View>
          </View>

          <View style={styles.infoBox}>
            {customer.email ? (
              <View style={styles.infoRow}>
                <Feather name="mail" size={15} color="#8E8E93" style={styles.infoIcon} />
                <Text style={styles.infoText}>{customer.email}</Text>
              </View>
            ) : null}
            {customer.phone ? (
              <View style={styles.infoRow}>
                <Feather name="phone" size={15} color="#8E8E93" style={styles.infoIcon} />
                <Text style={styles.infoText}>{customer.phone}</Text>
              </View>
            ) : null}
            {customer.lastVisit ? (
              <View style={styles.infoRow}>
                <Feather name="calendar" size={15} color="#8E8E93" style={styles.infoIcon} />
                <Text style={styles.infoText}>Last visit: {formatDisplayDate(customer.lastVisit)}</Text>
              </View>
            ) : null}
          </View>
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
  content: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 20 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFE1EC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarInitial: { fontSize: 34, fontWeight: '700', color: '#FF1462' },
  name: { fontSize: 20, fontWeight: '700', color: '#111', marginBottom: 10 },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 24,
  },
  tierText: { fontSize: 12, fontWeight: '700' },
  statsRow: { flexDirection: 'row', width: '100%', gap: 12, marginBottom: 24 },
  statTile: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  statValue: { fontSize: 17, fontWeight: '800', color: '#111', marginBottom: 4 },
  statLabel: { fontSize: 11, color: '#8E8E93' },
  infoBox: { width: '100%' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  infoIcon: { marginRight: 10 },
  infoText: { fontSize: 13, color: '#444' },
});
