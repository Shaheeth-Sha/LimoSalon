import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, Platform, ScrollView, Switch, ActivityIndicator } from 'react-native';
// Fixed: same bug as my-schedule.tsx — SafeAreaView from 'react-native'
// is a no-op on Android, so this screen's title/toggle/Save button
// were rendering under the status bar instead of below it.
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AlertModal, { AlertType } from '../../components/AlertModal';
import { BASE_URL } from '../../config/api';

const PROFILE_API = `${BASE_URL}/api/staff/profile`;
const AVAILABILITY_API = `${BASE_URL}/api/staff/availability`;

// The real backend only supports a single on/off "available for new
// bookings" flag on the Staff record (see updateMyAvailability in
// staffScheduleController.js) — per-date/per-timeslot blocking isn't
// modelled server-side yet, so this screen mirrors what actually
// exists instead of a fake date/timeslot picker that saved nothing.
export default function UpdateAvailability() {
  const router = useRouter();
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('staffToken');

        if (!token) {
          router.replace('/');
          return;
        }

        const res = await fetch(PROFILE_API, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();

        if (!res.ok) {
          await AsyncStorage.multiRemove(['staffToken', 'staffData']);
          router.replace('/');
          return;
        }

        setAvailable(data.staff?.available !== false);
      } catch (error) {
        console.error('Load staff availability failed:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    if (saving) return;

    setSaving(true);

    try {
      const token = await AsyncStorage.getItem('staffToken');

      const res = await fetch(AVAILABILITY_API, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ available }),
      });

      const data = await res.json();

      if (!res.ok) {
        showAlert('error', 'Update Failed', data.message || 'Unable to update your availability');
        return;
      }

      const stored = await AsyncStorage.getItem('staffData');
      if (stored) {
        const staff = JSON.parse(stored);
        await AsyncStorage.setItem('staffData', JSON.stringify({ ...staff, available: data.available }));
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Update Availability</Text>

        <View style={styles.toggleCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>Available for new bookings</Text>
            <Text style={styles.toggleSub}>
              {available
                ? "Customers can book appointments with you."
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

        <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
          <Text style={styles.btnText}>{saving ? 'Saving...' : 'Save'}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Success Modal */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Ionicons name="checkmark-circle" size={80} color="#FF1462" />
            <Text style={styles.modalTitle}>Availability Updated</Text>
            <Text style={styles.modalSub}>Your availability has been saved!</Text>
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
  content: { padding: 25 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 25, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FF1462',
    marginBottom: 30,
  },
  toggleLabel: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  toggleSub: { fontSize: 13, color: '#777' },
  saveBtn: { backgroundColor: '#FF1462', padding: 18, borderRadius: 12, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { width: '85%', backgroundColor: '#FFF', borderRadius: 20, padding: 30, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 15, textAlign: 'center' },
  modalSub: { marginVertical: 10, color: '#666', textAlign: 'center', fontSize: 15 },
  backBtn: { backgroundColor: '#FF1462', width: '100%', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 20 }
});
