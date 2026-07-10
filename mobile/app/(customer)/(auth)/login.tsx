import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Backend login API
const API_URL = "http://10.0.2.2:5000/api/customers/login";

export default function Login() {
  // Store input values
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Show/hide password
  const [showPassword, setShowPassword] = useState(false);

  // Runs when Log In button is pressed
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Error", data.message || "Login failed");
        return;
      }
      // Store the authentication token
      await AsyncStorage.setItem("customerToken", data.token);
      await AsyncStorage.setItem("customerData", JSON.stringify(data.customer));

      Alert.alert("Success", "Login successful");
      router.replace('/(customer)/(tabs)/home');

    } catch (error: any) {
      console.log("Login error:", error);
      Alert.alert("Error", String(error?.message || error));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>

        <View style={styles.logoRow}>
          <Image source={require('../../../assets/LimoIcon/logo.png')} style={styles.logo} />
          <Text style={styles.logoText}>LIMO{"\n"}SALON</Text>
        </View>

        <Text style={styles.heading}>Welcome Back</Text>
        <Text style={styles.subheading}>Sign in to book your next appointment</Text>

        <TextInput
          placeholder="Email"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <View style={styles.passwordBox}>
          <TextInput
            placeholder="Password"
            secureTextEntry={!showPassword}
            style={styles.passwordInput}
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Feather name={showPassword ? "eye" : "eye-off"} size={18} color="#999" />
          </TouchableOpacity>
        </View>

        <Text style={styles.forgot}>Forgot password?</Text>

        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
          <Text style={styles.loginText}>Log In</Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.line} />
          <Text style={styles.orText}>or continue with</Text>
          <View style={styles.line} />
        </View>

        <TouchableOpacity style={styles.googleBtn}>
          <Text style={styles.googleText}>Google</Text>
        </TouchableOpacity>

        <Text style={styles.registerText}>
          Don't have an account?{" "}
          <Text style={styles.register} onPress={() => router.push('/(customer)/(auth)/register')}>
            Register
          </Text>
        </Text>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#eee',
    
  },

  card: {
  flex: 1,
  backgroundColor: '#fff',
  borderTopLeftRadius: 30,
  borderTopRightRadius: 30,
  paddingVertical: 30,
  paddingHorizontal: 20,
  alignItems: 'center',
},

  /* Logo Row */
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
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

  /* Heading */
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
  },

  subheading: {
    fontSize: 13,
    color: '#777',
    textAlign: 'center',
    marginBottom: 30,
  },

  /* Inputs */
  input: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },

  forgot: {
    alignSelf: 'flex-end',
    marginTop: 8,
    fontSize: 12,
    color: '#ff1744',
  },
   
  passwordBox: {
  width: '100%',
  backgroundColor: '#f5f5f5',
  borderRadius: 10,
  paddingHorizontal: 12,
  marginTop: 10,
  flexDirection: 'row',
  alignItems: 'center',
},

passwordInput: {
  flex: 1,
  paddingVertical: 12,
  fontSize: 14,
},

  /* Login Button */
  loginBtn: {
    width: '100%',
    backgroundColor: '#ff1744',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 35,
    alignItems: 'center',
  },

  loginText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  /* Divider */
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 15,
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#ccc',
  },

  orText: {
    marginHorizontal: 8,
    fontSize: 12,
    color: '#555',
  },

  /* Google Button */
  googleBtn: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },

  googleText: {
    fontWeight: 'bold',
  },

  /* Register */
  registerText: {
    marginTop: 20,
    fontSize: 13,
  },

  register: {
    color: '#ff1744',
    fontWeight: 'bold',
  },

});