import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import AlertModal, { AlertType } from '../../../components/AlertModal';

const API_URL = "http://10.0.2.2:5000/api/customers/reset-password";

export default function ResetPassword() {
  const { token, email } = useLocalSearchParams<{ token: string; email: string }>();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

  const handleReset = async () => {
    if (!token || !email) {
      showAlert("error", "Invalid Link", "This reset link is invalid or has expired. Please request a new one.");
      return;
    }
    if (!newPassword || !confirmPassword) {
      showAlert("error", "Missing Information", "Please fill in both password fields");
      return;
    }
    if (newPassword.length < 6) {
      showAlert("error", "Weak Password", "Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert("error", "Passwords Don't Match", "Please make sure both passwords match");
      return;
    }
    if (loading) return;

    setLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        showAlert("error", "Reset Failed", data.message || "Please request a new reset link");
        return;
      }

      router.replace('/(customer)/(auth)/passwordResetSuccess');
    } catch (error: any) {
      showAlert("error", "Something Went Wrong", String(error?.message || error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.heading}>Reset Password</Text>

        <View style={styles.form}>
          <Text style={styles.label}>New Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <TouchableOpacity
            style={[styles.resetBtn, loading && styles.resetBtnDisabled]}
            onPress={handleReset}
            activeOpacity={0.8}
            disabled={loading}
          >
            <Text style={styles.resetText}>{loading ? "Resetting..." : "Reset Password"}</Text>
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
  heading: { fontSize: 22, fontWeight: 'bold', color: '#111', textAlign: 'center', marginBottom: 32 },
  form: { width: '100%' },
  label: { fontSize: 13, color: '#333', marginBottom: 8 },
  input: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 14,
    marginBottom: 20,
  },
  resetBtn: {
    width: '100%',
    backgroundColor: '#FF2D75',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  resetBtnDisabled: { opacity: 0.6 },
  resetText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});