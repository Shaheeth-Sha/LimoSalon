import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../config/api';
import Avatar from '../../components/Avatar';

const RECENT_REVIEWS_API = `${BASE_URL}/api/staff/reviews/recent`;

type ReviewItem = {
  id: string;
  customerName: string;
  customerAvatar?: string;
  rating: number;
  comment: string;
  service: string;
  date: string;
  createdAt: string;
};

// Matches the relative-time style used by real review lists (Google,
// App Store, etc.) — "2 days ago" reads far more naturally at a
// glance than an absolute date, and only falls back to a calendar
// date once a review is old enough that "weeks/months ago" stops
// being useful.
const formatRelativeTime = (isoStr: string): string => {
  if (!isoStr) return '';

  try {
    const then = new Date(isoStr).getTime();
    if (Number.isNaN(then)) return '';

    const diffMs = Date.now() - then;
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;

    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;

    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;

    const diffWeek = Math.floor(diffDay / 7);
    if (diffWeek < 5) return `${diffWeek} week${diffWeek === 1 ? '' : 's'} ago`;

    return new Date(isoStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
};

export default function RecentReviews() {
  const router = useRouter();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('staffToken');
        if (!token) {
          router.replace('/');
          return;
        }

        const res = await fetch(RECENT_REVIEWS_API, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (res.ok) {
          setReviews(Array.isArray(data.reviews) ? data.reviews : []);
        }
      } catch (error) {
        console.error('Load recent reviews failed:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backArrow} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recent Reviews</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color="#FF1462" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {reviews.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="chatbubbles-outline" size={40} color="#D0D0D0" />
              <Text style={styles.emptyText}>
                No reviews yet — they'll show up here once customers rate a completed appointment.
              </Text>
            </View>
          ) : (
            reviews.map((r) => (
              <View key={r.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Avatar
                    uri={r.customerAvatar}
                    name={r.customerName}
                    size={40}
                    fallbackColor="#FFE1EC"
                    style={{ marginRight: 10 }}
                    textStyle={{ color: '#FF1462' }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.customerName}>{r.customerName}</Text>
                    {r.service ? <Text style={styles.service} numberOfLines={1}>{r.service}</Text> : null}
                  </View>
                  <Text style={styles.date}>{formatRelativeTime(r.createdAt)}</Text>
                </View>

                <View style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Feather
                      key={star}
                      name="star"
                      size={14}
                      color={star <= r.rating ? '#FFB800' : '#E0E0E0'}
                      style={{ marginRight: 2 }}
                    />
                  ))}
                </View>

                {r.comment ? <Text style={styles.comment}>{r.comment}</Text> : null}
              </View>
            ))
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
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111' },
  headerSpacer: { width: 36 },
  loaderBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 20 },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: '#8E8E93', fontSize: 14, marginTop: 12, textAlign: 'center', lineHeight: 19 },
  card: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFE1EC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarInitial: { fontSize: 15, fontWeight: '700', color: '#FF1462' },
  customerName: { fontSize: 14, fontWeight: '600', color: '#111' },
  service: { fontSize: 12, color: '#8E8E93', marginTop: 1 },
  date: { fontSize: 11, color: '#A0A0A0' },
  starRow: { flexDirection: 'row', marginBottom: 8 },
  comment: { fontSize: 13, color: '#444', lineHeight: 19 },
});
