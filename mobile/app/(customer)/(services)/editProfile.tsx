import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "http://10.0.2.2:5000/api/customers/profile";

type AlertState = {
  visible: boolean;
  title: string;
  message: string;
  onConfirm?: () => void;
};

export default function EditProfile() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [alert, setAlert] = useState<AlertState>({
    visible: false,
    title: "",
    message: "",
  });

  const showAlert = (title: string, message: string, onConfirm?: () => void) => {
    setAlert({ visible: true, title, message, onConfirm });
  };

  const closeAlert = () => {
    setAlert((prev) => ({ ...prev, visible: false }));
    if (alert.onConfirm) alert.onConfirm();
  };

  const getInitials = (value: string) => {
    const parts = value.trim().split(" ");
    if (parts.length === 0 || !parts[0]) return "";
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem("customerData");
        if (stored) {
          const customer = JSON.parse(stored);
          setName(customer.name || "");
          setEmail(customer.email || "");
          setPhone(customer.phone || "");
        }
      } catch (error) {
        console.log("Failed to load customer data:", error);
      } finally {
        setInitialLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      showAlert("Missing Information", "Please enter your name");
      return;
    }
    if (saving) return;

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem("customerToken");

      const res = await fetch(API_URL, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showAlert("Update Failed", data.message || "Please try again");
        return;
      }

      // Keep the locally cached copy in sync so Profile (and anywhere
      // else reading customerData) reflects the change immediately,
      // without needing to re-fetch from the server.
      await AsyncStorage.setItem("customerData", JSON.stringify(data.customer));

      showAlert("Saved", "Your profile has been updated", () => {
        router.back();
      });
    } catch (error: any) {
      showAlert("Something Went Wrong", String(error?.message || error));
    } finally {
      setSaving(false);
    }
  };

  if (initialLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#ff2d55" />
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>

        <Text style={styles.header}>Edit Profile</Text>

        <View style={{ width: 24 }} />
      </View>

      {/* Avatar */}
      <View style={styles.avatar}>
        <Text style={styles.avatarInitials}>{getInitials(name)}</Text>
      </View>

      {/* Section */}
      <Text style={styles.sectionTitle}>Personal Information</Text>

      {/* Inputs */}
      <Text style={styles.label}>Full Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        style={styles.input}
        placeholder="Your full name"
        placeholderTextColor="#999"
      />

      <Text style={styles.label}>Email Address</Text>
      <View style={styles.readOnlyBox}>
        <Text style={styles.readOnlyText}>{email}</Text>
        <Feather name="lock" size={14} color="#999" />
      </View>
      <Text style={styles.helperText}>Email can't be changed here</Text>

      <Text style={styles.label}>Phone Number</Text>
      <TextInput
        value={phone}
        onChangeText={setPhone}
        style={styles.input}
        placeholder="Add a phone number"
        placeholderTextColor="#999"
        keyboardType="phone-pad"
      />

      {/* Buttons */}
      <View style={styles.row}>
        <TouchableOpacity style={styles.btn} onPress={() => router.back()} disabled={saving}>
          <Text style={styles.btnText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, saving && styles.btnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.btnText}>{saving ? "Saving..." : "Save Changes"}</Text>
        </TouchableOpacity>
      </View>

      {/* Alert modal */}
      <Modal visible={alert.visible} transparent animationType="fade" onRequestClose={closeAlert}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <Feather name="check" size={28} color="#2ECC71" />
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
    backgroundColor: "#F4F4F4",
    paddingHorizontal: 20,
    paddingTop: 60,
  },

  centered: {
    justifyContent: "center",
    alignItems: "center",
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  header: {
    fontSize: 18,
    fontWeight: "600",
  },

  avatar: {
    backgroundColor: "#f5b6c6",
    width: 90,
    height: 90,
    borderRadius: 45,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 20,
  },

  avatarInitials: {
    fontSize: 28,
    fontWeight: "700",
    color: "#7a1f33",
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 10,
  },

  label: {
    fontSize: 12,
    color: "#555",
    marginBottom: 4,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ff4d6d",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#fff",
  },

  readOnlyBox: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#f0f0f0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  readOnlyText: {
    fontSize: 14,
    color: "#666",
  },

  helperText: {
    fontSize: 11,
    color: "#999",
    marginTop: 4,
    marginBottom: 12,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },

  btn: {
    backgroundColor: "#ff2d55",
    paddingVertical: 12,
    borderRadius: 10,
    width: "48%",
    alignItems: "center",
  },

  btnDisabled: {
    opacity: 0.6,
  },

  btnText: {
    color: "#fff",
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
    backgroundColor: "#E8F8EF",
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
    backgroundColor: "#ff2d55",
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