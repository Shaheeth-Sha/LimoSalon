import React, { useRef, useState } from "react";
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
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const API_URL = "http://10.0.2.2:5000/api/customers";

export default function VerifyOtp() {
  const router = useRouter();

  const { name, email, phone, password } = useLocalSearchParams();

  const registeredEmail = String(email || "");
  const registeredName = String(name || "");
  const registeredPhone = String(phone || "");
  const registeredPassword = String(password || "");

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const inputs = useRef<Array<TextInput | null>>([]);

  const maskedEmail = registeredEmail
    ? registeredEmail.replace(/(.{2}).+(@.+)/, "$1******$2")
    : "your email";

  const handleChange = (text: string, index: number) => {
    const value = text.replace(/\D/g, "").slice(0, 1);
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleBackspace = (text: string, index: number) => {
    if (!text && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const verifyOtp = async () => {
    const finalOtp = otp.join("");

    if (finalOtp.length !== 6) {
      Alert.alert("Error", "Enter 6 digit OTP");
      return;
    }

    try {
      setLoading(true);

      const verifyRes = await fetch(`${API_URL}/verify-registration-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: registeredEmail,
          otp: finalOtp,
        }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        Alert.alert("Error", verifyData.message || "OTP verification failed");
        return;
      }

      const registerRes = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: registeredName,
          email: registeredEmail,
          phone: registeredPhone,
          password: registeredPassword,
        }),
      });

      const registerData = await registerRes.json();

      if (!registerRes.ok) {
        Alert.alert("Error", registerData.message || "Registration failed");
        return;
      }

      setShowSuccess(true);
    } catch (error) {
      Alert.alert("Error", "Cannot connect to backend");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/send-registration-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: registeredEmail,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Error", data.message || "Failed to resend OTP");
        return;
      }

      Alert.alert("OTP Sent", "Please check your email again.");
    } catch (error) {
      Alert.alert("Error", "Cannot connect to backend");
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
        <Ionicons name="mail-outline" size={70} color="#333" />

        <Text style={styles.heading}>Email Verification</Text>

        <Text style={styles.cardText}>
          We sent a one-time{"\n"}
          password to verify your email address
        </Text>
      </View>

      <Text style={styles.sentText}>Enter the 6 digit code sent to</Text>
      <Text style={styles.emailText}>{maskedEmail}</Text>

      <View style={styles.otpRow}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => {
              inputs.current[index] = ref;
            }}
            value={digit}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={({ nativeEvent }) => {
              if (nativeEvent.key === "Backspace") {
                handleBackspace(digit, index);
              }
            }}
            keyboardType="number-pad"
            maxLength={1}
            style={styles.otpBox}
          />
        ))}
      </View>

      <TouchableOpacity onPress={resendOtp} disabled={loading}>
        <Text style={styles.resendText}>Resend code</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, loading && styles.disabledButton]}
        onPress={verifyOtp}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Verify OTP</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.changeRow}
        onPress={() =>
          router.replace({
            pathname: "/(customer)/(auth)/PhoneVerification",
            params: {
              name: registeredName,
              email: registeredEmail,
              phone: registeredPhone,
              password: registeredPassword,
            },
          })
        }
      >
        <Ionicons name="create-outline" size={18} color="#FF2D75" />
        <Text style={styles.changeText}>Change email address</Text>
      </TouchableOpacity>

      {showSuccess && (
        <View style={styles.modalOverlay}>
          <View style={styles.successBox}>
            <Text style={styles.successTitle}>
              Account Created{"\n"}Successfully
            </Text>

            <Text style={styles.successMessage}>
              Your account has been created.{"\n"}
              You can now login.
            </Text>

            <TouchableOpacity
              onPress={() => router.replace("/(customer)/(auth)/login")}
            >
              <Text style={styles.successContinue}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 25,
    paddingTop: 70,
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
    backgroundColor: "#D96C91",
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 22,
    alignItems: "center",
    marginBottom: 28,
  },

  heading: {
    fontSize: 30,
    fontWeight: "800",
    color: "#fff",
    marginTop: 18,
    fontFamily: "serif",
  },

  cardText: {
    color: "#fff",
    textAlign: "center",
    marginTop: 10,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
    fontFamily: "serif",
  },

  sentText: {
    textAlign: "center",
    fontSize: 16,
    color: "#111",
    fontFamily: "serif",
  },

  emailText: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 5,
    marginBottom: 25,
    color: "#111",
    fontFamily: "serif",
  },

  otpRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 18,
  },

  otpBox: {
    width: 45,
    height: 45,
    borderRadius: 8,
    backgroundColor: "#D1D1D1",
    borderWidth: 1,
    borderColor: "#D96C91",
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
  },

  resendText: {
    textAlign: "center",
    color: "#408BFF",
    fontSize: 13,
    marginBottom: 15,
  },

  button: {
    backgroundColor: "#FF2D75",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 15,
  },

  disabledButton: {
    opacity: 0.6,
  },

  buttonText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },

  changeRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 25,
    gap: 8,
  },

  changeText: {
    color: "#FF2D75",
    fontWeight: "700",
  },

  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },

  successBox: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 25,
    borderWidth: 2,
    borderColor: "#111",
  },

  successTitle: {
    fontSize: 25,
    fontWeight: "500",
    color: "#111",
    marginBottom: 18,
  },

  successMessage: {
    fontSize: 18,
    color: "#111",
    lineHeight: 26,
    marginBottom: 35,
  },

  successContinue: {
    textAlign: "right",
    color: "#FF2D55",
    fontSize: 18,
  },
});