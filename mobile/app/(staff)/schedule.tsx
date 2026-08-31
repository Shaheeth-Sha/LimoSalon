import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AlertModal, { AlertType } from '../../components/AlertModal';
import Avatar from '../../components/Avatar';
import { BASE_URL } from '../../config/api';

const STATUS_API = (bookingId: string) => `${BASE_URL}/api/staff/bookings/${bookingId}/status`;

// "10.00 am" -> "10.00 A.M" to match this screen's original design.
const formatDisplayTime = (time: string): string =>
  time ? time.replace(/am$/i, 'A.M').replace(/pm$/i, 'P.M') : '';

const formatDisplayDate = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(`${dateStr}T00:00:00`);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

const paramStr = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? value[0] || '' : value || '';

export default function AppointmentDetails() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const bookingId = paramStr(params.bookingId);
  const customerName = paramStr(params.customerName) || 'Customer';
  const customerAvatar = paramStr(params.customerAvatar);
  const service = paramStr(params.service) || 'Service';
  const rawDate = paramStr(params.date);
  const rawTime = paramStr(params.time);
  const estimatedDuration = Number(paramStr(params.estimatedDuration)) || 0;
  const [status, setStatus] = useState(paramStr(params.status) || 'Pending');
  const [updating, setUpdating] = useState<'Confirmed' | 'Completed' | 'Cancelled' | 'No-show' | null>(null);

  const [alert, setAlert] = useState<{ visible: boolean; type: AlertType; title: string; message: string }>({
    visible: false,
    type: 'error',
    title: '',
    message: '',
  });

  const showAlert = (type: AlertType, title: string, message: string) =>
    setAlert({ visible: true, type, title, message });

  const closeAlert = () => setAlert((prev) => ({ ...prev, visible: false }));

  const isPending = status === 'Pending';
  const isCancelled = status === 'Cancelled';
  const isCompleted = status === 'Completed';
  const isNoShow = status === 'No-show';
  const actionsDisabled = isCancelled || isCompleted || isNoShow || Boolean(updating);

  // Real-world flow: a booking can't be completed before it's even
  // been confirmed, and a confirmed one can't be completed before its
  // actual scheduled time arrives — not even earlier the same day (a
  // 5pm appointment can't be marked done at 4pm). Same rule the
  // backend enforces in updateBookingStatus; this is just the
  // proactive UI hint so staff don't tap and get an error every time.
  // "am"/"pm" times only, matching every other time field this app
  // stores (selectedTime).
  const parseBookingDateTime = (dateStr: string, timeStr: string): Date | null => {
    const dateMatch = (dateStr || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const timeMatch = (timeStr || '').match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
    if (!dateMatch || !timeMatch) return null;
    const [, year, month, day] = dateMatch;
    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const period = timeMatch[3].toLowerCase();
    if (period === 'am' && hours === 12) hours = 0;
    if (period === 'pm' && hours !== 12) hours += 12;
    return new Date(Number(year), Number(month) - 1, Number(day), hours, minutes, 0, 0);
  };

  const bookingDateTime = parseBookingDateTime(rawDate, rawTime);
  const notStartedYet = Boolean(bookingDateTime) && bookingDateTime!.getTime() > Date.now();
  const hasStarted = Boolean(bookingDateTime) && bookingDateTime!.getTime() <= Date.now();
  const completeDisabled = actionsDisabled || isPending || notStartedYet;

  // Real-world flow (matches the backend guard in updateBookingStatus):
  // cancelling only makes sense before the appointment's scheduled
  // time actually arrives — a Pending request can still be declined
  // any time (declining a stale unconfirmed request is always
  // meaningful), but a Confirmed booking can't be "cancelled" once its
  // time has already passed. From that point the only honest outcomes
  // are Completed or No-show.
  const cancelDisabled = actionsDisabled || (!isPending && hasStarted);

  // The customer gets their full scheduled window (start + duration)
  // to show up before staff can mark them a no-show — same rule the
  // backend enforces. Falls back to a 60-minute window when this
  // booking has no estimatedDuration on record.
  const durationMinutes = estimatedDuration > 0 ? estimatedDuration : 60;
  const bookingEndDateTime = bookingDateTime
    ? new Date(bookingDateTime.getTime() + durationMinutes * 60 * 1000)
    : null;
  const windowEnded = Boolean(bookingEndDateTime) && bookingEndDateTime!.getTime() <= Date.now();
  const noShowDisabled = actionsDisabled || isPending || !windowEnded;

  const updateStatus = async (nextStatus: 'Confirmed' | 'Completed' | 'Cancelled' | 'No-show') => {
    if (!bookingId) {
      showAlert('error', 'Missing Appointment', 'This appointment could not be identified.');
      return;
    }

    setUpdating(nextStatus);

    try {
      const token = await AsyncStorage.getItem('staffToken');

      const res = await fetch(STATUS_API(bookingId), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await res.json();

      if (!res.ok) {
        showAlert('error', 'Update Failed', data.message || 'Unable to update this appointment');
        return;
      }

      setStatus(nextStatus);
      router.replace(
        nextStatus === 'Confirmed'
          ? '/appointment-confirm'
          : nextStatus === 'Completed'
          ? '/completed'
          : nextStatus === 'No-show'
          ? '/no-show-recorded'
          : '/cancel-success'
      );
    } catch (error: any) {
      showAlert('error', 'Something Went Wrong', String(error?.message || error));
    } finally {
      setUpdating(null);
    }
  };

  const goToCancelConfirm = () => {
    if (!bookingId) {
      showAlert('error', 'Missing Appointment', 'This appointment could not be identified.');
      return;
    }

    router.push({
      pathname: '/cancel-confirm',
      // fromStatus lets cancel-confirm.tsx tell "declining a request
      // that was never accepted" apart from "cancelling an already-
      // confirmed appointment" — different enough situations that
      // they deserve different wording.
      params: { bookingId, customerName, service, date: rawDate, time: rawTime, fromStatus: status },
    });
  };

  return (
    <View style={styles.mainContainer}>
      {/* Back Button Section */}
      <View style={styles.headerSection}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 20 }}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color="#000" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>

        {/* Top Banner Image */}
        <View style={styles.imageContainer}>
          <Image
            source={require('../../assets/staff-img/pendingUi.png')}
            style={styles.bannerImage}
            resizeMode="cover"
          />
        </View>

        {/* Content Container */}
        <View style={styles.contentContainer}>
          <Text style={styles.screenTitle}>Appointment Details</Text>

          <View style={styles.customerHeader}>
            <Avatar
              uri={customerAvatar}
              name={customerName}
              size={56}
              fallbackColor="#FFE1EC"
              textStyle={{ color: '#FF1462' }}
            />
            <Text style={styles.customerHeaderName} numberOfLines={1}>{customerName}</Text>
          </View>

          {!bookingId && (
            <Text style={styles.noticeText}>
              This appointment couldn't be loaded — go back and open it from your schedule again.
            </Text>
          )}

          {/* Customer Row */}
          <View style={styles.detailRow}>
            <Text style={styles.labelFont}>Customer</Text>
            <Text style={styles.valueFont}>{customerName}</Text>
          </View>
          <View style={styles.rowDivider} />

          {/* Service Row */}
          <View style={styles.detailRow}>
            <Text style={styles.labelFont}>Service</Text>
            <Text style={styles.valueFont}>{service}</Text>
          </View>
          <View style={styles.rowDivider} />

          {/* Date Row */}
          <View style={styles.detailRow}>
            <Text style={styles.labelFont}>Date</Text>
            <Text style={styles.valueFont}>{formatDisplayDate(rawDate)}</Text>
          </View>
          <View style={styles.rowDivider} />

          {/* Time Row */}
          <View style={styles.detailRow}>
            <Text style={styles.labelFont}>Time</Text>
            <Text style={styles.valueFont}>{formatDisplayTime(rawTime)}</Text>
          </View>
          <View style={styles.rowDivider} />

          {/* Status Row */}
          <View style={styles.detailRow}>
            <Text style={styles.labelFont}>Status</Text>
            <Text style={styles.valueFont}>{status}</Text>
          </View>
          <View style={styles.rowDivider} />

          {/* Action Buttons */}
          <View style={styles.buttonGroup}>
            {actionsDisabled && (
              <Text style={styles.noticeText}>
                {isCancelled
                  ? 'This appointment has been cancelled.'
                  : isCompleted
                  ? 'This appointment has already been marked completed.'
                  : isNoShow
                  ? 'This appointment was marked as a no-show.'
                  : ''}
              </Text>
            )}

            {!actionsDisabled && isPending && (
              <Text style={styles.noticeText}>
                This is a new booking request. Confirm it to accept the appointment, or cancel to
                decline it.
              </Text>
            )}

            {!actionsDisabled && !isPending && notStartedYet && (
              <Text style={styles.noticeText}>
                This appointment hasn't started yet — it's scheduled for{' '}
                {formatDisplayTime(rawTime)} on {formatDisplayDate(rawDate)}. You can mark it
                completed once that time arrives. Cancelling is only possible before then.
              </Text>
            )}

            {!actionsDisabled && !isPending && hasStarted && !windowEnded && (
              <Text style={styles.noticeText}>
                This appointment is in progress and can no longer be cancelled — mark it completed
                once the service is done, or wait until the scheduled window ends to mark the
                customer as a no-show.
              </Text>
            )}

            {!actionsDisabled && !isPending && windowEnded && (
              <Text style={styles.noticeText}>
                This appointment's scheduled window has ended. Mark it completed if the customer
                came in, or as a no-show if they never arrived.
              </Text>
            )}

            {/* Confirm — only while the booking is still Pending */}
            {!actionsDisabled && isPending && (
              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.8}
                disabled={Boolean(updating)}
                onPress={() => updateStatus('Confirmed')}
              >
                <Text style={styles.buttonText}>
                  {updating === 'Confirmed' ? 'Confirming...' : 'Confirm Booking'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Mark as completed — only once the booking is Confirmed */}
            {!isPending && (
              <TouchableOpacity
                style={[styles.primaryButton, completeDisabled && styles.disabledButton]}
                activeOpacity={0.8}
                disabled={completeDisabled}
                onPress={() => updateStatus('Completed')}
              >
                <Text style={styles.buttonText}>
                  {updating === 'Completed' ? 'Updating...' : 'Mark as completed'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Mark as no-show — only once Confirmed AND the full
                scheduled window has elapsed with nothing recorded */}
            {!isPending && (
              <TouchableOpacity
                style={[styles.secondaryButton, noShowDisabled && styles.disabledButton]}
                activeOpacity={0.8}
                disabled={noShowDisabled}
                onPress={() => updateStatus('No-show')}
              >
                <Text style={styles.secondaryButtonText}>
                  {updating === 'No-show' ? 'Updating...' : 'Mark as No-show'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Cancel — available from Pending any time, or from
                Confirmed only before the appointment's time arrives */}
            <TouchableOpacity
              style={[styles.primaryButton, cancelDisabled && styles.disabledButton]}
              activeOpacity={0.8}
              disabled={cancelDisabled}
              onPress={goToCancelConfirm}
            >
              <Text style={styles.buttonText}>{isPending ? 'Decline' : 'Cancel'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <AlertModal
        visible={alert.visible}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        onClose={closeAlert}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerSection: {
    width: '100%',
    paddingTop: 60,
    paddingBottom: 10,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: 18,
    color: '#000000',
    fontWeight: '600',
    marginLeft: 5,
  },
  scrollContainer: {
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    height: 250,
    backgroundColor: '#FDE4E4',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    paddingHorizontal: 25,
    paddingTop: 25,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 20,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  noticeText: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 15,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  customerHeaderName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginLeft: 12,
    flexShrink: 1,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 10,
  },
  labelFont: {
    fontSize: 18,
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontWeight: '500',
  },
  valueFont: {
    fontSize: 18,
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontWeight: '500',
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 10,
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#CCCCCC',
    width: '100%',
  },
  buttonGroup: {
    marginTop: 45,
    marginBottom: 40,
  },
  primaryButton: {
    backgroundColor: '#FF1462',
    borderRadius: 8,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#FF1462',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#B9791F',
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  secondaryButtonText: {
    color: '#B9791F',
    fontSize: 18,
    fontWeight: '600',
  },
});
