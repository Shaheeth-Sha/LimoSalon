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
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import { BASE_URL } from "../../../config/api";

// Reads the same global object Register.tsx writes to — no import
// path needed, avoids Metro resolution issues.
declare global {
  // eslint-disable-next-line no-var
  var __pendingRegistration:
    | { name: string; email: string; phone: string; password: string }
    | null
    | undefined;
}

const API_URL = `${BASE_URL}/api/customers`;

type AlertState = {
  visible: boolean;
  title: string;
  message: string;
};

export default function EmailVerification() {
  const router = useRouter();

  // Fixed: previously read name/email/phone/password from route
  // params. Now reads from the in-memory registration holder set by
  // Register.tsx, so nothing sensitive travels through navigation.
  const pending = global.__pendingRegistration;
  const registeredEmail = pending?.email ?? "";

  const [loading, setLoading] = useState(false);

  const [alert, setAlert] = useState<AlertState>({
    visible: false,
    title: "",
    message: "",
  });

  const showAlert = (title: string, message: string) => {
    setAlert({ visible: true, title, message });
  };

  const closeAlert = () => setAlert((prev) => ({ ...prev, visible: false }));

  // Guard: if someone lands on this screen without having gone
  // through Register first (e.g. app was reloaded mid-flow), there's
  // no pending registration to verify — send them back to Register
  // instead of showing a broken/empty screen.
  useEffect(() => {
    if (!pending) {
      router.replace("/(customer)/(auth)/register");
    }
  }, [pending]);

  const sendOtp = async () => {
    if (!registeredEmail) {
      showAlert("Missing Information", "Email address is missing.");
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
        showAlert("Error", data.message || "Failed to send OTP");
        return;
      }

      router.push("/(customer)/(auth)/VerifyOtp");
    } catch (error) {
      showAlert("Connection Error", "Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  if (!pending) {
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
        <Ionicons name="mail-outline" size={60} color="#fff" />
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
        activeOpacity={0.8}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Send Email OTP</Text>
        )}
      </TouchableOpacity>

      <Modal visible={alert.visible} transparent animationType="fade" onRequestClose={closeAlert}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>

            <View style={styles.modalIconCircle}>
              <Feather name="alert-circle" size={28} color="#FF2D55" />
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
    color: "#FF2D55",
  },
  card: {
    backgroundColor: "#FF2D55",
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
    borderRadius: 14,
    padding: 14,
    marginBottom: 30,
    fontSize: 15,
    color: "#333",
    backgroundColor: "#F8F8F8",
  },
  button: {
    backgroundColor: "#FF2D55",
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
    fontWeight: "600",
  },
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