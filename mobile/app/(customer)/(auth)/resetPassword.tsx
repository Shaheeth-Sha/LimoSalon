import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import AlertModal, { AlertType } from '../../../components/AlertModal';
import { BASE_URL } from '../../../config/api';

const API_URL = `${BASE_URL}/api/customers/reset-password`;

export default function ResetPassword() {
  const { token, email } = useLocalSearchParams<{ token: string; email: string }>();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  // Same three rules as the register screen, so requirements are consistent
  // everywhere a password is created in the app.
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const meetsRequirements = hasMinLength && hasUppercase && hasNumber;

  const confirmTouched = confirmPassword.length > 0;
  const passwordsMatch = confirmTouched && newPassword === confirmPassword;
  const showMismatch = confirmTouched && !passwordsMatch;

  const handleReset = async () => {
    if (!token || !email) {
      showAlert("error", "Invalid Link", "This reset link is invalid or has expired. Please request a new one.");
      return;
    }
    if (!newPassword || !confirmPassword) {
      showAlert("error", "Missing Information", "Please fill in both password fields");
      return;
    }
    if (!meetsRequirements) {
      showAlert("error", "Weak Password", "Password must be at least 8 characters, with an uppercase letter and a number");
      return;
    }
    if (!passwordsMatch) {
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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.card}>

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backArrow}
            onPress={() => router.replace('/(customer)/(auth)/login')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="chevron-left" size={26} color="#111" />
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
              secureTextEntry={!showNewPassword}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="New Password"
              placeholderTextColor="#999"
            />
            <TouchableOpacity
              onPress={() => setShowNewPassword(!showNewPassword)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name={showNewPassword ? "eye" : "eye-off"} size={18} color="#999" />
            </TouchableOpacity>
          </View>

          <View style={styles.requirements}>
            <Text style={styles.requirementsHeading}>Password must include:</Text>
            <View style={styles.requirementRow}>
              <Feather
                name={hasMinLength ? "check" : "x"}
                size={13}
                color={hasMinLength ? "#2ECC71" : "#bbb"}
              />
              <Text style={[styles.requirementText, hasMinLength && styles.requirementTextMet]}>
                8 or more characters
              </Text>
            </View>
            <View style={styles.requirementRow}>
              <Feather
                name={hasUppercase ? "check" : "x"}
                size={13}
                color={hasUppercase ? "#2ECC71" : "#bbb"}
              />
              <Text style={[styles.requirementText, hasUppercase && styles.requirementTextMet]}>
                One uppercase letter
              </Text>
            </View>
            <View style={styles.requirementRow}>
              <Feather
                name={hasNumber ? "check" : "x"}
                size={13}
                color={hasNumber ? "#2ECC71" : "#bbb"}
              />
              <Text style={[styles.requirementText, hasNumber && styles.requirementTextMet]}>
                One number
              </Text>
            </View>
          </View>

          <View style={[styles.passwordBox, showMismatch && styles.passwordBoxError]}>
            <Feather name="lock" size={16} color="#999" style={styles.leftIcon} />
            <TextInput
              style={styles.passwordInput}
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm Password"
              placeholderTextColor="#999"
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name={showConfirmPassword ? "eye" : "eye-off"} size={18} color="#999" />
            </TouchableOpacity>
          </View>

          {showMismatch && (
            <View style={styles.mismatchRow}>
              <Feather name="x" size={13} color="#FF2D75" />
              <Text style={styles.mismatchText}>Passwords do not match</Text>
            </View>
          )}

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
    borderWidth: 1,
    borderColor: '#FF2D75',
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  passwordBoxError: {
    borderColor: '#FF2D75',
  },

  leftIcon: {
    marginRight: 10,
  },

  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 14,
  },

  requirements: {
    marginTop: 10,
    marginBottom: 20,
    gap: 4,
  },

  requirementsHeading: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },

  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  requirementText: {
    fontSize: 12,
    color: '#999',
  },

  requirementTextMet: {
    color: '#2ECC71',
  },

  mismatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },

  mismatchText: {
    fontSize: 12,
    color: '#FF2D75',
  },

  resetBtn: {
    width: '100%',
    backgroundColor: '#FF2D75',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },

  resetBtnDisabled: {
    opacity: 0.6,
  },

  resetText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
});