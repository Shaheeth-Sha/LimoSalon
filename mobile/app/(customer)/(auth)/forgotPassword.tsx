import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
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

      // Move to the "check your email" screen regardless of whether the
      // account exists — matches the backend's privacy-safe response.
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
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.heading}>Forgot Password</Text>
        <Text style={styles.subheading}>Enter your registered email</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            placeholder=""
            style={styles.input}
            value={email}
            onChangeText={(text) => setEmail(text.toLowerCase())}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />

          <TouchableOpacity
            style={[styles.sendBtn, loading && styles.sendBtnDisabled]}
            onPress={handleSendResetLink}
            activeOpacity={0.8}
            disabled={loading}
          >
            <Text style={styles.sendText}>{loading ? "Sending..." : "Send Reset link"}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eee' },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  heading: { fontSize: 22, fontWeight: 'bold', color: '#111', textAlign: 'center' },
  subheading: { fontSize: 13, color: '#777', textAlign: 'center', marginTop: 8, marginBottom: 32 },
  form: { width: '100%' },
  label: { fontSize: 13, color: '#333', marginBottom: 8 },
  input: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 14,
    marginBottom: 24,
  },
  sendBtn: {
    width: '100%',
    backgroundColor: '#FF2D75',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.6 },
  sendText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  backToLogin: { textAlign: 'center', marginTop: 20, fontSize: 13, color: '#111' },
});