import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AlertModal, { AlertType } from '../../components/AlertModal';
import { BASE_URL } from '../../config/api';

const STATUS_API = (bookingId: string) => `${BASE_URL}/api/staff/bookings/${bookingId}/status`;

const paramStr = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? value[0] || '' : value || '';

// Redesigned to match the app's own "are you sure?" idiom instead of
// the pink-curve banner treatment: this is the same shape as
// AlertModal.tsx and the customer app's own cancel-confirmation modal
// (bookings.tsx) — a centered white card with a small pastel icon
// circle, title, message, a primary destructive action, and a plain
// secondary "keep it" action underneath. The two outcome screens
// (completed.tsx / cancel-success.tsx) get their own matching
// redesign, but as full-screen "here's what happened" moments rather
// than a decision point, so they keep the bigger ring-icon treatment
// instead of this card shape.
export default function CancelConfirm() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const bookingId = paramStr(params.bookingId);
  const customerName = paramStr(params.customerName) || 'this customer';
  const isDeclining = paramStr(params.fromStatus) === 'Pending';
  const [cancelling, setCancelling] = useState(false);

  const [alert, setAlert] = useState<{ visible: boolean; type: AlertType; title: string; message: string }>({
    visible: false,
    type: 'error',
    title: '',
    message: '',
  });

  const showAlert = (type: AlertType, title: string, message: string) =>
    setAlert({ visible: true, type, title, message });

  const closeAlert = () => setAlert((prev) => ({ ...prev, visible: false }));

  const handleConfirmCancel = async () => {
    if (cancelling) return;

    if (!bookingId) {
      showAlert('error', 'Missing Appointment', 'This appointment could not be identified.');
      return;
    }

    setCancelling(true);

    try {
      const token = await AsyncStorage.getItem('staffToken');

      const res = await fetch(STATUS_API(bookingId), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'Cancelled' }),
      });

      const data = await res.json();

      if (!res.ok) {
        showAlert('error', 'Cancel Failed', data.message || 'Unable to cancel this appointment');
        return;
      }

      router.replace('/cancel-success');
    } catch (error: any) {
      showAlert('error', 'Something Went Wrong', String(error?.message || error));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Feather name="alert-triangle" size={28} color="#C13333" />
          </View>

          <Text style={styles.title}>
            {isDeclining ? 'Decline this booking request?' : 'Cancel this appointment?'}
          </Text>
          <Text style={styles.message}>
            {isDeclining
              ? `This can't be undone. ${customerName} will be notified that the salon couldn't confirm this request.`
              : `This can't be undone. ${customerName} will be notified immediately, and the time slot will open back up for new bookings.`}
          </Text>

          <TouchableOpacity
            style={[styles.primaryButton, cancelling && styles.disabledButton]}
            activeOpacity={0.85}
            onPress={handleConfirmCancel}
            disabled={cancelling}
          >
            <Text style={styles.primaryButtonText}>
              {cancelling
                ? isDeclining
                  ? 'Declining...'
                  : 'Cancelling...'
                : isDeclining
                ? 'Yes, Decline Request'
                : 'Yes, Cancel Appointment'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.7}
            onPress={() => router.back()}
            disabled={cancelling}
          >
            <Text style={styles.secondaryButtonText}>
              {isDeclining ? 'Keep Reviewing' : 'Keep Appointment'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

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
  container: { flex: 1, backgroundColor: '#F5F5F7' },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FBE4E4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#555555',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#FF1462',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  disabledButton: { opacity: 0.6 },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  secondaryButtonText: {
    color: '#777777',
    fontWeight: '600',
    fontSize: 14,
  },
});
