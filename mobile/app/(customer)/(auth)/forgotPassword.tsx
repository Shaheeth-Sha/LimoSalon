import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AlertModal, { AlertType } from '../../../components/AlertModal';

const API_URL = "http://10.0.2.2:5000/api/customers/forgot-password";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const [alert, setAlert] = useState<{ visible: boolean; type: AlertType; title: string; message: string }>({
    visible: false,
    type: "error",
    title: "",
    message: "",
  });

  const showAlert = (type: AlertType, title: string, message: string) =>
    setAlert({ visible: true, type, title, message });

  const closeAlert = () => setAlert((prev) => ({ ...prev, visible: false }));

  // Pre-fill with the last logged-in account's email, if cached locally.
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem("customerData");
        if (stored) {
          const customer = JSON.parse(stored);
          if (customer?.email) setEmail(customer.email);
        }
      } catch {
        // Non-critical — leave field empty if this fails
      }
    })();
  }, []);

  const handleSendResetLink = async () => {
    if (!email) {
      showAlert("error", "Missing Email", "Please enter your registered email");
      return;
    }
    if (loading) return;

    setLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        showAlert("error", "Something Went Wrong", data.message || "Please try again");
        return;
      }

      router.push({
        pathname: '/(customer)/(auth)/emailCheck',
        params: { email: email.toLowerCase().trim() },
      });
    } catch (error: any) {
      showAlert("error", "Something Went Wrong", String(error?.message || error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.card}>

        {/* Header row — chevron + centered title, matches My Bookings style */}
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

        <Text style={styles.subheading}>
          Enter your registered email and we'll send you a reset link
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
            onPress={handleSendResetLink}
            activeOpacity={0.8}
            disabled={loading}
          >
            <Text style={styles.sendText}>{loading ? "Sending..." : "Send Reset Link"}</Text>
          </TouchableOpacity>

          <Text style={styles.backToLogin} onPress={() => router.back()}>
            Back to Login
          </Text>
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

  subheading: {
    fontSize: 13,
    color: '#777',
    lineHeight: 19,
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
    backgroundColor: '#FF2D75',
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

  backToLogin: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 13,
    fontWeight: '600',
    color: '#111',
  },
});