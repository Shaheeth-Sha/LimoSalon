import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
  Switch,
  ActivityIndicator,
} from 'react-native';
// Same fix as my-schedule.tsx — SafeAreaView from 'react-native' is a
// no-op on Android, so this screen's header/toggle/calendar/Save
// button were rendering under the status bar instead of below it.
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AlertModal, { AlertType } from '../../components/AlertModal';
import { BASE_URL } from '../../config/api';

const PROFILE_API = `${BASE_URL}/api/staff/profile`;
const AVAILABILITY_API = `${BASE_URL}/api/staff/availability`;
const TIME_SLOTS_API = `${BASE_URL}/api/time-slots?bookingType=default`;

const formatLocalDate = (date: Date): string => {
  return (
    `${date.getFullYear()}-` +
    `${String(date.getMonth() + 1).padStart(2, '0')}-` +
    `${String(date.getDate()).padStart(2, '0')}`
  );
};

const formatDisplayDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

// The /api/time-slots business-hours generator returns "08.00 am"
// (dot) format; every stored blocked/booked time is "08:00 am"
// (colon) format via bookingController.js's normalizeBookingTime.
// normalizeBookingTime does nothing more than replace "." with ":"
// before parsing an already zero-padded "hh:mm am/pm" string, so this
// plain string swap produces byte-for-byte the same normalized value
// without needing that function on the client.
const toColonFormat = (dotTime: string): string => dotTime.replace('.', ':');

export default function UpdateAvailability() {
  const router = useRouter();

  // Global on/off switch — unchanged, still the all-or-nothing flag on
  // the Staff record.
  const [available, setAvailable] = useState(true);

  // Per-date/per-timeslot granular blocks — the new "real world" layer
  // on top of the switch above.
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<Set<string>>(new Set());
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [dateLoading, setDateLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [alert, setAlert] = useState<{ visible: boolean; type: AlertType; title: string; message: string }>({
    visible: false,
    type: 'error',
    title: '',
    message: '',
  });

  const showAlert = (type: AlertType, title: string, message: string) =>
    setAlert({ visible: true, type, title, message });

  const closeAlert = () => setAlert((prev) => ({ ...prev, visible: false }));

  // Initial load: the global switch state + the business-hours slot
  // list (both independent of which date is selected).
  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('staffToken');

        if (!token) {
          router.replace('/');
          return;
        }

        const [profileRes, slotsRes] = await Promise.all([
          fetch(PROFILE_API, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(TIME_SLOTS_API, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        const profileData = await profileRes.json();
        const slotsData = await slotsRes.json();

        if (!profileRes.ok) {
          await AsyncStorage.multiRemove(['staffToken', 'staffData']);
          router.replace('/');
          return;
        }

        setAvailable(profileData.staff?.available !== false);
        setTimeSlots(Array.isArray(slotsData.times) ? slotsData.times : []);
      } catch (error) {
        console.error('Load staff availability failed:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Refetch this date's blocked/booked slots whenever the selected
  // date changes.
  const loadAvailabilityForDate = useCallback(async (date: Date) => {
    setDateLoading(true);

    try {
      const token = await AsyncStorage.getItem('staffToken');
      const dateStr = formatLocalDate(date);

      const res = await fetch(`${AVAILABILITY_API}/${dateStr}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        showAlert('error', 'Load Failed', data.message || 'Unable to load availability for that date');
        return;
      }

      setBlockedTimes(new Set(Array.isArray(data.blockedTimes) ? data.blockedTimes : []));
      setBookedTimes(Array.isArray(data.bookedTimes) ? data.bookedTimes : []);
    } catch (error) {
      console.error('Load availability for date failed:', error);
    } finally {
      setDateLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAvailabilityForDate(selectedDate);
  }, [selectedDate, loadAvailabilityForDate]);

  const toggleSlot = (dotTime: string) => {
    const colonTime = toColonFormat(dotTime);
    if (bookedTimes.includes(colonTime)) return; // already booked — not blockable

    setBlockedTimes((prev) => {
      const next = new Set(prev);
      if (next.has(colonTime)) {
        next.delete(colonTime);
      } else {
        next.add(colonTime);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (saving) return;

    setSaving(true);

    try {
      const token = await AsyncStorage.getItem('staffToken');
      const dateStr = formatLocalDate(selectedDate);

      const [globalRes, dateRes] = await Promise.all([
        fetch(AVAILABILITY_API, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ available }),
        }),
        fetch(`${AVAILABILITY_API}/${dateStr}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ blockedTimes: Array.from(blockedTimes) }),
        }),
      ]);

      const globalData = await globalRes.json();
      const dateData = await dateRes.json();

      if (!globalRes.ok) {
        showAlert('error', 'Update Failed', globalData.message || 'Unable to update your availability');
        return;
      }

      if (!dateRes.ok) {
        showAlert('error', 'Update Failed', dateData.message || 'Unable to update your blocked slots');
        return;
      }

      const stored = await AsyncStorage.getItem('staffData');
      if (stored) {
        const staff = JSON.parse(stored);
        await AsyncStorage.setItem('staffData', JSON.stringify({ ...staff, available: globalData.available }));
      }

      setShowModal(true);
    } catch (error: any) {
      showAlert('error', 'Something Went Wrong', String(error?.message || error));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#FF1462" />
      </SafeAreaView>
    );
  }

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthTitle = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarDays = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Update Availability</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.toggleCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>Available for new bookings</Text>
            <Text style={styles.toggleSub}>
              {available
                ? 'Customers can book appointments with you.'
                : "You won't be shown as available for new bookings."}
            </Text>
          </View>
          <Switch
            value={available}
            onValueChange={setAvailable}
            trackColor={{ false: '#E0E0E0', true: '#FBB6CE' }}
            thumbColor={available ? '#FF1462' : '#F4F3F4'}
          />
        </View>

        <Text style={styles.sectionLabel}>Select Date</Text>
        <TouchableOpacity
          style={styles.dateField}
          activeOpacity={0.8}
          onPress={() => setCalendarOpen((prev) => !prev)}
        >
          <Text style={styles.dateFieldText}>{formatDisplayDate(selectedDate)}</Text>
          <Ionicons name={calendarOpen ? 'chevron-up' : 'calendar-outline'} size={20} color="#FF1462" />
        </TouchableOpacity>

        {calendarOpen && (
          <View style={styles.calendarBox}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={() => setCurrentDate(new Date(year, month - 1, 1))}>
                <Ionicons name="chevron-back" size={22} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.monthTitle}>{monthTitle}</Text>
              <TouchableOpacity onPress={() => setCurrentDate(new Date(year, month + 1, 1))}>
                <Ionicons name="chevron-forward" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.weekDays}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                <Text key={d} style={styles.weekDayText}>{d}</Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {calendarDays.map((day, index) => {
                if (!day) {
                  return <View key={index} style={styles.dayCell} />;
                }

                const cellDate = new Date(year, month, day);
                const isPast = cellDate < todayMidnight;
                const isSelected = formatLocalDate(cellDate) === formatLocalDate(selectedDate);
                const isToday = formatLocalDate(cellDate) === formatLocalDate(today);

                return (
                  <TouchableOpacity
                    key={index}
                    disabled={isPast}
                    activeOpacity={0.8}
                    onPress={() => {
                      setSelectedDate(cellDate);
                      setCalendarOpen(false);
                    }}
                    style={[styles.dayCell, isSelected && styles.selectedDay]}
                  >
                    <View style={[styles.todayCircle, isToday && styles.todayCircleActive]}>
                      <Text
                        style={[
                          styles.dayText,
                          isPast && styles.dayTextDisabled,
                          isSelected && styles.selectedDayText,
                        ]}
                      >
                        {day}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <Text style={styles.sectionLabel}>Select Timeslot</Text>
        <Text style={styles.sectionHint}>Tap a slot to block or reopen it for this date.</Text>

        {dateLoading ? (
          <ActivityIndicator size="small" color="#FF1462" style={{ marginVertical: 20 }} />
        ) : timeSlots.length === 0 ? (
          <Text style={styles.emptyText}>No time slots configured.</Text>
        ) : (
          <View style={styles.slotGrid}>
            {timeSlots.map((slot) => {
              const colonTime = toColonFormat(slot);
              const isBooked = bookedTimes.includes(colonTime);
              const isBlocked = blockedTimes.has(colonTime);

              return (
                <TouchableOpacity
                  key={slot}
                  disabled={isBooked}
                  activeOpacity={0.8}
                  onPress={() => toggleSlot(slot)}
                  style={[
                    styles.slotChip,
                    isBlocked && styles.slotChipBlocked,
                    isBooked && styles.slotChipBooked,
                  ]}
                >
                  <Text
                    style={[
                      styles.slotChipText,
                      isBlocked && styles.slotChipTextBlocked,
                      isBooked && styles.slotChipTextBooked,
                    ]}
                  >
                    {slot}
                  </Text>
                  {isBooked && <Text style={styles.slotChipSub}>Booked</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#FF1462' }]} />
            <Text style={styles.legendText}>Open</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FF1462' }]} />
            <Text style={styles.legendText}>Blocked</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#BDBDBD' }]} />
            <Text style={styles.legendText}>Booked</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.btnText}>{saving ? 'Saving...' : 'Save'}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Success Modal */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.checkBadge}>
              <Ionicons name="checkmark" size={44} color="#FFF" />
            </View>
            <Text style={styles.modalTitle}>Availability Updated</Text>
            <Text style={styles.modalSub}>Your schedule has been saved!</Text>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => {
                setShowModal(false);
                router.replace('/my-schedule');
              }}
            >
              <Text style={styles.btnText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <AlertModal
        visible={alert.visible}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        onClose={closeAlert}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  content: { padding: 25, paddingBottom: 50 },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#000' },

  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FF1462',
    marginBottom: 28,
  },
  toggleLabel: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  toggleSub: { fontSize: 13, color: '#777' },

  sectionLabel: { fontSize: 16, fontWeight: '700', marginBottom: 10, color: '#111' },
  sectionHint: { fontSize: 12, color: '#999', marginBottom: 12, marginTop: -6 },

  dateField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  dateFieldText: { fontSize: 15, fontWeight: '600', color: '#111' },

  calendarBox: {
    backgroundColor: '#DCA0B6',
    borderRadius: 20,
    padding: 12,
    marginBottom: 24,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  monthTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  weekDays: { flexDirection: 'row', marginBottom: 6 },
  weekDayText: { width: '14.28%', textAlign: 'center', color: '#fff', fontSize: 12, fontWeight: '700' },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  dayCell: {
    width: '14.28%',
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 0.5,
    borderColor: '#F3D9E3',
  },
  selectedDay: { backgroundColor: '#FBE1EA' },
  todayCircle: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  todayCircleActive: { borderWidth: 2, borderColor: '#FF1462' },
  dayText: { color: '#2A2A2A', fontSize: 14, fontWeight: '700' },
  dayTextDisabled: { color: '#CCC' },
  selectedDayText: { color: '#FF1462', fontWeight: '900' },

  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  slotChip: {
    width: '31%',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FF1462',
    backgroundColor: '#FFF',
    alignItems: 'center',
    marginBottom: 12,
  },
  slotChipBlocked: { backgroundColor: '#FF1462' },
  slotChipBooked: { backgroundColor: '#EFEFEF', borderColor: '#CCC' },
  slotChipText: { fontSize: 13, fontWeight: '700', color: '#FF1462' },
  slotChipTextBlocked: { color: '#FFF' },
  slotChipTextBooked: { color: '#9E9E9E' },
  slotChipSub: { fontSize: 10, color: '#9E9E9E', marginTop: 2 },

  legendRow: {
    flexDirection: 'row',
    marginTop: 4,
    marginBottom: 26,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginRight: 18 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { fontSize: 12, color: '#777' },

  emptyText: { color: '#999', fontSize: 13, marginBottom: 20 },

  saveBtn: { backgroundColor: '#FF1462', padding: 18, borderRadius: 12, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { width: '85%', backgroundColor: '#FFF', borderRadius: 20, padding: 30, alignItems: 'center' },
  checkBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FF1462',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 16, textAlign: 'center' },
  modalSub: { marginVertical: 10, color: '#666', textAlign: 'center', fontSize: 15 },
  backBtn: { backgroundColor: '#FF1462', width: '100%', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 20 },
});
