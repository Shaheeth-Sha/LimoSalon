import { useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { resolveAvatarUrl } from "../../../utils/resolveAvatarUrl";

interface CustomerData {
  id: string;
  name: string;
  email: string;
  phone: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  authProvider?: "local" | "google";
  avatar?: string;
}

export default function Profile() {
  const router = useRouter();

  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCustomerData = async () => {
    try {
      const stored = await AsyncStorage.getItem("customerData");
      if (stored) {
        setCustomer(JSON.parse(stored));
      }
    } catch (error) {
      console.log("Failed to load customer data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Reload whenever this screen comes back into focus — picks up
  // changes made on editProfile without needing a manual refresh.
  useFocusEffect(
    useCallback(() => {
      loadCustomerData();
    }, [])
  );

  const handleSignOut = async () => {
    await AsyncStorage.removeItem("customerToken");
    await AsyncStorage.removeItem("customerData");
    router.replace("/(customer)/(auth)/login");
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#ff2d55" />
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.value}>Unable to load profile. Please log in again.</Text>
        <TouchableOpacity
          style={[styles.primaryBtn, { marginTop: 16, width: "100%" }]}
          onPress={() => router.replace("/(customer)/(auth)/login")}
        >
          <Text style={styles.primaryText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isGoogleAccount = customer.authProvider === "google";

  return (
    <View style={styles.container}>

      {/* Header with Back */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>

        <Text style={styles.header}>My Profile</Text>

        <View style={{ width: 24 }} />
      </View>

      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          {resolveAvatarUrl(customer.avatar) ? (
            <Image source={{ uri: resolveAvatarUrl(customer.avatar)! }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarInitials}>{getInitials(customer.name)}</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.editIcon}
          activeOpacity={0.8}
          onPress={() => router.push("/(customer)/(services)/editProfilePhoto")}
        >
          <Ionicons name="pencil" size={14} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Name + Email */}
      <Text style={styles.name}>{customer.name}</Text>
      <Text style={styles.email}>{customer.email}</Text>

      {/* Section */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        <TouchableOpacity onPress={() => router.push("/(customer)/(services)/editProfile")}>
          <Text style={styles.edit}>Edit</Text>
        </TouchableOpacity>
      </View>

      {/* Info Boxes */}
      <View style={styles.inputBox}>
        <Text style={styles.label}>Full Name</Text>
        <Text style={styles.value}>{customer.name}</Text>
      </View>

      <View style={styles.inputBox}>
        <Text style={styles.label}>Email Address</Text>
        <Text style={styles.value}>{customer.email}</Text>
      </View>

      <View style={styles.inputBox}>
        <Text style={styles.label}>Phone Number</Text>
        <Text style={styles.value}>
          {customer.phone ? customer.phone : "Not added yet"}
        </Text>
      </View>

      {/* Settings */}
      <Text style={styles.sectionTitle}>Settings</Text>

      {/* Google accounts have no password to change — hide this
          button rather than sending them into a flow that will
          just fail on the backend. */}
      {!isGoogleAccount && (
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push("/(customer)/(auth)/forgotPassword")}
        >
          <Text style={styles.primaryText}>Change Password</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.primaryBtn} onPress={handleSignOut}>
        <Text style={styles.primaryText}>Sign Out</Text>
      </TouchableOpacity>

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
    marginBottom: 20,
  },

  header: {
    fontSize: 18,
    fontWeight: "600",
  },

  avatarContainer: {
    alignSelf: "center",
    marginBottom: 10,
  },

  avatar: {
    backgroundColor: "#f5b6c6",
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },

  avatarImage: {
    width: "100%",
    height: "100%",
  },

  avatarInitials: {
    fontSize: 28,
    fontWeight: "700",
    color: "#7a1f33",
  },

  editIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#000",
    padding: 6,
    borderRadius: 12,
  },

  name: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },

  email: {
    textAlign: "center",
    fontSize: 13,
    color: "#777",
    marginBottom: 20,
  },

  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
  },

  edit: {
    color: "#ff2d55",
    fontWeight: "500",
  },

  inputBox: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },

  label: {
    fontSize: 11,
    color: "#777",
  },

  value: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: 2,
  },

  /* SAME BUTTON STYLE FOR BOTH */
  primaryBtn: {
    backgroundColor: "#ff2d55",
    padding: 14,
    borderRadius: 10,
    marginTop: 10,
    alignItems: "center",
  },

  primaryText: {
    color: "#fff",
    fontWeight: "600",
  },
});