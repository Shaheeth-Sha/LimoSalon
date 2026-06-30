import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router'; 

export default function Index() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const router = useRouter(); 

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.mainContainer}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* --- උඩ පස රවුම් වක්‍රය --- */}
        <View style={styles.topCurvedSection} />

        {/* --- ප්‍රධාන Content Area --- */}
        <View style={styles.contentContainer}>
          
          {/* Logo සහ නම */}
          <View style={styles.logoRow}>
            <View style={styles.logoIconBg}>
              <Ionicons name="cut" size={35} color="white" /> 
            </View>
            <View style={styles.logoTextCol}>
              <Text style={styles.logoTextTop}>LIMO</Text>
              <Text style={styles.logoTextBottom}>SALON</Text>
            </View>
          </View>

          {/* මාතෘකාව */}
          <Text style={styles.titleText}>Staff Login</Text>
          <Text style={styles.subtitleText}>Welcome back to the portal</Text>

          {/* Email Input */}
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#A0A0A0"
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!passwordVisible}
              placeholderTextColor="#A0A0A0"
            />
            <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)} style={styles.eyeIcon}>
              <Ionicons name={passwordVisible ? "eye-off" : "eye"} size={20} color="#6F6F6F" />
            </TouchableOpacity>
          </View>

          {/* Forgot Password බටන් එක */}
          <TouchableOpacity 
            style={styles.forgotPasswordWrapper}
            onPress={() => router.push('/forgot')} 
          >
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </TouchableOpacity>

          {/* Log In Button */}
          <TouchableOpacity 
            style={styles.logInButton}
            onPress={() => router.replace('/home')} 
          >
            <Text style={styles.logInButtonText}>Log In</Text>
          </TouchableOpacity>
              
          {/* Divider */}
          <View style={styles.dividerWrapper}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Button */}
          <TouchableOpacity style={styles.googleButton}>
            <Ionicons name="logo-google" size={18} color="#EA4335" style={{ marginRight: 10 }} />
            <Text style={styles.googleButtonText}>Google</Text>
          </TouchableOpacity>

        </View>

        {/* --- යට පස රවුම් වක්‍රය --- */}
        <View style={styles.bottomCurvedSection} />

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100, 
    position: 'relative',
    backgroundColor: '#FFFFFF',
  },
  topCurvedSection: {
    position: 'absolute',
    top: -120,
    width: 550, 
    height: 220,
    backgroundColor: '#FF1462', 
    borderRadius: 275, 
    zIndex: 0,
  },
  bottomCurvedSection: {
    position: 'absolute',
    bottom: -120,
    width: 550,
    height: 220,
    backgroundColor: '#FF1462',
    borderRadius: 275,
    zIndex: 0,
  },
  contentContainer: {
    width: '85%',
    alignItems: 'center',
    zIndex: 1,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  logoIconBg: {
    width: 60,
    height: 60,
    backgroundColor: '#FF1462',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoTextCol: {
    justifyContent: 'center',
  },
  logoTextTop: {
    fontSize: 24,
    color: '#FF1462',
    fontWeight: 'bold',
    letterSpacing: 1,
    lineHeight: 26,
  },
  logoTextBottom: {
    fontSize: 24,
    color: '#FF1462',
    fontWeight: 'bold',
    letterSpacing: 1,
    lineHeight: 26,
  },
  titleText: {
    fontSize: 26,
    color: '#000000',
    fontWeight: 'bold',
    marginBottom: 6,
  },
  subtitleText: {
    fontSize: 14,
    color: '#808080',
    marginBottom: 30,
    textAlign: 'center',
  },
  inputWrapper: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    marginBottom: 12,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#000000',
  },
  eyeIcon: {
    padding: 5,
  },
  forgotPasswordWrapper: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#FF1462',
    fontSize: 13,
    fontWeight: '500',
  },
  logInButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#FF1462',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  logInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dividerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#808080',
    fontSize: 13,
  },
  googleButton: {
    width: '100%',
    height: 50,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  googleButtonText: {
    color: '#333333',
    fontSize: 15,
    fontWeight: '500',
  },
});