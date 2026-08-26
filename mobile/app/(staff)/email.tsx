import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AlertModal, { AlertType } from '../../components/AlertModal';
import { BASE_URL } from '../../config/api';

const VERIFY_API = `${BASE_URL}/api/staff/verify-reset-otp`;
const FORGOT_API = `${BASE_URL}/api/staff/forgot-password`;

// Matches the backend exactly: forgotStaffPassword sets the OTP's
// expiresAt to 10 minutes out (staffAuthController.js), and a fresh
// code shouldn't be requestable every second — 60s between resends
// is a standard, spam-resistant cooldown.
const CODE_EXPIRY_SECONDS = 10 * 60;
const RESEND_COOLDOWN_SECONDS = 60;

const paramStr = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? value[0] || '' : value || '';

const formatCountdown = (totalSeconds: number): string => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

export default function CheckEmail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = paramStr(params.email);

  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [expirySecondsLeft, setExpirySecondsLeft] = useState(CODE_EXPIRY_SECONDS);
  const [resendSecondsLeft, setResendSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);

  // A code was already sent (by forgot.tsx) the moment this screen is
  // reached, so both countdowns start immediately on mount — not on
  // some later action — and stay in sync with what the backend
  // actually enforces.
  useEffect(() => {
    const interval = setInterval(() => {
      setExpirySecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
      setResendSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const codeExpired = expirySecondsLeft <= 0;
  const canResend = resendSecondsLeft <= 0;

  const [alert, setAlert] = useState<{ visible: boolean; type: AlertType; title: string; message: string }>({
    visible: false,
    type: 'error',
    title: '',
    message: '',
  });

  const showAlert = (type: AlertType, title: string, message: string) =>
    setAlert({ visible: true, type, title, message });

  const closeAlert = () => setAlert((prev) => ({ ...prev, visible: false }));

  const handleVerify = async () => {
    if (verifying) return;

    if (!email) {
      showAlert('error', 'Missing Email', 'Please start over from the Forgot Password screen.');
      return;
    }

    if (codeExpired) {
      showAlert('error', 'Code Expired', 'This code has expired. Request a new one below.');
      return;
    }

    if (!code.trim() || code.trim().length !== 6) {
      showAlert('error', 'Invalid Code', 'Enter the 6-digit code we emailed you.');
      return;
    }

    setVerifying(true);

    try {
      const res = await fetch(VERIFY_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: code.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        showAlert('error', 'Verification Failed', data.message || 'That code is invalid or expired.');
        return;
      }

      router.push({ pathname: '/new-password', params: { email, otp: code.trim() } });
    } catch (error: any) {
      showAlert('error', 'Something Went Wrong', String(error?.message || error));
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resending || !email || !canResend) return;

    setResending(true);

    try {
      const res = await fetch(FORGOT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        showAlert('error', 'Something Went Wrong', data.message || 'Please try again');
        return;
      }

      // A new code invalidates the old one on the backend (forgotStaffPassword
      // deletes the previous record) — reset the typed code and both
      // timers so the UI matches reality.
      setCode('');
      setExpirySecondsLeft(CODE_EXPIRY_SECONDS);
      setResendSecondsLeft(RESEND_COOLDOWN_SECONDS);

      showAlert('success', 'Code Sent', 'A new verification code has been sent to your email.');
    } catch (error: any) {
      showAlert('error', 'Something Went Wrong', String(error?.message || error));
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.card}>

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backArrow}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="chevron-left" size={26} color="#111" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verify Code</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.iconContainer}>
          <Feather name="mail" size={56} color="#FF1462" />
        </View>

        <Text style={styles.subheading}>
          We've sent a 6-digit verification code{'\n'}
          {email ? `to ${email}` : 'to your email'}
        </Text>

        <View style={styles.form}>
          <TextInput
            style={styles.codeInput}
            placeholder="000000"
            placeholderTextColor="#C0C0C0"
            value={code}
            onChangeText={(text) => setCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            textAlign="center"
            editable={!codeExpired}
          />

          <Text style={[styles.expiryText, codeExpired && styles.expiryTextExpired]}>
            {codeExpired
              ? 'This code has expired — request a new one below.'
              : `Code expires in ${formatCountdown(expirySecondsLeft)}`}
          </Text>

          <TouchableOpacity
            style={[styles.button, (verifying || codeExpired) && styles.buttonDisabled]}
            onPress={handleVerify}
            activeOpacity={0.8}
            disabled={verifying || codeExpired}
          >
            <Text style={styles.buttonText}>{verifying ? 'Verifying...' : 'Verify Code'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleResend}
            disabled={resending || !canResend}
            style={styles.resendWrapper}
          >
            <Text style={styles.resendText}>
              {resending
                ? 'Resending...'
                : canResend
                ? "Didn't get a code? Resend"
                : `Resend available in ${formatCountdown(resendSecondsLeft)}`}
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
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 8,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  backArrow: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111',
  },
  headerSpacer: {
    width: 36,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FDE4ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  subheading: {
    fontSize: 13,
    color: '#777',
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 28,
  },
  form: {
    width: '100%',
  },
  codeInput: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 14,
    paddingVertical: 16,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 8,
    color: '#111',
    marginBottom: 10,
  },
  expiryText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  expiryTextExpired: {
    color: '#FF1462',
    fontWeight: '600',
  },
  button: {
    width: '100%',
    backgroundColor: '#FF1462',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  resendWrapper: {
    alignSelf: 'center',
    marginTop: 20,
  },
  resendText: {
    color: '#FF1462',
    fontSize: 13,
    fontWeight: '600',
  },
});
