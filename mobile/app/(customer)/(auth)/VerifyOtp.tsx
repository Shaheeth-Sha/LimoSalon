import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert } from "react-native";
import { useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const API_URL = "http://10.0.2.2:5000/api/customers/verify-otp";

export default function VerifyOtp() {
  const router = useRouter();
  const { phone } = useLocalSearchParams();

  const [otp, setOtp] = useState("");

  const verifyOtp = async () => {
    if (otp.length !== 6) {
      Alert.alert("Error", "Enter 6 digit OTP");
      return;
    }

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          otp,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Error", data.message || "OTP verification failed");
        return;
      }

      Alert.alert(
        "Account Created Successfully",
        "Your phone number has been verified. You can now login.",
        [
          {
            text: "Continue",
            onPress: () => router.replace("/(customer)/(auth)/login"),
          },
        ]
      );
    } catch (error) {
      Alert.alert("Error", "Cannot connect to backend");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoRow}>
        <Image source={require("../../../assets/LimoIcon/logo.png")} style={styles.logo} />
        <Text style={styles.logoText}>LIMO{"\n"}SALON</Text>
      </View>

      <View style={styles.card}>
        <Ionicons name="phone-portrait-outline" size={60} color="#333" />
        <Text style={styles.heading}>Phone Verification</Text>
        <Text style={styles.subText}>
          Enter the 6 digit code sent to{"\n"}
          {String(phone)}
        </Text>
      </View>

      <TextInput
        value={otp}
        onChangeText={(text) => setOtp(text.replace(/\D/g, "").slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="Enter OTP"
        style={styles.otpInput}
      />

      <TouchableOpacity style={styles.button} onPress={verifyOtp}>
        <Text style={styles.buttonText}>Verify OTP</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() =>
          router.replace({
            pathname: "/(customer)/(auth)/PhoneVerification",
            params: { phone },
          })
        }
      >
        <Text style={styles.changeText}>Change phone number</Text>
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
    borderRadius: 14,
    padding: 30,
    alignItems: "center",
    marginBottom: 35,
  },

  heading: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 15,
  },

  subText: {
    color: "#fff",
    textAlign: "center",
    marginTop: 10,
    fontSize: 14,
  },

  otpInput: {
    borderWidth: 1,
    borderColor: "#FF2D75",
    borderRadius: 10,
    padding: 14,
    fontSize: 22,
    textAlign: "center",
    letterSpacing: 8,
    marginBottom: 30,
  },

  button: {
    backgroundColor: "#FF2D75",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  changeText: {
    textAlign: "center",
    color: "#FF2D75",
    marginTop: 25,
    fontWeight: "600",
  },
});