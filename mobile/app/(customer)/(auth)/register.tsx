import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useState } from "react";
import { useRouter } from "expo-router"; // ✅ added

export default function Register() {

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const router = useRouter(); // ✅ added

  return (
    <View style={styles.container}>

      {/* Logo + Title */}
      <View style={styles.logoRow}>
        <Image
          source={require('../../../assets/LimoIcon/logo.png')}
          style={styles.logo}
        />
        <Text style={styles.logoText}>LIMO{"\n"}SALON</Text>
      </View>

      <Text style={styles.title}>Create Account</Text>

      {/* First Name */}
      <View style={styles.inputRow}>
        <Ionicons name="person-outline" size={20} color="#999" />
        <TextInput placeholder="First Name" style={styles.input} />
      </View>

      {/* Last Name */}
      <View style={styles.inputRow}>
        <Ionicons name="person-outline" size={20} color="#999" />
        <TextInput placeholder="Last Name" style={styles.input} />
      </View>

      {/* Email */}
      <View style={styles.inputRow}>
        <Ionicons name="mail-outline" size={20} color="#999" />
        <TextInput placeholder="Email" keyboardType="email-address" style={styles.input} />
      </View>

      {/* Phone */}
      <View style={styles.inputRow}>
        <Ionicons name="call-outline" size={20} color="#999" />
        <TextInput placeholder="Phone Number" keyboardType="phone-pad" style={styles.input} />
      </View>

      {/* Password */}
      <View style={styles.inputRow}>
        <Ionicons name="lock-closed-outline" size={20} color="#999" />

        <TextInput
          placeholder="Password"
          secureTextEntry={!showPassword}
          style={styles.input}
        />

        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Feather
            name={showPassword ? "eye" : "eye-off"}
            size={18}
            color="#999"
          />
        </TouchableOpacity>
      </View>

      {/* Confirm Password */}
      <View style={styles.inputRow}>
        <Ionicons name="lock-closed-outline" size={20} color="#999" />

        <TextInput
          placeholder="Confirm Password"
          secureTextEntry={!showConfirmPassword}
          style={styles.input}
        />

        <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
          <Feather
            name={showConfirmPassword ? "eye" : "eye-off"}
            size={18}
            color="#999"
          />
        </TouchableOpacity>
      </View>

      {/* Button */}
      <TouchableOpacity style={styles.button}
         onPress={() => router.push('/(customer)/(auth)/PhoneVerification')}>
        <Text style={styles.buttonText}>Create Account</Text>

      </TouchableOpacity>

      {/* Login */}
      <Text style={styles.loginText}>
        I Already Have an Account{" "}
        <Text
          style={styles.loginLink}
          onPress={() => router.push("/(customer)/(auth)/login")}
        >
          Login
        </Text>
      </Text>

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

  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    marginTop: 30,
  },

  logo: {
    width: 65,
    height: 65,
    marginRight: 10,
  },

  logoText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff1744',
  },

  title: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 20,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#FF2D75",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 14,
  },

  input: {
    flex: 1,
    padding: 12,
    fontSize: 14,
  },

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

  loginText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 13,
  },

  loginLink: {
    color: "#FF2D75",
    fontWeight: "600",
  },
});