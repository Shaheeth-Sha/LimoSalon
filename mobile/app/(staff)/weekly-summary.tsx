import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
// SDK 54 moved the classic file-write / Storage Access Framework API
// (still the right tool for "let the user pick a folder and write a
// file into it") behind this subpath — the default `expo-file-system`
// export is the newer File/Directory-class API, which doesn't cover
// this use case the same way.
import * as FileSystem from 'expo-file-system/legacy';
import { BASE_URL } from '../../config/api';
import AlertModal from '../../components/AlertModal';

const WEEKLY_SUMMARY_API = `${BASE_URL}/api/staff/stats/weekly`;

type DayStat = { label: string; date: string; jobs: number; revenue: number };

type Summary = {
  weekStart: string;
  weekEnd: string;
  totalJobs: number;
  completedJobs: number;
  cancelledJobs: number;
  revenue: number;
  newCustomers: number;
  averageRating: number;
  byDay: DayStat[];
};

const formatDisplayDate = (dateStr: string): string => {
  try {
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
};

// Includes the year — used in the exported PDF report itself, where
// the short chip-style date used in the on-screen week nav would be
// ambiguous once the report is saved or shared outside the app.
const formatFullDate = (dateStr: string): string => {
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

const buildReportHtml = (summary: Summary, staffName: string): string => {
  const dayRows = summary.byDay
    .map(
      (d) => `
        <tr>
          <td>${d.label} (${formatDisplayDate(d.date)})</td>
          <td style="text-align:right;">${d.jobs}</td>
          <td style="text-align:right;">LKR ${d.revenue.toLocaleString()}</td>
        </tr>`
    )
    .join('');

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Helvetica, Arial, sans-serif; color: #111; padding: 32px; }
          h1 { color: #FF1462; margin-bottom: 4px; }
          .range { color: #666; margin-bottom: 24px; }
          .stats { display: flex; gap: 12px; margin-bottom: 24px; }
          .stat { flex: 1; background: #FAFAFA; border-radius: 10px; padding: 14px; text-align: center; }
          .stat .value { font-size: 20px; font-weight: 700; }
          .stat .label { font-size: 11px; color: #8E8E93; margin-top: 2px; }
          .revenue { background: #FDE4ED; border-radius: 10px; padding: 16px; margin-bottom: 24px; }
          .revenue .value { font-size: 24px; font-weight: 700; color: #FF1462; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 8px 6px; border-bottom: 1px solid #EEE; font-size: 13px; text-align: left; }
          th { color: #8E8E93; font-weight: 600; }
        </style>
      </head>
      <body>
        <h1>Weekly Summary</h1>
        <div class="range">${staffName ? `${staffName} · ` : ''}${formatFullDate(summary.weekStart)} – ${formatFullDate(summary.weekEnd)}</div>

        <div class="stats">
          <div class="stat"><div class="value">${summary.totalJobs}</div><div class="label">Total Jobs</div></div>
          <div class="stat"><div class="value">${summary.completedJobs}</div><div class="label">Completed</div></div>
          <div class="stat"><div class="value">${summary.cancelledJobs}</div><div class="label">Cancelled</div></div>
          <div class="stat"><div class="value">${summary.newCustomers}</div><div class="label">New Customers</div></div>
          <div class="stat"><div class="value">${summary.averageRating.toFixed(1)}</div><div class="label">Avg Rating</div></div>
        </div>

        <div class="revenue">
          <div style="font-size:12px;color:#8A1230;">Revenue This Week</div>
          <div class="value">LKR ${summary.revenue.toLocaleString()}</div>
          <div style="font-size:11px;color:#B0507A;margin-top:2px;">From completed appointments only</div>
        </div>

        <table>
          <thead><tr><th>Day</th><th style="text-align:right;">Jobs</th><th style="text-align:right;">Revenue</th></tr></thead>
          <tbody>${dayRows}</tbody>
        </table>
      </body>
    </html>
  `;
};

export default function WeeklySummary() {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [staffName, setStaffName] = useState('');
  const [exporting, setExporting] = useState<'download' | 'share' | null>(null);
  const [alertState, setAlertState] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

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

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('staffData');
        if (stored) {
          const staff = JSON.parse(stored);
          setStaffName(staff?.name || '');
        }
      } catch {
        // Non-critical — the report just omits the staff name.
      }
    })();
  }, []);

  const maxJobs = summary ? Math.max(1, ...summary.byDay.map((d) => d.jobs)) : 1;

  // Both buttons generate the same real PDF from this week's actual
  // data, but they're genuinely different actions now: "Share Report"
  // opens the OS share sheet (Mail, WhatsApp, AirDrop, etc.), while
  // "Download PDF" saves the file directly instead — on Android via
  // the system's native "choose a folder" picker (Storage Access
  // Framework, not the app-sharing chooser), and on iOS into the
  // app's own storage since iOS has no public Downloads folder to
  // write into directly.
  const handleExport = async (mode: 'download' | 'share') => {
    if (!summary || exporting) return;

    setExporting(mode);

    try {
      const canShare = await Sharing.isAvailableAsync();

      if (mode === 'share') {
        if (!canShare) {
          setAlertState({
            visible: true,
            title: 'Not Available',
            message: "Sharing files isn't supported on this device.",
          });
          return;
        }

        const { uri } = await Print.printToFileAsync({ html: buildReportHtml(summary, staffName) });

        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Weekly Report',
          UTI: 'com.adobe.pdf',
        });
        return;
      }

      // mode === 'download'
      const { uri } = await Print.printToFileAsync({ html: buildReportHtml(summary, staffName) });
      const fileName = `LimoSalon-Weekly-Summary-${summary.weekStart}.pdf`;

      if (Platform.OS === 'android') {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

        if (!permissions.granted) {
          if (!canShare) {
            setAlertState({
              visible: true,
              title: 'Download Cancelled',
              message: 'No folder was chosen, so the report was not saved.',
            });
            return;
          }

          // No save folder chosen — fall back to the share sheet
          // rather than silently losing the report.
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Save Weekly Report',
            UTI: 'com.adobe.pdf',
          });
          return;
        }

        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const destUri = await FileSystem.StorageAccessFramework.createFileAsync(
          permissions.directoryUri,
          fileName,
          'application/pdf'
        );
        await FileSystem.writeAsStringAsync(destUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        setAlertState({
          visible: true,
          title: 'Downloaded',
          message: 'Weekly report saved to the folder you chose.',
        });
      } else {
        const destUri = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.copyAsync({ from: uri, to: destUri });

        setAlertState({
          visible: true,
          title: 'Downloaded',
          message: 'Weekly report saved. Use Share Report if you want to send it to Files, Mail, or another app.',
        });
      }
    } catch (error) {
      console.error('Export weekly report failed:', error);
      setAlertState({
        visible: true,
        title: 'Export Failed',
        message: "Couldn't generate the report PDF. Please try again.",
      });
    } finally {
      setExporting(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backArrow} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color="#000" />
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

          <View style={styles.secondaryStatsRow}>
            <View style={styles.secondaryStatTile}>
              <View style={styles.secondaryStatIconBg}>
                <Feather name="user-plus" size={16} color="#FF1462" />
              </View>
              <Text style={styles.summaryValue}>{summary?.newCustomers ?? 0}</Text>
              <Text style={styles.summaryLabel}>New Customers</Text>
            </View>
            <View style={styles.secondaryStatTile}>
              <View style={styles.secondaryStatIconBg}>
                <Ionicons name="star" size={16} color="#FF1462" />
              </View>
              <Text style={styles.summaryValue}>{(summary?.averageRating ?? 0).toFixed(1)}</Text>
              <Text style={styles.summaryLabel}>Average Rating</Text>
            </View>
          </View>

          <View style={styles.exportRow}>
            <TouchableOpacity
              style={styles.exportButton}
              activeOpacity={0.8}
              disabled={!!exporting}
              onPress={() => handleExport('download')}
            >
              {exporting === 'download' ? (
                <ActivityIndicator size="small" color="#FF1462" />
              ) : (
                <>
                  <Feather name="download" size={15} color="#FF1462" />
                  <Text style={styles.exportButtonText}>Download PDF</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.exportButton, styles.exportButtonFilled]}
              activeOpacity={0.8}
              disabled={!!exporting}
              onPress={() => handleExport('share')}
            >
              {exporting === 'share' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="share-2" size={15} color="#fff" />
                  <Text style={[styles.exportButtonText, styles.exportButtonTextFilled]}>Share Report</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      <AlertModal
        visible={alertState.visible}
        type="error"
        title={alertState.title}
        message={alertState.message}
        onClose={() => setAlertState((prev) => ({ ...prev, visible: false }))}
      />
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
  secondaryStatsRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  secondaryStatTile: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryStatIconBg: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FDE4ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  exportRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1.5,
    borderColor: '#FF1462',
    borderRadius: 25,
    paddingVertical: 13,
  },
  exportButtonFilled: { backgroundColor: '#FF1462', borderColor: '#FF1462' },
  exportButtonText: { color: '#FF1462', fontWeight: '700', fontSize: 13 },
  exportButtonTextFilled: { color: '#fff' },
});
