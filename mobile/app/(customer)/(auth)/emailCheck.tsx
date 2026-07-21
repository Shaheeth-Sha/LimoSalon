import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import AlertModal, { AlertType } from '../../../components/AlertModal';

const API_URL = "https://limosalon.onrender.com/api/customers/forgot-password";

export default function EmailCheck() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [resending, setResending] = useState(false);

  const [alert, setAlert] = useState<{ visible: boolean; type: AlertType; title: string; message: string }>({
    visible: false,
    type: "success",
    title: "",
    message: "",
  });

  const showAlert = (type: AlertType, title: string, message: string) =>
    setAlert({ visible: true, type, title, message });

  const closeAlert = () => setAlert((prev) => ({ ...prev, visible: false }));

  const handleResend = async () => {
    if (!email || resending) return;
    setResending(true);
    try {
      await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      showAlert("success", "Email Sent", "A new reset link has been sent to your email.");
    } catch (error: any) {
      showAlert("error", "Something Went Wrong", String(error?.message || error));
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Feather name="check" size={40} color="#111" />
        </View>

        <Text style={styles.heading}>Check your email</Text>
        <Text style={styles.subheading}>
          A reset link has been sent to{"\n"}{email || "your email"}
        </Text>

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace('/(customer)/(auth)/login')}
          activeOpacity={0.8}
        >
          <Text style={styles.backText}>Back to Login</Text>
        </TouchableOpacity>

        <Text style={styles.resend} onPress={handleResend}>
          {resending ? "Resending..." : "Didn't get the email? Resend"}
        </Text>
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
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1.5,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  heading: { fontSize: 20, fontWeight: 'bold', color: '#111', textAlign: 'center' },
  subheading: { fontSize: 13, color: '#777', textAlign: 'center', marginTop: 8, marginBottom: 32, lineHeight: 19 },
  backBtn: {
    width: '100%',
    backgroundColor: '#FF2D75',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  resend: { marginTop: 20, fontSize: 13, color: '#FF2D75', fontWeight: '600' },
});