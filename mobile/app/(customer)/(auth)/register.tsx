import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons, Feather, AntDesign } from "@expo/vector-icons";
import { useState } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { signInWithGoogle } from "../../../utils/googleAuth";

// =====================================================
// Pending registration holder — uses React Native's global object
// instead of a separate imported file. This avoids Metro path
// resolution issues entirely (no import path to get wrong) while
// still keeping the password out of route params/URLs.
// Same limitation as before: lives only in memory for this app
// session, cleared once registration completes.
// =====================================================
declare global {
  // eslint-disable-next-line no-var
  var __pendingRegistration:
    | { name: string; email: string; phone: string; password: string }
    | null
    | undefined;
}

type ErrorState = {
  firstName: boolean;
  lastName: boolean;
  email: boolean;
  phone: boolean;
  password: boolean;
  confirmPassword: boolean;
};

// =====================================================
// Custom in-app alert modal (same pattern used in login.tsx)
// Replaces Alert.alert() with a branded, rounded popup instead
// of the generic OS system dialog.
// =====================================================
type AlertState = {
  visible: boolean;
  title: string;
  message: string;
};

export default function Register() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+94 ");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // Separate loading flag for the Google button, since it's an
  // independent action from the main form submission.
  const [googleLoading, setGoogleLoading] = useState(false);

  const [errors, setErrors] = useState<ErrorState>({
    firstName: false,
    lastName: false,
    email: false,
    phone: false,
    password: false,
    confirmPassword: false,
  });

  const [alert, setAlert] = useState<AlertState>({
    visible: false,
    title: "",
    message: "",
  });

  const showAlert = (title: string, message: string) => {
    setAlert({ visible: true, title, message });
  };

  const closeAlert = () => setAlert((prev) => ({ ...prev, visible: false }));

  const emailRegex = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

  const normalizeEmail = (value: string) =>
    value.trim().toLowerCase();

  const formatName = (text: string) => {
    const cleaned = text.replace(/[^A-Za-z\s'-]/g, "");

    if (!cleaned) {
      return "";
    }

    return cleaned
      .split(" ")
      .map((part) =>
        part.length > 0
          ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
          : ""
      )
      .join(" ");
  };

  const formatPhone = (text: string) => {
    let digits = text.replace(/\D/g, "");

    if (digits.startsWith("94")) {
      digits = digits.slice(2);
    }

    if (digits.startsWith("0")) {
      digits = digits.slice(1);
    }

    digits = digits.slice(0, 9);

    let formatted = "+94 ";

    if (digits.length > 0) {
      formatted += digits.slice(0, 2);
    }

    if (digits.length > 2) {
      formatted += ` ${digits.slice(2, 5)}`;
    }

    if (digits.length > 5) {
      formatted += ` ${digits.slice(5, 9)}`;
    }

    return formatted;
  };

  const normalizePhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    return `+${digits}`;
  };

  const passwordRules = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
  };

  const isPasswordValid =
    passwordRules.length &&
    passwordRules.uppercase &&
    passwordRules.number;

  const isPasswordMatch =
    password.length > 0 &&
    confirmPassword.length > 0 &&
    password === confirmPassword;

  const validate = () => {
    const normalizedEmail = normalizeEmail(email);
    const phoneDigits = phone.replace(/\D/g, "");

    const newErrors: ErrorState = {
      firstName: firstName.trim().length === 0,
      lastName: lastName.trim().length === 0,
      email: !emailRegex.test(normalizedEmail),
      phone: phoneDigits.length !== 11,
      password: !isPasswordValid,
      confirmPassword: !isPasswordMatch,
    };

    setErrors(newErrors);

    if (newErrors.firstName || newErrors.lastName) {
      showAlert(
        "Missing Information",
        "Please enter your first name and last name."
      );
      return false;
    }

    if (!normalizedEmail) {
      showAlert("Missing Information", "Please enter your email address.");
      return false;
    }

    if (newErrors.email) {
      showAlert(
        "Invalid Email",
        "Please enter a valid email address, for example user@gmail.com."
      );
      return false;
    }

    if (newErrors.phone) {
      showAlert(
        "Invalid Phone Number",
        "Phone number must be in +94 XX XXX XXXX format."
      );
      return false;
    }

    if (newErrors.password) {
      showAlert(
        "Weak Password",
        "Password must contain at least 8 characters, one uppercase letter and one number."
      );
      return false;
    }

    if (newErrors.confirmPassword) {
      showAlert("Password Mismatch", "Passwords do not match.");
      return false;
    }

    return true;
  };

  const handleRegister = () => {
    if (!validate()) {
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);
    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    // Fixed: stored on the global object instead of passed as route
    // params (unsafe for sensitive data) or imported from a separate
    // file (was failing to resolve). No import needed here at all.
    global.__pendingRegistration = {
      name: fullName,
      email: normalizedEmail,
      phone: normalizedPhone,
      password,
    };

    router.push({
      // Keep this route if the file is still named PhoneVerification.tsx.
      // The screen can now perform email OTP verification.
      pathname: "/(customer)/(auth)/PhoneVerification",
    });
  };

  // Google accounts skip the email-OTP verification step entirely —
  // Google has already verified the email, so this goes straight from
  // sign-in to a real, usable account and into the app.
  const handleGoogleSignIn = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    try {
      const idToken = await signInWithGoogle();

      const res = await fetch(
        "https://limosalon.onrender.com/api/customers/google-auth",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        showAlert("Google Sign-In Failed", data.message || "Please try again");
        return;
      }

      await AsyncStorage.setItem("customerToken", data.token);
      await AsyncStorage.setItem("customerData", JSON.stringify(data.customer));

      router.replace("/(customer)/(tabs)/home");
    } catch (error: any) {
      showAlert("Google Sign-In Failed", String(error?.message || error));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoRow}>
          <Image
            source={require("../../../assets/LimoIcon/logo.png")}
            style={styles.logo}
          />

          <Text style={styles.logoText}>
            LIMO{"\n"}SALON
          </Text>
        </View>

        <Text style={styles.title}>Create Account</Text>

        <View
          style={[
            styles.inputRow,
            errors.firstName && styles.errorBorder,
          ]}
        >
          <Ionicons name="person-outline" size={20} color="#999" />

          <TextInput
            placeholder="First Name"
            placeholderTextColor="#999"
            style={styles.input}
            value={firstName}
            autoCapitalize="words"
            autoCorrect={false}
            onChangeText={(text) => {
              const value = formatName(text);
              setFirstName(value);

              if (errors.firstName) {
                setErrors((previous) => ({
                  ...previous,
                  firstName: value.trim().length === 0,
                }));
              }
            }}
          />
        </View>

        <View
          style={[
            styles.inputRow,
            errors.lastName && styles.errorBorder,
          ]}
        >
          <Ionicons name="person-outline" size={20} color="#999" />

          <TextInput
            placeholder="Last Name"
            placeholderTextColor="#999"
            style={styles.input}
            value={lastName}
            autoCapitalize="words"
            autoCorrect={false}
            onChangeText={(text) => {
              const value = formatName(text);
              setLastName(value);

              if (errors.lastName) {
                setErrors((previous) => ({
                  ...previous,
                  lastName: value.trim().length === 0,
                }));
              }
            }}
          />
        </View>

        <View
          style={[
            styles.inputRow,
            errors.email && styles.errorBorder,
          ]}
        >
          <Ionicons name="mail-outline" size={20} color="#999" />

          <TextInput
            placeholder="Email"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            style={styles.input}
            value={email}
            onChangeText={(text) => {
              setEmail(text);

              const normalizedValue = normalizeEmail(text);

              setErrors((previous) => ({
                ...previous,
                email:
                  normalizedValue.length > 0 &&
                  !emailRegex.test(normalizedValue),
              }));
            }}
            onBlur={() => {
              const normalizedValue = normalizeEmail(email);
              setEmail(normalizedValue);

              setErrors((previous) => ({
                ...previous,
                email:
                  normalizedValue.length > 0 &&
                  !emailRegex.test(normalizedValue),
              }));
            }}
          />
        </View>

        <View
          style={[
            styles.inputRow,
            errors.phone && styles.errorBorder,
          ]}
        >
          <Ionicons name="call-outline" size={20} color="#999" />

          <TextInput
            placeholder="+94 XX XXX XXXX"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
            style={styles.input}
            value={phone}
            maxLength={15}
            onChangeText={(text) => {
              const value = formatPhone(text);
              setPhone(value);

              setErrors((previous) => ({
                ...previous,
                phone:
                  value.replace(/\D/g, "").length > 2 &&
                  value.replace(/\D/g, "").length !== 11,
              }));
            }}
          />
        </View>

        <View
          style={[
            styles.inputRow,
            errors.password && styles.errorBorder,
          ]}
        >
          <Ionicons
            name="lock-closed-outline"
            size={20}
            color="#999"
          />

          <TextInput
            placeholder="Password"
            placeholderTextColor="#999"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            value={password}
            onFocus={() => setPasswordFocused(true)}
            onChangeText={(text) => {
              setPassword(text);

              const valid =
                text.length >= 8 &&
                /[A-Z]/.test(text) &&
                /\d/.test(text);

              setErrors((previous) => ({
                ...previous,
                password: text.length > 0 && !valid,
                confirmPassword:
                  confirmPassword.length > 0 &&
                  confirmPassword !== text,
              }));
            }}
          />

          <TouchableOpacity
            onPress={() => setShowPassword((previous) => !previous)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather
              name={showPassword ? "eye" : "eye-off"}
              size={18}
              color="#999"
            />
          </TouchableOpacity>
        </View>

        {passwordFocused && (
          <View style={styles.passwordRulesBox}>
            <Text style={styles.passwordRulesTitle}>
              Password must include:
            </Text>

            <Text
              style={[
                styles.passwordRule,
                {
                  color: passwordRules.length
                    ? "#168A3A"
                    : "#D62828",
                },
              ]}
            >
              {passwordRules.length ? "✓" : "✗"} 8 or more characters
            </Text>

            <Text
              style={[
                styles.passwordRule,
                {
                  color: passwordRules.uppercase
                    ? "#168A3A"
                    : "#D62828",
                },
              ]}
            >
              {passwordRules.uppercase ? "✓" : "✗"} One uppercase letter
            </Text>

            <Text
              style={[
                styles.passwordRule,
                {
                  color: passwordRules.number
                    ? "#168A3A"
                    : "#D62828",
                },
              ]}
            >
              {passwordRules.number ? "✓" : "✗"} One number
            </Text>
          </View>
        )}

        <View
          style={[
            styles.inputRow,
            errors.confirmPassword && styles.errorBorder,
          ]}
        >
          <Ionicons
            name="lock-closed-outline"
            size={20}
            color="#999"
          />

          <TextInput
            placeholder="Confirm Password"
            placeholderTextColor="#999"
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);

              setErrors((previous) => ({
                ...previous,
                confirmPassword:
                  text.length > 0 && text !== password,
              }));
            }}
          />

          <TouchableOpacity
            onPress={() =>
              setShowConfirmPassword((previous) => !previous)
            }
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather
              name={showConfirmPassword ? "eye" : "eye-off"}
              size={18}
              color="#999"
            />
          </TouchableOpacity>
        </View>

        {confirmPassword.length > 0 && (
          <Text
            style={[
              styles.passwordMatchText,
              {
                color: isPasswordMatch
                  ? "#168A3A"
                  : "#D62828",
              },
            ]}
          >
            {isPasswordMatch
              ? "✓ Passwords match"
              : "✗ Passwords do not match"}
          </Text>
        )}

        <TouchableOpacity
          style={styles.button}
          onPress={handleRegister}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>Create Account</Text>
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
          <AntDesign
            name="google"
            size={18}
            color="#DB4437"
            style={styles.googleIcon}
          />

          <Text style={styles.googleText}>
            {googleLoading ? "Signing in..." : "Continue with Google"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.loginText}>
          Already have an account?{" "}
          <Text
            style={styles.loginLink}
            onPress={() =>
              router.push("/(customer)/(auth)/login")
            }
          >
            Login
          </Text>
        </Text>
      </ScrollView>

      {/* Custom branded alert modal — replaces Alert.alert() */}
      <Modal
        visible={alert.visible}
        transparent
        animationType="fade"
        onRequestClose={closeAlert}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>

            <View style={styles.modalIconCircle}>
              <Feather name="alert-circle" size={28} color="#FF2D55" />
            </View>

            <Text style={styles.modalTitle}>{alert.title}</Text>
            <Text style={styles.modalMessage}>{alert.message}</Text>

            <TouchableOpacity
              style={styles.modalButton}
              activeOpacity={0.8}
              onPress={closeAlert}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

// =====================================================
// App primary color: #FF2D55 (matches project design spec)
// Was previously #FF1744 / #FF2D75 in this file — both fixed
// to the correct hex so this screen matches every other screen.
// Button uses borderRadius 25 (pill) to match Welcome/UserSelect/Login.
// =====================================================
const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  container: {
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 70,
    paddingBottom: 40,
  },

  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
    marginTop: 30,
  },

  logo: {
    width: 65,
    height: 65,
    marginRight: 10,
  },

  logoText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FF2D55",
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 22,
    color: "#111",
  },

  inputRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#FF2D55",
    borderRadius: 14,
    paddingHorizontal: 12,
    marginBottom: 14,
    backgroundColor: "#FFFFFF",
  },

  errorBorder: {
    borderColor: "#D62828",
  },

  input: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: 10,
    fontSize: 14,
    color: "#111",
  },

  passwordRulesBox: {
    marginTop: -5,
    marginBottom: 14,
    marginLeft: 10,
  },

  passwordRulesTitle: {
    fontSize: 12,
    color: "#666",
    marginBottom: 3,
  },

  passwordRule: {
    fontSize: 12,
    marginBottom: 2,
  },

  passwordMatchText: {
    marginTop: -5,
    marginBottom: 12,
    marginLeft: 10,
    fontSize: 12,
    fontWeight: "600",
  },

  button: {
    backgroundColor: "#FF2D55",
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 10,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 16,
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#ddd",
  },

  orText: {
    marginHorizontal: 10,
    fontSize: 12,
    color: "#777",
  },

  googleBtn: {
    width: "100%",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#ddd",
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },

  googleIcon: {
    marginRight: 10,
  },

  googleText: {
    fontWeight: "600",
    fontSize: 14,
    color: "#111",
  },

  loginText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 13,
    color: "#333",
  },

  loginLink: {
    color: "#FF2D55",
    fontWeight: "700",
  },

  /* ===== Custom Alert Modal ===== */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },

  modalCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: "center",
  },

  modalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFE5EA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  modalTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#111",
    marginBottom: 6,
    textAlign: "center",
  },

  modalMessage: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    marginBottom: 22,
    lineHeight: 20,
  },

  modalButton: {
    width: "100%",
    backgroundColor: "#FF2D55",
    paddingVertical: 13,
    borderRadius: 25,
    alignItems: "center",
  },

  modalButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
});