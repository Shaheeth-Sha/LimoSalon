import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const API_URL = "http://10.0.2.2:5000/api/customers";

export default function EmailVerification() {
  const router = useRouter();

  const { name, email, phone, password } = useLocalSearchParams();

  const registeredEmail = typeof email === "string" ? email : "";

  const [loading, setLoading] = useState(false);

  const sendOtp = async () => {
    if (!registeredEmail) {
      Alert.alert("Error", "Email address is missing.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/send-registration-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: registeredEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Error", data.message || "Failed to send OTP");
        return;
      }

      Alert.alert("OTP Sent", "Please check your email for the OTP code.");

      router.push({
        pathname: "/(customer)/(auth)/VerifyOtp",
        params: {
          name,
          email: registeredEmail,
          phone,
          password,
        },
      });
    } catch (error) {
      Alert.alert("Error", "Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoRow}>
        <Image
          source={require("../../../assets/LimoIcon/logo.png")}
          style={styles.logo}
        />
        <Text style={styles.logoText}>LIMO{"\n"}SALON</Text>
      </View>

      <View style={styles.card}>
        <Ionicons name="mail-outline" size={60} color="#333" />
        <Text style={styles.heading}>Email Verification</Text>
        <Text style={styles.subText}>
          We will send a one-time password to verify your email address
        </Text>
      </View>

      <TextInput
        value={registeredEmail}
        editable={false}
        placeholder="Email"
        keyboardType="email-address"
        style={styles.input}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.disabledButton]}
        onPress={sendOtp}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Send Email OTP</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 25,
    paddingTop: 80,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
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
  card: {
    backgroundColor: "#D94A70",
    borderRadius: 16,
    padding: 30,
    alignItems: "center",
    marginBottom: 45,
  },
  heading: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 15,
  },
  subText: {
    color: "#fff",
    textAlign: "center",
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 14,
    marginBottom: 30,
    fontSize: 15,
    color: "#333",
    backgroundColor: "#F8F8F8",
  },
  button: {
    backgroundColor: "#FF2D75",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});