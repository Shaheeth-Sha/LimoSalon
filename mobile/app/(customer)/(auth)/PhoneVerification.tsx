import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function PhoneVerification() {
  return (
    <View style={styles.container}>
      
      {/* Logo Row */}
      <View style={styles.logoRow}>
        <Image
          source={require("../../../assets/LimoIcon/logo.png")}
          style={styles.logo}
        />
        <Text style={styles.logoText}>LIMO{"\n"}SALON</Text>
      </View>

      {/* Pink Info Box */}
      <View style={styles.card}>
        <Ionicons name="phone-portrait-outline" size={40} color="#fff" />

        <Text style={styles.cardTitle}>Phone Verification</Text>

        <Text style={styles.cardSubText}>
          We will send you a one-time{"\n"}
          password to verify your phone number
        </Text>
      </View>

      {/* Phone Input */}
      <View style={styles.inputRow}>
        <Text style={styles.countryCode}>+94</Text>
        <TextInput
          placeholder="Phone Number"
          keyboardType="phone-pad"
          style={styles.input}
        />
        
      </View>

      {/* Button */}
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Send OTP</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 70,
  },

  /* Logo */
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    marginTop: 30,
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

  /* Pink Card */
  card: {
    backgroundColor: "#E57390", // softer pink like design
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
    marginBottom: 25,
  },

  cardTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 10,
  },

  cardSubText: {
    color: "#fff",
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },

  /* Input */
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 20,
  },

  countryCode: {
    fontSize: 14,
    color: "#333",
    marginRight: 10,
  },

  input: {
    flex: 1,
    padding: 12,
    fontSize: 14,
  },

  /* Button */
 button: {
    backgroundColor: "#FF2D75",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});