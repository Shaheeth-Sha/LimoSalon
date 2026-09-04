import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ScrollView, Platform, ActivityIndicator, Linking } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AlertModal, { AlertType } from '../../components/AlertModal';
import Avatar from '../../components/Avatar';
import { BASE_URL } from '../../config/api';

const STATUS_API = (bookingId: string) => `${BASE_URL}/api/staff/bookings/${bookingId}/status`;
const BOOKING_API = (bookingId: string) => `${BASE_URL}/api/staff/bookings/${bookingId}`;

type FullBooking = {
  _id: string;
  customer?: { name?: string; email?: string; phone?: string; avatar?: string };
  services: { name: string; price: number; duration?: number }[];
  hairLength?: { name?: string; extraPrice?: number };
  selectedDate: string;
  selectedTime: string;
  estimatedDuration?: number;
  totalAmount: number;
  originalAmount?: number | null;
  discountAmount?: number;
  couponCode?: string | null;
  paymentOption: string;
  paymentMethod: string;
  advancePercentage?: number;
  advancePayment?: number;
  amountPaid: number;
  balancePayment: number;
  paymentStatus: string;
  transactionReference?: string;
  status: string;
  notes?: string;
  wantsTrialMakeup?: boolean;
  trialMakeupDate?: string;
  trialMakeupTime?: string;
};

const formatMoney = (amount: number) =>
  `LKR ${(Number(amount) || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;

const paymentStatusColor = (status?: string) => {
  if (status === 'Paid') return '#1E8A3C';
  if (status === 'Partially Paid') return '#9A5A00';
  if (status === 'Refunded') return '#8A6D1F';
  if (status === 'Failed') return '#C13333';
  return '#555555';
};

const getPaymentTypeText = (booking: FullBooking) => {
  if (booking.paymentOption === 'advance') {
    return booking.advancePercentage ? `${booking.advancePercentage}% Advance` : 'Advance Payment';
  }
  if (booking.paymentOption === 'full') return 'Full Payment';
  if (booking.paymentOption === 'salon') return 'Pay at Salon';
  return '-';
};

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

  // Fixed: this screen used to show only whatever a handful of route
  // params happened to carry (name/service/date/time/status) — no
  // price, no payment status, no contact info, no notes. That meant
  // staff were confirming or declining brand new requests, or looking
  // at a past appointment, completely blind to the money and any
  // special instructions involved. Now it fetches the real booking by
  // ID as its own authoritative source, the same way a real
  // production app's detail screen would, instead of trusting every
  // list screen to keep forwarding a complete, consistent param set.
  const [booking, setBooking] = useState<FullBooking | null>(null);
  const [bookingLoading, setBookingLoading] = useState(true);
  const [bookingLoadError, setBookingLoadError] = useState('');

  useEffect(() => {
    const loadBooking = async () => {
      if (!bookingId) {
        setBookingLoading(false);
        return;
      }

      try {
        setBookingLoading(true);
        setBookingLoadError('');

        const token = await AsyncStorage.getItem('staffToken');

        const res = await fetch(BOOKING_API(bookingId), {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || 'Unable to load this appointment');
        }

        setBooking(data.booking);
        // The fetched record is authoritative — a list screen's status
        // param can be stale if this booking changed elsewhere since
        // that list last loaded.
        setStatus(data.booking.status);
      } catch (error: any) {
        setBookingLoadError(String(error?.message || 'Unable to load this appointment'));
      } finally {
        setBookingLoading(false);
      }
    };

    loadBooking();
  }, [bookingId]);

  // Fixed: every date/time-based rule below (whether "Mark completed"
  // is enabled yet, whether the no-show window has elapsed, whether
  // cancelling is still allowed) used to be computed purely from the
  // route params a list screen happened to pass in. If the customer
  // rescheduled this booking to a different date/time after that list
  // last loaded, this screen would silently keep evaluating every rule
  // against the OLD time — potentially leaving "Mark completed"
  // disabled (or wrongly enabled) for the wrong moment entirely. Now
  // that the booking is fetched fresh, its real selectedDate/
  // selectedTime/estimatedDuration take over the instant they load;
  // the route params are only a same-render fallback so the screen
  // isn't blank for the brief moment before the fetch resolves.
  const effectiveDate = booking?.selectedDate || rawDate;
  const effectiveTime = booking?.selectedTime || rawTime;
  const effectiveDuration = booking?.estimatedDuration || estimatedDuration;

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

  const bookingDateTime = parseBookingDateTime(effectiveDate, effectiveTime);
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
  const durationMinutes = effectiveDuration > 0 ? effectiveDuration : 60;
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

      if (nextStatus === 'Confirmed') {
        router.replace('/appointment-confirm');
      } else if (nextStatus === 'Completed') {
        router.replace('/completed');
      } else if (nextStatus === 'No-show') {
        // No-show deliberately never refunds (see refundBookingPayment's
        // own comment) — telling no-show-recorded.tsx whether this
        // booking actually had money on it lets it say so explicitly,
        // instead of staff having to remember the policy themselves
        // when a customer later asks about their deposit.
        router.replace({
          pathname: '/no-show-recorded',
          params: { hadPayment: String((booking?.amountPaid || 0) > 0) },
        });
      } else {
        // Cancelling can trigger a real Stripe refund on the backend
        // (refundBookingPayment in bookingController.js) if this
        // booking was actually paid for online — pass the result along
        // so cancel-success.tsx can tell staff whether the customer's
        // money already went back automatically or nothing was owed.
        router.replace({
          pathname: '/cancel-success',
          params: {
            refunded: String(Boolean(data.refund?.refunded)),
            refundAmount: String(data.refund?.amount || ''),
          },
        });
      }
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
      params: { bookingId, customerName, service, date: effectiveDate, time: effectiveTime, fromStatus: status },
    });
  };

  const customerPhone = booking?.customer?.phone || '';
  const customerEmail = booking?.customer?.email || '';

  const handleCallCustomer = () => {
    if (!customerPhone) return;
    Linking.openURL(`tel:${customerPhone}`);
  };

  const handleTextCustomer = () => {
    if (!customerPhone) return;
    Linking.openURL(`sms:${customerPhone}`);
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
            <Text style={styles.valueFont}>{formatDisplayDate(effectiveDate)}</Text>
          </View>
          <View style={styles.rowDivider} />

          {/* Time Row */}
          <View style={styles.detailRow}>
            <Text style={styles.labelFont}>Time</Text>
            <Text style={styles.valueFont}>{formatDisplayTime(effectiveTime)}</Text>
          </View>
          <View style={styles.rowDivider} />

          {/* Status Row */}
          <View style={styles.detailRow}>
            <Text style={styles.labelFont}>Status</Text>
            <Text style={styles.valueFont}>{status}</Text>
          </View>
          <View style={styles.rowDivider} />

          {bookingLoading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#FF1462" />
              <Text style={styles.loadingText}>Loading payment & contact details...</Text>
            </View>
          )}

          {!bookingLoading && bookingLoadError && (
            <Text style={styles.noticeText}>{bookingLoadError}</Text>
          )}

          {!bookingLoading && booking && (
            <>
              {/* Contact — so staff can actually reach the customer
                  about this specific appointment without having to dig
                  through a separate customer-profile screen first. */}
              {(customerPhone || customerEmail) && (
                <>
                  {customerPhone ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.labelFont}>Phone</Text>
                      <View style={styles.contactActions}>
                        <Text style={styles.valueFont}>{customerPhone}</Text>
                        <TouchableOpacity onPress={handleCallCustomer} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.iconBtn}>
                          <Feather name="phone-call" size={16} color="#FF1462" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleTextCustomer} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.iconBtn}>
                          <Feather name="message-square" size={16} color="#FF1462" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : null}
                  {customerEmail ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.labelFont}>Email</Text>
                      <Text style={styles.valueFont} numberOfLines={1}>{customerEmail}</Text>
                    </View>
                  ) : null}
                  <View style={styles.rowDivider} />
                </>
              )}

              {/* Services breakdown — a Confirm/Decline decision (or
                  just checking on a past job) deserves to know what was
                  actually booked and its price, not just a joined
                  string of names. */}
              {(booking.services || []).map((svc, index) => (
                <View style={styles.detailRow} key={index}>
                  <Text style={styles.labelFont} numberOfLines={1}>{svc.name}</Text>
                  <Text style={styles.valueFont}>{formatMoney(svc.price)}</Text>
                </View>
              ))}
              {booking.hairLength?.name ? (
                <View style={styles.detailRow}>
                  <Text style={styles.labelFont}>Hair Length</Text>
                  <Text style={styles.valueFont}>
                    {booking.hairLength.name}
                    {booking.hairLength.extraPrice ? ` (+${formatMoney(booking.hairLength.extraPrice)})` : ''}
                  </Text>
                </View>
              ) : null}
              <View style={styles.rowDivider} />

              {/* Pricing & payment — the actual gap this fix closes:
                  staff used to have no idea what a booking was worth or
                  whether it had already been paid for before deciding
                  whether to confirm or decline it. */}
              {!!booking.discountAmount && booking.discountAmount > 0 && (
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.labelFont}>Original Amount</Text>
                    <Text style={styles.valueFont}>
                      {formatMoney(booking.originalAmount ?? booking.totalAmount + booking.discountAmount)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.labelFont}>
                      Coupon{booking.couponCode ? ` (${booking.couponCode})` : ''}
                    </Text>
                    <Text style={[styles.valueFont, { color: '#1E8A3C' }]}>
                      -{formatMoney(booking.discountAmount)}
                    </Text>
                  </View>
                </>
              )}
              <View style={styles.detailRow}>
                <Text style={styles.labelFont}>Total</Text>
                <Text style={styles.valueFont}>{formatMoney(booking.totalAmount)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.labelFont}>Payment Type</Text>
                <Text style={styles.valueFont}>{getPaymentTypeText(booking)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.labelFont}>Pay Via</Text>
                <Text style={styles.valueFont}>{booking.paymentMethod || '-'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.labelFont}>Amount Paid</Text>
                <Text style={styles.valueFont}>{formatMoney(booking.amountPaid)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.labelFont}>Balance</Text>
                <Text style={styles.valueFont}>{formatMoney(booking.balancePayment)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.labelFont}>Payment Status</Text>
                <Text style={[styles.valueFont, { color: paymentStatusColor(booking.paymentStatus) }]}>
                  {booking.paymentStatus}
                </Text>
              </View>
              {booking.transactionReference ? (
                <View style={styles.detailRow}>
                  <Text style={styles.labelFont}>Reference</Text>
                  <Text style={styles.valueFont} numberOfLines={1}>{booking.transactionReference}</Text>
                </View>
              ) : null}
              <View style={styles.rowDivider} />

              {/* Bridal trial makeup add-on, when this booking has one */}
              {booking.wantsTrialMakeup ? (
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.labelFont}>Trial Makeup</Text>
                    <Text style={styles.valueFont}>
                      {formatDisplayDate(booking.trialMakeupDate || '')} at{' '}
                      {formatDisplayTime(booking.trialMakeupTime || '')}
                    </Text>
                  </View>
                  <View style={styles.rowDivider} />
                </>
              ) : null}

              {/* Special requests / notes the customer left at checkout */}
              {booking.notes ? (
                <>
                  <Text style={styles.labelFont}>Notes</Text>
                  <Text style={styles.notesText}>{booking.notes}</Text>
                  <View style={styles.rowDivider} />
                </>
              ) : null}
            </>
          )}

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
                {formatDisplayTime(effectiveTime)} on {formatDisplayDate(effectiveDate)}. You can mark it
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
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: '#888888',
  },
  contactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFE1EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesText: {
    fontSize: 15,
    color: '#333333',
    lineHeight: 21,
    marginTop: 8,
    marginBottom: 12,
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
