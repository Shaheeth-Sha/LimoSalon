import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AlertModal, { AlertType } from '../../components/AlertModal';
import { BASE_URL } from '../../config/api';

const FORGOT_API = `${BASE_URL}/api/staff/forgot-password`;

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const [alert, setAlert] = useState<{ visible: boolean; type: AlertType; title: string; message: string }>({
    visible: false,
    type: 'error',
    title: '',
    message: '',
  });

  const showAlert = (type: AlertType, title: string, message: string) =>
    setAlert({ visible: true, type, title, message });

  const closeAlert = () => setAlert((prev) => ({ ...prev, visible: false }));

  const handleSendCode = async () => {
    if (loading) return;

    if (!email.trim()) {
      showAlert('error', 'Missing Email', 'Please enter your registered email.');
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      const res = await fetch(FORGOT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        showAlert('error', 'Something Went Wrong', data.message || 'Please try again');
        return;
      }

      router.push({ pathname: '/email', params: { email: normalizedEmail } });
    } catch (error: any) {
      showAlert('error', 'Something Went Wrong', String(error?.message || error));
    } finally {
      setLoading(false);
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
          <Text style={styles.headerTitle}>Forgot Password</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.logoRow}>
          <Image source={require('../../assets/staff-img/logo.png')} style={styles.logo} />
          <Text style={styles.logoText}>LIMO{'\n'}SALON</Text>
        </View>

        <Text style={styles.subheading}>
          Enter your registered email and we'll send you a 6-digit verification code
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={(text) => setEmail(text.toLowerCase())}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor="#999"
          />

          <TouchableOpacity
            style={[styles.sendBtn, loading && styles.sendBtnDisabled]}
            onPress={handleSendCode}
            activeOpacity={0.8}
            disabled={loading}
          >
            <Text style={styles.sendText}>{loading ? 'Sending...' : 'Send Verification Code'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace('/')} style={styles.backToLoginWrapper}>
            <Text style={styles.backToLoginText}>Back to Login</Text>
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
    marginBottom: 32,
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
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 65,
    height: 65,
    marginRight: 10,
  },
  logoText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF1462',
    lineHeight: 22,
  },
  subheading: {
    fontSize: 13,
    color: '#777',
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 32,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 14,
    marginBottom: 28,
  },
  sendBtn: {
    width: '100%',
    backgroundColor: '#FF1462',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
  sendText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  backToLoginWrapper: {
    alignSelf: 'center',
    marginTop: 20,
    padding: 8,
  },
  backToLoginText: {
    color: '#111',
    fontSize: 14,
    fontWeight: '500',
  },
});
