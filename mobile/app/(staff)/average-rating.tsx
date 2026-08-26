import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../config/api';

const SUMMARY_API = `${BASE_URL}/api/staff/reviews/summary`;

type Summary = {
  average: number;
  count: number;
  distribution: Record<string, number>;
};

export default function AverageRating() {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('staffToken');
        if (!token) {
          router.replace('/');
          return;
        }

        const res = await fetch(SUMMARY_API, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (res.ok) {
          setSummary(data.summary);
        }
      } catch (error) {
        console.error('Load rating summary failed:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const maxCount = summary
    ? Math.max(1, ...Object.values(summary.distribution))
    : 1;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backArrow} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="chevron-left" size={26} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Average Rating</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color="#FF1462" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.summaryBox}>
            <Text style={styles.bigRating}>{(summary?.average || 0).toFixed(1)}</Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Feather
                  key={star}
                  name="star"
                  size={22}
                  color={star <= Math.round(summary?.average || 0) ? '#FFB800' : '#E0E0E0'}
                  style={{ marginHorizontal: 2 }}
                />
              ))}
            </View>
            <Text style={styles.countText}>
              Based on {summary?.count || 0} review{summary?.count === 1 ? '' : 's'}
            </Text>
          </View>

          <View style={styles.distributionBox}>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = summary?.distribution?.[String(star)] || 0;
              const pct = summary && summary.count > 0 ? (count / summary.count) * 100 : 0;

              return (
                <View key={star} style={styles.distRow}>
                  <Text style={styles.distLabel}>{star}</Text>
                  <Feather name="star" size={13} color="#FFB800" style={{ marginRight: 8 }} />
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${pct}%` }]} />
                  </View>
                  <Text style={styles.distCount}>{count}</Text>
                </View>
              );
            })}
          </View>

          {(!summary || summary.count === 0) && (
            <Text style={styles.emptyText}>
              No reviews yet — this fills in once customers start rating completed appointments.
            </Text>
          )}
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
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  summaryBox: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 20,
  },
  bigRating: { fontSize: 48, fontWeight: '800', color: '#111' },
  starRow: { flexDirection: 'row', marginTop: 8, marginBottom: 8 },
  countText: { fontSize: 13, color: '#8E8E93' },
  distributionBox: {
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 18,
  },
  distRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  distLabel: { width: 14, fontSize: 13, fontWeight: '600', color: '#333', marginRight: 4 },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#E8E8E8',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 10,
  },
  barFill: { height: '100%', backgroundColor: '#FFB800', borderRadius: 4 },
  distCount: { width: 24, fontSize: 12, color: '#8E8E93', textAlign: 'right' },
  emptyText: {
    marginTop: 24,
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 12,
  },
});
