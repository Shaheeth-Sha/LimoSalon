import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";

// Reads/clears the same global object Register.tsx writes to — no
// import path needed, avoids Metro resolution issues.
declare global {
  // eslint-disable-next-line no-var
  var __pendingRegistration:
    | { name: string; email: string; phone: string; password: string }
    | null
    | undefined;
}

const API_URL = "https://limosalon.onrender.com/api/customers";

type AlertState = {
  visible: boolean;
  title: string;
  message: string;
};

export default function VerifyOtp() {
  const router = useRouter();

  // Fixed: previously read name/email/phone/password from route
  // params (password included). Now reads from the in-memory
  // registration holder set by Register.tsx.
  const pending = global.__pendingRegistration;

  const registeredEmail = pending?.email ?? "";
  const registeredName = pending?.name ?? "";
  const registeredPhone = pending?.phone ?? "";
  const registeredPassword = pending?.password ?? "";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [alert, setAlert] = useState<AlertState>({
    visible: false,
    title: "",
    message: "",
  });

  const showAlert = (title: string, message: string) => {
    setAlert({ visible: true, title, message });
  };

  const closeAlert = () => setAlert((prev) => ({ ...prev, visible: false }));

  const inputs = useRef<Array<TextInput | null>>([]);

  // Guard: if there's no pending registration (e.g. app reloaded
  // mid-flow), there's nothing to verify — send back to Register.
  // Fixed: excluded the showSuccess case. Previously, a successful
  // verification cleared global.__pendingRegistration and then set
  // showSuccess(true) in the same tick — the re-render saw pending
  // as null and this effect fired, redirecting back to Register
  // and wiping out the success modal before it could ever show.
  useEffect(() => {
    if (!pending && !showSuccess) {
      router.replace("/(customer)/(auth)/register");
    }
  }, [pending, showSuccess]);

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
      showAlert("Incomplete Code", "Enter 6 digit OTP");
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
        showAlert("Verification Failed", verifyData.message || "OTP verification failed");
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
        // Fixed: previously left the already-consumed OTP digits sitting
        // in the boxes. Since a successful verify-registration-otp call
        // consumes the code server-side, retrying with the same digits
        // would always fail with a confusing "Invalid OTP" on the next
        // attempt. Now the boxes are cleared and the user is pointed to
        // "Resend code" for a fresh one.
        setOtp(["", "", "", "", "", ""]);
        inputs.current[0]?.focus();
        showAlert(
          "Registration Failed",
          `${registerData.message || "Registration failed"}\n\nYour code has already been used — tap "Resend code" to get a new one if you try again.`
        );
        return;
      }

      // Fixed: clear the in-memory registration data now that the
      // account has been created — nothing sensitive should linger
      // in memory once it's no longer needed.
      global.__pendingRegistration = null;
      setShowSuccess(true);
    } catch (error) {
      showAlert("Connection Error", "Cannot connect to backend");
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
        showAlert("Error", data.message || "Failed to resend OTP");
        return;
      }

      showAlert("OTP Sent", "Please check your email again.");
    } catch (error) {
      showAlert("Connection Error", "Cannot connect to backend");
    } finally {
      setLoading(false);
    }
  };

  if (!pending && !showSuccess) {
    return null; // redirecting via useEffect above
  }

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
        <Ionicons name="mail-outline" size={70} color="#fff" />

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

      <TouchableOpacity
        onPress={resendOtp}
        disabled={loading}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.resendText}>Resend code</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, loading && styles.disabledButton]}
        onPress={verifyOtp}
        activeOpacity={0.8}
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
        onPress={() => router.replace("/(customer)/(auth)/PhoneVerification")}
      >
        <Ionicons name="create-outline" size={18} color="#FF2D75" />
        <Text style={styles.changeText}>Change email address</Text>
      </TouchableOpacity>

      {/* Success modal — restyled to match the app's branded modal
          language (rounded card, icon circle, pill button) instead
          of the previous heavy black-bordered box with a plain text
          "Continue" link. */}
      {showSuccess && (
        <View style={styles.modalOverlay}>
          <View style={styles.successBox}>

            <View style={[styles.modalIconCircle, styles.successIconCircle]}>
              <Feather name="check" size={28} color="#2ECC71" />
            </View>

            <Text style={styles.successTitle}>Account Created Successfully</Text>

            <Text style={styles.successMessage}>
              Your account has been created. You can now login.
            </Text>

            <TouchableOpacity
              style={styles.successButton}
              activeOpacity={0.8}
              onPress={() => router.replace("/(customer)/(auth)/login")}
            >
              <Text style={styles.successButtonText}>Continue</Text>
            </TouchableOpacity>

          </View>
        </View>
      )}

      {/* Custom branded alert modal for errors/info — replaces Alert.alert() */}
      <Modal visible={alert.visible} transparent animationType="fade" onRequestClose={closeAlert}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>

            <View style={styles.modalIconCircle}>
              <Feather name="alert-circle" size={28} color="#FF2D75" />
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
// Was previously #ff1744 / #D96C91 / #FF2D75 / #408BFF in this
// file — all fixed to the correct hex.
// Removed fontFamily: "serif" from every text style — no other
// screen in the app uses serif, so this screen looked visually
// out of place. Now matches the system default sans-serif used
// everywhere else.
// Button/otp box radius and sizing brought in line with the
// conventions used on Login/Register/EmailVerification.
// =====================================================
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
    color: "#FF2D75",
  },

  card: {
    backgroundColor: "#FF2D75",
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 22,
    alignItems: "center",
    marginBottom: 28,
  },

  heading: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 15,
  },

  cardText: {
    color: "#fff",
    textAlign: "center",
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
  },

  sentText: {
    textAlign: "center",
    fontSize: 14,
    color: "#111",
  },

  emailText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 5,
    marginBottom: 25,
    color: "#111",
  },

  otpRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 18,
  },

  otpBox: {
    width: 45,
    height: 50,
    borderRadius: 10,
    backgroundColor: "#F8F8F8",
    borderWidth: 1.5,
    borderColor: "#FF2D75",
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
  },

  resendText: {
    textAlign: "center",
    color: "#FF2D75",
    fontWeight: "600",
    fontSize: 13,
    marginBottom: 15,
  },

  button: {
    backgroundColor: "#FF2D75",
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: "center",
  },

  disabledButton: {
    opacity: 0.6,
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
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
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },

  successBox: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: "center",
  },

  successTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#111",
    marginBottom: 6,
    textAlign: "center",
  },

  successMessage: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 22,
  },

  successButton: {
    width: "100%",
    backgroundColor: "#FF2D75",
    paddingVertical: 13,
    borderRadius: 25,
    alignItems: "center",
  },

  successButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
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
    backgroundColor: "#FFE1EC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  successIconCircle: {
    backgroundColor: "#E8F8EF",
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
    backgroundColor: "#FF2D75",
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