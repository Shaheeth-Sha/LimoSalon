import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

export default function editProfile() {
  const router = useRouter();

  const [name, setName] = useState("Nisali Fernando");
  const [email, setEmail] = useState("nisaliFdo@gmail.com");
  const [phone, setPhone] = useState("0712345678");

  return (
    <View style={styles.container}>

      {/* Header */}
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

      {/* Section */}
      <Text style={styles.sectionTitle}>Personal Information</Text>

      {/* Inputs */}
      <Text style={styles.label}>Full Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        style={styles.input}
      />

      <Text style={styles.label}>Email Address</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />

      <Text style={styles.label}>Phone Number</Text>
      <TextInput
        value={phone}
        onChangeText={setPhone}
        style={styles.input}
      />

      {/* Buttons */}
      <View style={styles.row}>
        <TouchableOpacity style={styles.btn} onPress={() => router.back()}>
          <Text style={styles.btnText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn}>
          <Text style={styles.btnText}>Save Changes</Text>
        </TouchableOpacity>
      </View>

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

  btnText: {
    color: "#fff",
    fontWeight: "600",
  },
});