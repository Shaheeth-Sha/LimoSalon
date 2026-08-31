import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Avatar from '../../components/Avatar';

// Reached from Top Customer's "View Profile" button — every field is
// forwarded as a route param rather than re-fetched, since Top
// Customer already loaded the exact same data a screen ago.

const getParam = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
};

const TIER_COLORS: Record<string, { bg: string; text: string }> = {
  Platinum: { bg: '#E9E9F5', text: '#4B4B8A' },
  Gold: { bg: '#FFF3D6', text: '#8A6D1F' },
  Silver: { bg: '#EFEFEF', text: '#5A5A5A' },
  Bronze: { bg: '#F5E4D6', text: '#8A5A2A' },
};

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

export default function CustomerProfile() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    customerId?: string;
    name?: string;
    email?: string;
    phone?: string;
    avatar?: string;
    tier?: string;
    visits?: string;
    totalSpent?: string;
    loyaltyPoints?: string;
    memberSince?: string;
  }>();

  const customerId = getParam(params.customerId);
  const name = getParam(params.name) || 'Customer';
  const email = getParam(params.email);
  const phone = getParam(params.phone);
  const avatar = getParam(params.avatar);
  const tier = getParam(params.tier) || 'Bronze';
  const visits = Number(getParam(params.visits)) || 0;
  const totalSpent = Number(getParam(params.totalSpent)) || 0;
  const loyaltyPoints = Number(getParam(params.loyaltyPoints)) || 0;
  const memberSince = getParam(params.memberSince);

  const tierStyle = TIER_COLORS[tier] || TIER_COLORS.Bronze;

  const handleCall = () => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  };

  const handleMessage = () => {
    if (!phone) return;
    Linking.openURL(`sms:${phone}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backArrow} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Customer Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.identityCard}>
          <Avatar
            uri={avatar}
            name={name}
            size={64}
            fallbackColor="#FFE1EC"
            textStyle={{ color: '#FF1462' }}
            style={{ marginRight: 14 }}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            <View style={[styles.tierBadge, { backgroundColor: tierStyle.bg }]}>
              <Ionicons name="star" size={12} color={tierStyle.text} />
              <Text style={[styles.tierText, { color: tierStyle.text }]}>{tier} Member</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoBox}>
          {phone ? <InfoRow icon={<Feather name="phone" size={16} color="#FF1462" />} value={phone} /> : null}
          {email ? <InfoRow icon={<Feather name="mail" size={16} color="#FF1462" />} value={email} /> : null}
          <InfoRow
            icon={<Feather name="calendar" size={16} color="#FF1462" />}
            label="Member Since"
            value={formatMemberSince(memberSince)}
          />
          <InfoRow
            icon={<Feather name="check-square" size={16} color="#FF1462" />}
            label="Total Visits"
            value={String(visits)}
          />
          <InfoRow
            icon={<Feather name="credit-card" size={16} color="#FF1462" />}
            label="Total Spent"
            value={`LKR ${totalSpent.toLocaleString()}`}
          />
          <InfoRow
            icon={<Feather name="award" size={16} color="#FF1462" />}
            label="Loyalty Points"
            value={loyaltyPoints.toLocaleString()}
            last
          />
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionButton} activeOpacity={0.8} onPress={handleCall} disabled={!phone}>
            <Ionicons name="call-outline" size={18} color={phone ? '#FF1462' : '#CCC'} />
            <Text style={[styles.actionButtonText, !phone && { color: '#CCC' }]}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} activeOpacity={0.8} onPress={handleMessage} disabled={!phone}>
            <Ionicons name="chatbubble-outline" size={17} color={phone ? '#FF1462' : '#CCC'} />
            <Text style={[styles.actionButtonText, !phone && { color: '#CCC' }]}>Message</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.historyLink}
          activeOpacity={0.8}
          onPress={() =>
            router.push({
              pathname: '/appointment-history',
              params: { customerId, customerName: name },
            })
          }
        >
          <Text style={styles.historyLinkText}>View Appointment History</Text>
          <Ionicons name="chevron-forward" size={16} color="#FF1462" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
  last,
}: {
  icon: React.ReactNode;
  label?: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.infoRow, last && { marginBottom: 0 }]}>
      <View style={styles.infoIconCircle}>{icon}</View>
      {label ? (
        <View style={styles.infoLabelValueRow}>
          <Text style={styles.infoLabel}>{label}</Text>
          <Text style={styles.infoValue}>{value}</Text>
        </View>
      ) : (
        <Text style={styles.infoValueOnly}>{value}</Text>
      )}
    </View>
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
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDE4ED',
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
  },
  name: { fontSize: 17, fontWeight: '700', color: '#111', marginBottom: 8 },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  tierText: { fontSize: 12, fontWeight: '700' },
  infoBox: { marginBottom: 22 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  infoIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFE1EC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoLabelValueRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 13, fontWeight: '700', color: '#111' },
  infoValue: { fontSize: 13, fontWeight: '600', color: '#555' },
  infoValueOnly: { flex: 1, fontSize: 14, color: '#333', fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#FF1462',
    borderRadius: 25,
    paddingVertical: 13,
  },
  actionButtonText: { color: '#FF1462', fontWeight: '700', fontSize: 14 },
  historyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  historyLinkText: { color: '#FF1462', fontWeight: '700', fontSize: 13 },
});
