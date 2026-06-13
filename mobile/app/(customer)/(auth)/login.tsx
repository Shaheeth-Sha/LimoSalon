import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { router } from 'expo-router';

export default function Login() {
  return (
    <View style={styles.container}>

      {/* Card */}
      <View style={styles.card}>

        {/* Logo + Title */}
        <View style={styles.logoRow}>
          <Image
            source={require('../../../assets/LimoIcon/logo.png')}
            style={styles.logo}
          />
          <Text style={styles.logoText}>LIMO{"\n"}SALON</Text>
        </View>

        {/* Welcome Text */}
        <Text style={styles.heading}>Welcome Back</Text>
        <Text style={styles.subheading}>
          Sign in to book your next appointment
        </Text>

        {/* Input Fields */}
        <TextInput
          placeholder="Email"
          style={styles.input}
        />

        <TextInput
          placeholder="Password"
          secureTextEntry
          style={styles.input}
        />

        {/* Forgot Password */}
        <Text style={styles.forgot}>Forgot password?</Text>

        {/* Login Button */}
        <TouchableOpacity style={styles.loginBtn}
        onPress={() => router.replace('/(customer)/(tabs)/home')}>
          <Text style={styles.loginText}>Log In</Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.line} />
          <Text style={styles.orText}>or continue with</Text>
          <View style={styles.line} />
        </View>

        {/* Google Button */}
        <TouchableOpacity style={styles.googleBtn}>
          <Text style={styles.googleText}>Google</Text>
        </TouchableOpacity>

        {/* Register */}
        <Text style={styles.registerText}>
          Don't have an account? <Text style={styles.register}
           onPress={() => router.push('/(customer)/(auth)/register')}>Register</Text>
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