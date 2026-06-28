import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function Profile() {
  const router = useRouter();

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
      <View style={styles.avatar}>
        <Ionicons name="person-outline" size={40} color="#000" />
      </View>

      {/* Name + Email */}
      <Text style={styles.name}>Nisali Fernando</Text>
      <Text style={styles.email}>nisaliFdo@gmail.com</Text>

      {/* Section */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        <TouchableOpacity onPress={() => router.push("/(customer)/(auth)/editProfile")}>
          <Text style={styles.edit}>Edit</Text>
        </TouchableOpacity>
      </View>

      {/* Info Boxes */}
      <View style={styles.inputBox}>
        <Text style={styles.label}>Full Name</Text>
        <Text style={styles.value}>Nisali Fernando</Text>
      </View>

      <View style={styles.inputBox}>
        <Text style={styles.label}>Email Address</Text>
        <Text style={styles.value}>nisaliFdo@gmail.com</Text>
      </View>

      <View style={styles.inputBox}>
        <Text style={styles.label}>Phone Number</Text>
        <Text style={styles.value}>0712345678</Text>
      </View>

      {/* Settings */}
      <Text style={styles.sectionTitle}>Settings</Text>

      <TouchableOpacity style={styles.primaryBtn}>
        <Text style={styles.primaryText}>Change Password</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.primaryBtn}>
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

  avatar: {
    backgroundColor: "#f5b6c6",
    width: 90,
    height: 90,
    borderRadius: 45,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
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