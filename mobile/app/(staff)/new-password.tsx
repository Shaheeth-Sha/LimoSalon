import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AlertModal, { AlertType } from '../../components/AlertModal';
import { BASE_URL } from '../../config/api';

const RESET_API = `${BASE_URL}/api/staff/reset-password`;

const paramStr = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? value[0] || '' : value || '';

export default function NewPassword() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = paramStr(params.email);
  const otp = paramStr(params.otp);

  const [pass, setPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [hidePass, setHidePass] = useState(true);
  const [hideConfirm, setHideConfirm] = useState(true);
  const [saving, setSaving] = useState(false);

  const [alert, setAlert] = useState<{ visible: boolean; type: AlertType; title: string; message: string }>({
    visible: false,
    type: 'error',
    title: '',
    message: '',
  });

  const showAlert = (type: AlertType, title: string, message: string) =>
    setAlert({ visible: true, type, title, message });

  const closeAlert = () => setAlert((prev) => ({ ...prev, visible: false }));

  const passwordsMatch = confirmPass.length > 0 && pass === confirmPass;
  const showMismatch = confirmPass.length > 0 && !passwordsMatch;

  const handleReset = async () => {
    if (saving) return;

    if (!email || !otp) {
      showAlert('error', 'Session Expired', 'Please start over from the Forgot Password screen.');
      return;
    }

    if (!pass || !confirmPass) {
      showAlert('error', 'Missing Information', 'Please fill in both password fields.');
      return;
    }

    if (pass.length < 6) {
      showAlert('error', 'Weak Password', 'Password must be at least 6 characters.');
      return;
    }

    if (!passwordsMatch) {
      showAlert('error', "Passwords Don't Match", 'Please make sure both passwords match.');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(RESET_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword: pass }),
      });

      const data = await res.json();

      if (!res.ok) {
        showAlert('error', 'Reset Failed', data.message || 'Please request a new code and try again.');
        return;
      }

      router.replace('/reset-success');
    } catch (error: any) {
      showAlert('error', 'Something Went Wrong', String(error?.message || error));
    } finally {
      setSaving(false);
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
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reset Password</Text>
          <View style={styles.headerSpacer} />
        </View>

        <Text style={styles.subheading}>Create a new password for your account</Text>

        <View style={styles.form}>
          <View style={styles.passwordBox}>
            <Feather name="lock" size={16} color="#999" style={styles.leftIcon} />
            <TextInput
              style={styles.passwordInput}
              secureTextEntry={hidePass}
              value={pass}
              onChangeText={setPass}
              placeholder="New Password"
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
            />
            <TouchableOpacity
              onPress={() => setHidePass(!hidePass)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name={hidePass ? 'eye-off' : 'eye'} size={18} color="#999" />
            </TouchableOpacity>
          </View>

          <Text style={styles.hintText}>At least 6 characters</Text>

          <View style={[styles.passwordBox, showMismatch && styles.passwordBoxError]}>
            <Feather name="lock" size={16} color="#999" style={styles.leftIcon} />
            <TextInput
              style={styles.passwordInput}
              secureTextEntry={hideConfirm}
              value={confirmPass}
              onChangeText={setConfirmPass}
              placeholder="Confirm Password"
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
            />
            <TouchableOpacity
              onPress={() => setHideConfirm(!hideConfirm)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name={hideConfirm ? 'eye-off' : 'eye'} size={18} color="#999" />
            </TouchableOpacity>
          </View>

          {showMismatch && (
            <View style={styles.mismatchRow}>
              <Feather name="x" size={13} color="#FF1462" />
              <Text style={styles.mismatchText}>Passwords do not match</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, saving && styles.buttonDisabled]}
            onPress={handleReset}
            activeOpacity={0.8}
            disabled={saving}
          >
            <Text style={styles.buttonText}>{saving ? 'Resetting...' : 'Reset Password'}</Text>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
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
  subheading: {
    fontSize: 13,
    color: '#777',
    marginBottom: 28,
  },
  form: {
    width: '100%',
  },
  passwordBox: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordBoxError: {
    borderWidth: 1,
    borderColor: '#FF1462',
  },
  leftIcon: {
    marginRight: 10,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 14,
  },
  hintText: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
    marginBottom: 16,
  },
  mismatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  mismatchText: {
    fontSize: 12,
    color: '#FF1462',
  },
  button: {
    width: '100%',
    backgroundColor: '#FF1462',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
