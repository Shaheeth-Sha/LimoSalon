import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AlertModal, { AlertType } from '../../components/AlertModal';
import { BASE_URL } from '../../config/api';

const LOGIN_API = `${BASE_URL}/api/staff/login`;

export default function Index() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [alert, setAlert] = useState<{ visible: boolean; type: AlertType; title: string; message: string }>({
    visible: false,
    type: 'error',
    title: '',
    message: '',
  });

  const showAlert = (type: AlertType, title: string, message: string) =>
    setAlert({ visible: true, type, title, message });

  const closeAlert = () => setAlert((prev) => ({ ...prev, visible: false }));

  const handleLogin = async () => {
    if (loading) return;

    if (!email.trim() || !password) {
      showAlert('error', 'Missing Details', 'Please enter both your email and password.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(LOGIN_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // A 503 here means the backend itself couldn't reach the
        // database (see the readyState guard in loginStaff) — worth a
        // distinct title so this never reads like a typed-in mistake.
        showAlert(
          'error',
          res.status === 503 ? 'Connection Issue' : 'Login Failed',
          data.message || 'Invalid email or password'
        );
        return;
      }

      await AsyncStorage.setItem('staffToken', data.token);
      await AsyncStorage.setItem('staffData', JSON.stringify(data.staff));

      router.replace('/home');
    } catch (error: any) {
      showAlert('error', 'Something Went Wrong', String(error?.message || error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.outer} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>

          {/* Logo Row */}
          <View style={styles.logoRow}>
            <Image source={require('../../assets/staff-img/logo.png')} style={styles.logo} />
            <Text style={styles.logoText}>LIMO{"\n"}SALON</Text>
          </View>

          <Text style={styles.heading}>Staff Login</Text>
          <Text style={styles.subheading}>Welcome back to the portal</Text>

          <View style={styles.form}>
            <TextInput
              placeholder="Email"
              placeholderTextColor="#999"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />

            <View style={styles.passwordBox}>
              <TextInput
                placeholder="Password"
                placeholderTextColor="#999"
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!passwordVisible}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
              />
              <TouchableOpacity
                onPress={() => setPasswordVisible(!passwordVisible)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name={passwordVisible ? 'eye' : 'eye-off'} size={18} color="#999" />
              </TouchableOpacity>
            </View>

            <Text style={styles.forgot} onPress={() => router.push('/forgot')}>
              Forgot password?
            </Text>

            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              activeOpacity={0.8}
              disabled={loading}
            >
              <Text style={styles.loginText}>{loading ? 'Logging In...' : 'Log In'}</Text>
            </TouchableOpacity>

            <Text style={styles.helpText}>
              Having trouble logging in?{'\n'}Contact your salon administrator.
            </Text>
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Flat, curve-free layout — mirrors the customer app's login.tsx
// structure (container / rounded card / logo row / form) so the two
// apps feel like siblings, just with the staff portal's own accent
// color (#FF1462 vs the customer app's #FF2D75) instead of decorative
// pink curve shapes that fought with the keyboard.
const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  card: {
    width: '100%',
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
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
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111',
    marginTop: 8,
    textAlign: 'center',
  },
  subheading: {
    fontSize: 13,
    color: '#777',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 24,
  },
  form: {
    width: '100%',
  },
  input: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 14,
    marginBottom: 16,
  },
  passwordBox: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 14,
  },
  forgot: {
    alignSelf: 'flex-end',
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#FF1462',
  },
  loginBtn: {
    width: '100%',
    backgroundColor: '#FF1462',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  helpText: {
    fontSize: 12,
    color: '#A0A0A0',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 24,
  },
});
