import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const router = useRouter();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.mainContainer}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* --- උඩ පස රවුම් වක්‍රය (Top Curve) --- */}
        <View style={styles.topCurvedSection} />

        {/* --- ප්‍රධාන Content Area --- */}
        <View style={styles.contentContainer}>
          
          {/* 1. LIMO SALON Logo එක සහ නම */}
          <View style={styles.logoRow}>
            <View style={styles.logoIconBg}>
              <Ionicons name="cut" size={35} color="white" /> 
            </View>
            <View style={styles.logoTextCol}>
              <Text style={styles.logoTextTop}>LIMO</Text>
              <Text style={styles.logoTextBottom}>SALON</Text>
            </View>
          </View>

          {/* 2. මාතෘකාව (Fogot Password) */}
          <Text style={styles.titleText}>Fogot Password</Text>
          <Text style={styles.subtitleText}>Enter your registered email</Text>

          {/* 3. Email Input එක */}
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

          {/* 4. Send Reset Link Button එක */}
          <TouchableOpacity style={styles.resetButton}>
            <Text style={styles.resetButtonText}>Send Reset link</Text>
          </TouchableOpacity>

          {/* 5. Back to Login Button එක */}
          <TouchableOpacity 
            style={styles.backToLoginWrapper}
            onPress={() => router.back()} // පරණ ලොගින් පේජ් එකට ආපහු යන්න
          >
            <Text style={styles.backToLoginText}>Back to Login</Text>
          </TouchableOpacity>

        </View>

        {/* --- යට පස රවුම් වක්‍රය (Bottom Curve) --- */}
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
  // `staff forgot.png` එකේ තියෙන විදිහටම රවුම් හැඩතල (Curves) දෙක
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
    maxWidth: 340,
    alignItems: 'center',
    zIndex: 1,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40, // මාතෘකාවට ටිකක් ඉඩ තැබීමට
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
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', // Image එකේ තියෙන Serif Font එකට සමාන පෙනුමක් ලබා දීමට
    marginBottom: 10,
  },
  subtitleText: {
    fontSize: 16,
    color: '#6E6E6E',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 35,
    textAlign: 'center',
  },
  inputWrapper: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#DCDCDC',
    borderRadius: 10,
    marginBottom: 35,
    paddingHorizontal: 15,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  textInput: {
    fontSize: 15,
    color: '#000000',
  },
  resetButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#FF1462',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backToLoginWrapper: {
    padding: 10,
  },
  backToLoginText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '500',
  },
});