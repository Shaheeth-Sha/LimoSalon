import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Modal } from 'react-native';
import { Feather, AntDesign } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signInWithGoogle } from '../../../utils/googleAuth';

// Backend login API
const API_URL = "https://limosalon.onrender.com/api/customers/login";
const GOOGLE_AUTH_URL = "https://limosalon.onrender.com/api/customers/google-auth";
// NOTE: 10.0.2.2 only resolves on the Android emulator. Swap in your
// staging/production URL (or your machine's LAN IP) before demoing on



// Custom in-app alert modal
// Replaces the default OS Alert.alert() popup (which cannot be
// restyled and looks like a generic system dialog) with a modal
// that matches the app's own branding — rounded card, brand color
// icon circle, pill button. Behavior is the same: shows a title,
// a message, and an OK button that can run a callback on dismiss.

type AlertType = "success" | "error";

interface AlertState {
  visible: boolean;
  type: AlertType;
  title: string;
  message: string;
  onConfirm?: () => void;
}

export default function Login() {
  // Store input values
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Show/hide password
  const [showPassword, setShowPassword] = useState(false);

  // Prevents duplicate submissions if the user taps Log In
  // multiple times while the request is still in flight.
  const [loading, setLoading] = useState(false);

  // Separate loading flag for the Google button, since it's an
  // independent action from the main email/password submission.
  const [googleLoading, setGoogleLoading] = useState(false);

  // Custom alert modal state
  const [alert, setAlert] = useState<AlertState>({
    visible: false,
    type: "error",
    title: "",
    message: "",
  });

  const showAlert = (type: AlertType, title: string, message: string, onConfirm?: () => void) => {
    setAlert({ visible: true, type, title, message, onConfirm });
  };

  const closeAlert = () => {
    setAlert((prev) => ({ ...prev, visible: false }));
    if (alert.onConfirm) alert.onConfirm();
  };

  // Runs when Log In button is pressed
  const handleLogin = async () => {
    if (!email || !password) {
      showAlert("error", "Missing Information", "Please enter email and password");
      return;
    }

    if (loading) return; // guard against double taps

    setLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        showAlert("error", "Login Failed", data.message || "Incorrect email or password");
        return;
      }
      // Store the authentication token
      await AsyncStorage.setItem("customerToken", data.token);
      await AsyncStorage.setItem("customerData", JSON.stringify(data.customer));

      // Navigation happens after the user dismisses the success alert,
      // via closeAlert()'s onConfirm callback below — so the popup is
      // never cut off mid-display.
      showAlert("success", "Welcome Back!", "Login successful", () => {
        router.replace('/(customer)/(tabs)/home');
      });

    } catch (error: any) {
      console.log("Login error:", error);
      showAlert("error", "Something Went Wrong", String(error?.message || error));
    } finally {
      setLoading(false);
    }
  };

  // Google Sign-In — works for both existing and brand-new accounts.
  // Backend creates the account on first sign-in, so there's no
  // separate "register with Google" path needed.
  const handleGoogleSignIn = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    try {
      const idToken = await signInWithGoogle();

      const res = await fetch(GOOGLE_AUTH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        showAlert("error", "Google Sign-In Failed", data.message || "Please try again");
        return;
      }

      await AsyncStorage.setItem("customerToken", data.token);
      await AsyncStorage.setItem("customerData", JSON.stringify(data.customer));

      showAlert("success", "Welcome!", "Signed in with Google", () => {
        router.replace('/(customer)/(tabs)/home');
      });
    } catch (error: any) {
      showAlert("error", "Google Sign-In Failed", String(error?.message || error));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>

        <View style={styles.logoRow}>
          <Image source={require('../../../assets/LimoIcon/logo.png')} style={styles.logo} />
          <Text style={styles.logoText}>LIMO{"\n"}SALON</Text>
        </View>

        <Text style={styles.heading}>Welcome Back</Text>
        <Text style={styles.subheading}>Sign in to book your next appointment</Text>

        <View style={styles.form}>

          <TextInput
            placeholder="Email"
            placeholderTextColor="#999"
            style={styles.input}
            value={email}
            onChangeText={(text) => setEmail(text.toLowerCase())}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            keyboardType="email-address"
          />

          <View style={styles.passwordBox}>
            <TextInput
              placeholder="Password"
              placeholderTextColor="#999"
              secureTextEntry={!showPassword}
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name={showPassword ? "eye" : "eye-off"} size={18} color="#999" />
            </TouchableOpacity>
          </View>

          <Text
            style={styles.forgot}
            onPress={() => router.push('/(customer)/(auth)/forgotPassword')}
          >
            Forgot password?
          </Text>

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            activeOpacity={0.8}
            disabled={loading}
          >
            <Text style={styles.loginText}>{loading ? "Logging in..." : "Log In"}</Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.line} />
            <Text style={styles.orText}>or continue with</Text>
            <View style={styles.line} />
          </View>

          <TouchableOpacity
            style={styles.googleBtn}
            activeOpacity={0.8}
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
          >
            <AntDesign name="google" size={18} color="#DB4437" style={styles.googleIcon} />
            <Text style={styles.googleText}>
              {googleLoading ? "Signing in..." : "Continue with Google"}
            </Text>
          </TouchableOpacity>

        </View>

        <Text style={styles.registerText}>
          Don't have an account?{" "}
          <Text style={styles.register} onPress={() => router.push('/(customer)/(auth)/register')}>
            Register
          </Text>
        </Text>

      </View>

      {/* Custom branded alert modal — replaces Alert.alert() */}
      <Modal visible={alert.visible} transparent animationType="fade" onRequestClose={closeAlert}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>

            <View
              style={[
                styles.modalIconCircle,
                alert.type === "success" ? styles.modalIconCircleSuccess : styles.modalIconCircleError,
              ]}
            >
              <Feather
                name={alert.type === "success" ? "check" : "alert-circle"}
                size={28}
                color={alert.type === "success" ? "#2ECC71" : "#FF2D75"}
              />
            </View>

            <Text style={styles.modalTitle}>{alert.title}</Text>
            <Text style={styles.modalMessage}>{alert.message}</Text>

            <TouchableOpacity style={styles.modalButton} activeOpacity={0.8} onPress={closeAlert}>
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

    </View>
  );
}

// =====================================================
// App primary color: #FF2D75 (matches project design spec)
// Buttons use borderRadius 25 (pill shape) per design request.
// Inputs use borderRadius 14 to stay visually distinct from
// buttons while still matching the app's rounded aesthetic.
// Spacing follows an 8px rhythm (8 / 16 / 24 / 32) for a
// cleaner, more consistent vertical alignment.
// =====================================================
const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#eee',
  },

  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },

  /* Logo Row */
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
    color: '#FF2D75',
    lineHeight: 22,
  },

  /* Heading */
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

  /* Form wrapper — keeps every field/button the same width
     and evenly spaced, instead of relying on ad-hoc marginTop
     values on each element. */
  form: {
    width: '100%',
  },

  /* Inputs */
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
    color: '#FF2D75',
  },

  /* Login Button */
  loginBtn: {
    width: '100%',
    backgroundColor: '#FF2D75',
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

  /* Divider */
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },

  orText: {
    marginHorizontal: 10,
    fontSize: 12,
    color: '#777',
  },

  /* Google Button */
  googleBtn: {
    width: '100%',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },

  googleIcon: {
    marginRight: 10,
  },

  googleText: {
    fontWeight: '600',
    fontSize: 14,
    color: '#111',
  },

  /* Register */
  registerText: {
    marginTop: 24,
    fontSize: 13,
    color: '#111',
  },

  register: {
    color: '#FF2D75',
    fontWeight: 'bold',
  },

  /* ===== Custom Alert Modal ===== */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },

  modalCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },

  modalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  modalIconCircleSuccess: {
    backgroundColor: '#E8F8EF',
  },

  modalIconCircleError: {
    backgroundColor: '#FFE1EC',
  },

  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 6,
    textAlign: 'center',
  },

  modalMessage: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    marginBottom: 22,
    lineHeight: 20,
  },

  modalButton: {
    width: '100%',
    backgroundColor: '#FF2D75',
    paddingVertical: 13,
    borderRadius: 25,
    alignItems: 'center',
  },

  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },

});