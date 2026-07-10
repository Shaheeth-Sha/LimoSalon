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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

const API_URL = "http://10.0.2.2:5000/api/payments";

export default function PaymentOtp() {
  const router = useRouter();

  const {
    selectedServices,
    selectedLength,
    selectedDate,
    selectedTime,
    selectedStaff,
    totalAmount,
    advancePayment,
    balancePayment,
    paymentMethod,
  } = useLocalSearchParams();

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const inputs = useRef<Array<TextInput | null>>([]);

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

  const getToken = async () => {
    return (
      (await AsyncStorage.getItem("customerToken")) ||
      (await AsyncStorage.getItem("token"))
    );
  };

  const verifyPaymentOtp = async () => {
    const finalOtp = otp.join("");

    if (finalOtp.length !== 6) {
      Alert.alert("Error", "Enter 6 digit OTP");
      return;
    }

    try {
      setLoading(true);

      const token = await getToken();

      if (!token) {
        Alert.alert("Error", "Please login again.");
        return;
      }

      const res = await fetch(`${API_URL}/verify-otp`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          otp: finalOtp,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Error", data.message || "OTP verification failed");
        return;
      }

      Alert.alert("Success", "Payment verified successfully.");

      router.replace({
        pathname: "/(customer)/(services)/bookingSuccess",
        params: {
          selectedServices,
          selectedLength,
          selectedDate,
          selectedTime,
          selectedStaff,
          totalAmount,
          advancePayment,
          balancePayment,
          paymentMethod: paymentMethod || "Credit/Debit Card",
        },
      });
    } catch (error) {
      Alert.alert("Error", "Cannot connect to backend.");
    } finally {
      setLoading(false);
    }
  };

  const resendPaymentOtp = async () => {
    try {
      setLoading(true);

      const token = await getToken();

      if (!token) {
        Alert.alert("Error", "Please login again.");
        return;
      }

      const res = await fetch(`${API_URL}/send-otp`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Error", data.message || "Failed to resend OTP");
        return;
      }

      setOtp(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();

      Alert.alert("OTP Sent", "A new OTP has been sent to your registered email.");
    } catch (error) {
      Alert.alert("Error", "Cannot connect to backend.");
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
        <Ionicons name="shield-checkmark-outline" size={64} color="#fff" />

        <Text style={styles.heading}>Payment Verification</Text>

        <Text style={styles.cardText}>
          We sent a 6 digit OTP to your registered email to confirm this payment.
        </Text>
      </View>

      <Text style={styles.sentText}>Enter payment OTP</Text>

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

      <TouchableOpacity onPress={resendPaymentOtp} disabled={loading}>
        <Text style={styles.resendText}>Resend OTP</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, loading && styles.disabledButton]}
        onPress={verifyPaymentOtp}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Verify & Continue</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        disabled={loading}
      >
        <Ionicons name="chevron-back" size={18} color="#FF2D75" />
        <Text style={styles.backText}>Back to payment</Text>
      </TouchableOpacity>

      <View style={styles.noteBox}>
        <Ionicons name="information-circle-outline" size={18} color="#777" />
        <Text style={styles.noteText}>
          This is a test payment verification flow. No real card payment is
          charged.
        </Text>
      </View>
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
    marginBottom: 35,
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
    borderRadius: 18,
    paddingVertical: 34,
    paddingHorizontal: 24,
    alignItems: "center",
    marginBottom: 35,
  },

  heading: {
    fontSize: 27,
    fontWeight: "800",
    color: "#fff",
    marginTop: 14,
    textAlign: "center",
  },

  cardText: {
    color: "#fff",
    textAlign: "center",
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
  },

  sentText: {
    textAlign: "center",
    fontSize: 17,
    color: "#111",
    fontWeight: "700",
    marginBottom: 18,
  },

  otpRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 18,
  },

  otpBox: {
    width: 45,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#F2F2F2",
    borderWidth: 1,
    borderColor: "#D96C91",
    textAlign: "center",
    fontSize: 20,
    fontWeight: "800",
    color: "#111",
  },

  resendText: {
    textAlign: "center",
    color: "#408BFF",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 22,
  },

  button: {
    backgroundColor: "#FF2D75",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginHorizontal: 10,
  },

  disabledButton: {
    opacity: 0.6,
  },

  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },

  backButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    gap: 6,
  },

  backText: {
    color: "#FF2D75",
    fontSize: 15,
    fontWeight: "700",
  },

  noteBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#F7F7F7",
    padding: 14,
    borderRadius: 12,
    marginTop: 30,
  },

  noteText: {
    flex: 1,
    color: "#777",
    fontSize: 13,
    lineHeight: 18,
  },
});