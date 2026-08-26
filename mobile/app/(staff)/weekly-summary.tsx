import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../config/api';

const WEEKLY_SUMMARY_API = `${BASE_URL}/api/staff/stats/weekly`;

type DayStat = { label: string; date: string; jobs: number; revenue: number };

type Summary = {
  weekStart: string;
  weekEnd: string;
  totalJobs: number;
  completedJobs: number;
  cancelledJobs: number;
  revenue: number;
  byDay: DayStat[];
};

const formatDisplayDate = (dateStr: string): string => {
  try {
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
};

export default function WeeklySummary() {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);

  const load = useCallback(async (weekOffset: number) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('staffToken');
      if (!token) {
        router.replace('/');
        return;
      }

      const res = await fetch(`${WEEKLY_SUMMARY_API}?offset=${weekOffset}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (res.ok) {
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Load weekly summary failed:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load(offset);
  }, [offset, load]);

  const maxJobs = summary ? Math.max(1, ...summary.byDay.map((d) => d.jobs)) : 1;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backArrow} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="chevron-left" size={26} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Weekly Summary</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.weekNav}>
        <TouchableOpacity onPress={() => setOffset((o) => o - 1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="chevron-left" size={20} color="#FF1462" />
        </TouchableOpacity>
        <Text style={styles.weekRangeText}>
          {summary ? `${formatDisplayDate(summary.weekStart)} - ${formatDisplayDate(summary.weekEnd)}` : ''}
        </Text>
        <TouchableOpacity
          onPress={() => setOffset((o) => Math.min(o + 1, 0))}
          disabled={offset >= 0}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="chevron-right" size={20} color={offset >= 0 ? '#E0E0E0' : '#FF1462'} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color="#FF1462" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryTile}>
              <Text style={styles.summaryValue}>{summary?.totalJobs ?? 0}</Text>
              <Text style={styles.summaryLabel}>Total Jobs</Text>
            </View>
            <View style={styles.summaryTile}>
              <Text style={styles.summaryValue}>{summary?.completedJobs ?? 0}</Text>
              <Text style={styles.summaryLabel}>Completed</Text>
            </View>
            <View style={styles.summaryTile}>
              <Text style={styles.summaryValue}>{summary?.cancelledJobs ?? 0}</Text>
              <Text style={styles.summaryLabel}>Cancelled</Text>
            </View>
          </View>

          <View style={styles.revenueBox}>
            <Text style={styles.revenueLabel}>Revenue This Week</Text>
            <Text style={styles.revenueValue}>LKR {(summary?.revenue || 0).toLocaleString()}</Text>
            <Text style={styles.revenueHint}>From completed appointments only</Text>
          </View>

          <Text style={styles.chartTitle}>Jobs by Day</Text>
          <View style={styles.chartBox}>
            {(summary?.byDay || []).map((d) => (
              <View key={d.date} style={styles.dayColumn}>
                <View style={styles.barTrackVertical}>
                  <View
                    style={[
                      styles.barFillVertical,
                      { height: `${Math.max((d.jobs / maxJobs) * 100, d.jobs > 0 ? 8 : 0)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.dayLabel}>{d.label}</Text>
                <Text style={styles.dayCount}>{d.jobs}</Text>
              </View>
            ))}
          </View>

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
    marginBottom: 8,
  },
  backArrow: { width: 36, height: 36, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111' },
  headerSpacer: { width: 36 },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 16,
  },
  weekRangeText: { fontSize: 13, fontWeight: '600', color: '#333' },
  loaderBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 30 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  summaryTile: {
    width: '31%',
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  summaryValue: { fontSize: 20, fontWeight: '800', color: '#111', marginBottom: 4 },
  summaryLabel: { fontSize: 11, color: '#8E8E93' },
  revenueBox: {
    backgroundColor: '#FDE4ED',
    borderRadius: 16,
    padding: 18,
    marginBottom: 26,
  },
  revenueLabel: { fontSize: 12, color: '#8A1230', marginBottom: 4 },
  revenueValue: { fontSize: 26, fontWeight: '800', color: '#FF1462' },
  revenueHint: { fontSize: 11, color: '#B0507A', marginTop: 4 },
  chartTitle: { fontSize: 15, fontWeight: '600', color: '#111', marginBottom: 14 },
  chartBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
  },
  dayColumn: { alignItems: 'center', flex: 1 },
  barTrackVertical: {
    width: 18,
    height: 90,
    backgroundColor: '#F1F1F1',
    borderRadius: 9,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginBottom: 8,
  },
  barFillVertical: { width: '100%', backgroundColor: '#FF1462', borderRadius: 9 },
  dayLabel: { fontSize: 11, color: '#8E8E93', marginBottom: 2 },
  dayCount: { fontSize: 11, fontWeight: '600', color: '#333' },
});
