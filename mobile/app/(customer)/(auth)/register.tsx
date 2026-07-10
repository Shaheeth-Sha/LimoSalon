import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useState } from "react";
import { useRouter } from "expo-router";



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

  const [errors, setErrors] = useState({
    email: false,
    phone: false,
    password: false,
    confirmPassword: false,
  });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const formatName = (text: string) => {
    const cleaned = text.replace(/[^A-Za-z]/g, "");
    if (!cleaned) return "";
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  };

  const formatPhone = (text: string) => {
    let cleaned = text.replace(/\D/g, "");

    if (cleaned.startsWith("94")) cleaned = cleaned.slice(2);
    if (cleaned.startsWith("0")) cleaned = cleaned.slice(1);

    cleaned = cleaned.slice(0, 9);

    let formatted = "+94 ";
    if (cleaned.length > 0) formatted += cleaned.slice(0, 2);
    if (cleaned.length > 2) formatted += " " + cleaned.slice(2, 5);
    if (cleaned.length > 5) formatted += " " + cleaned.slice(5, 9);

    return formatted;
  };

  const passwordRules = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
  };

  const isPasswordValid =
    passwordRules.length && passwordRules.uppercase && passwordRules.number;

  const isPasswordMatch =
    password === confirmPassword && confirmPassword.length > 0;

  const validate = () => {
    const newErrors = {
      email: !emailRegex.test(email),
      phone: phone.replace(/\D/g, "").length !== 11,
      password: !isPasswordValid,
      confirmPassword: !isPasswordMatch,
    };

    setErrors(newErrors);

    if (!firstName || !lastName || !email || !phone || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill all fields");
      return false;
    }

    if (newErrors.email) {
      Alert.alert("Error", "Please enter a valid email address");
      return false;
    }

    if (newErrors.phone) {
      Alert.alert("Error", "Phone number must be in +94 XX XXX XXXX format");
      return false;
    }

    if (newErrors.password) {
      Alert.alert("Error", "Password must include 8+ characters, one uppercase letter, and one number");
      return false;
    }

    if (newErrors.confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    router.push({
      pathname: "/(customer)/(auth)/PhoneVerification",
      params: {
        name: `${firstName} ${lastName}`,
        email: email.toLowerCase(),
        phone,
        password,
      },
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#FFFFFF" }}
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
          <Text style={styles.logoText}>LIMO{"\n"}SALON</Text>
        </View>

        <Text style={styles.title}>Create Account</Text>

        <View style={styles.inputRow}>
          <Ionicons name="person-outline" size={20} color="#999" />
          <TextInput
            placeholder="First Name"
            style={styles.input}
            value={firstName}
            onChangeText={(t) => setFirstName(formatName(t))}
          />
        </View>

        <View style={styles.inputRow}>
          <Ionicons name="person-outline" size={20} color="#999" />
          <TextInput
            placeholder="Last Name"
            style={styles.input}
            value={lastName}
            onChangeText={(t) => setLastName(formatName(t))}
          />
        </View>

        <View style={[styles.inputRow, errors.email && { borderColor: "red" }]}>
          <Ionicons name="mail-outline" size={20} color="#999" />
          <TextInput
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            value={email}
            onChangeText={(t) => {
              const value = t.toLowerCase().trim();
              setEmail(value);
              setErrors((p) => ({ ...p, email: value.length > 0 && !emailRegex.test(value) }));
            }}
          />
        </View>

        <View style={[styles.inputRow, errors.phone && { borderColor: "red" }]}>
          <Ionicons name="call-outline" size={20} color="#999" />
          <TextInput
            placeholder="Phone Number"
            keyboardType="phone-pad"
            style={styles.input}
            value={phone}
            onChangeText={(t) => {
              const value = formatPhone(t);
              setPhone(value);
              setErrors((p) => ({
                ...p,
                phone: value.replace(/\D/g, "").length !== 11,
              }));
            }}
          />
        </View>

        <View style={[styles.inputRow, errors.password && { borderColor: "red" }]}>
          <Ionicons name="lock-closed-outline" size={20} color="#999" />
          <TextInput
            placeholder="Password"
            secureTextEntry={!showPassword}
            style={styles.input}
            value={password}
            onFocus={() => setPasswordFocused(true)}
            onChangeText={(t) => {
              setPassword(t);
              setErrors((p) => ({ ...p, password: t.length > 0 && !(t.length >= 8 && /[A-Z]/.test(t) && /\d/.test(t)) }));
            }}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Feather name={showPassword ? "eye" : "eye-off"} size={18} color="#999" />
          </TouchableOpacity>
        </View>

        {passwordFocused && (
          <>
            <Text style={{ fontSize: 12, color: "#666", marginLeft: 10 }}>
              Password must include:
            </Text>
            <Text style={{ fontSize: 12, color: passwordRules.length ? "green" : "red", marginLeft: 10 }}>
              ✓ 8+ characters
            </Text>
            <Text style={{ fontSize: 12, color: passwordRules.uppercase ? "green" : "red", marginLeft: 10 }}>
              ✓ One uppercase letter
            </Text>
            <Text style={{ fontSize: 12, color: passwordRules.number ? "green" : "red", marginLeft: 10 }}>
              ✓ One number
            </Text>
          </>
        )}

        <View style={[styles.inputRow, errors.confirmPassword && { borderColor: "red" }]}>
          <Ionicons name="lock-closed-outline" size={20} color="#999" />
          <TextInput
            placeholder="Confirm Password"
            secureTextEntry={!showConfirmPassword}
            style={styles.input}
            value={confirmPassword}
            onChangeText={(t) => {
              setConfirmPassword(t);
              setErrors((p) => ({
                ...p,
                confirmPassword: t.length > 0 && t !== password,
              }));
            }}
          />
          <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
            <Feather name={showConfirmPassword ? "eye" : "eye-off"} size={18} color="#999" />
          </TouchableOpacity>
        </View>

        {confirmPassword.length > 0 && (
          <Text
            style={{
              marginLeft: 10,
              fontSize: 12,
              color: isPasswordMatch ? "green" : "red",
            }}
          >
            {isPasswordMatch ? "✓ Passwords match" : "✗ Passwords do not match"}
          </Text>
        )}

        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>Create Account</Text>
        </TouchableOpacity>

        <Text style={styles.loginText}>
          I Already Have an Account{" "}
          <Text
            style={styles.loginLink}
            onPress={() => router.push("/(customer)/(auth)/login")}
          >
            Login
          </Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
    color: "#ff1744",
  },

  title: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 20,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#FF2D75",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 14,
  },

  input: {
    flex: 1,
    padding: 12,
    fontSize: 14,
  },

  button: {
    backgroundColor: "#FF2D75",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  loginText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 13,
  },

  loginLink: {
    color: "#FF2D75",
    fontWeight: "600",
  },
});