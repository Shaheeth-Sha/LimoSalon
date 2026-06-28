import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function NewPassword() {
  const [pass, setPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [hidePass, setHidePass] = useState(true);
  const [hideConfirm, setHideConfirm] = useState(true);
  const router = useRouter();

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.mainContainer}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topCurvedSection} />

        <View style={styles.contentContainer}>
          <Text style={styles.titleText}>Enter New Password</Text>
          <Text style={styles.subtitleText}>Set Complex passwords to protect</Text>

          {/* New Password Input */}
          <View style={styles.inputWrapper}>
            <Feather name="lock" size={18} color="#FF1462" style={styles.leftIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="New Password"
              placeholderTextColor="#A0A0C0"
              secureTextEntry={hidePass}
              value={pass}
              onChangeText={setPass}
            />
            <TouchableOpacity onPress={() => setHidePass(!hidePass)}>
              <Feather name={hidePass ? "eye-off" : "eye"} size={18} color="#A0A0C0" />
            </TouchableOpacity>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputWrapper}>
            <Feather name="lock" size={18} color="#FF1462" style={styles.leftIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="Confirm Password"
              placeholderTextColor="#A0A0C0"
              secureTextEntry={hideConfirm}
              value={confirmPass}
              onChangeText={setConfirmPass}
            />
            <TouchableOpacity onPress={() => setHideConfirm(!hideConfirm)}>
              <Feather name={hideConfirm ? "eye-off" : "eye"} size={18} color="#A0A0C0" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.button} onPress={() => router.push('/reset-success')}>
            <Text style={styles.buttonText}>Reset Password</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomCurvedSection} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 100, position: 'relative' },
  topCurvedSection: { position: 'absolute', top: -120, width: 550, height: 220, backgroundColor: '#FF1462', borderRadius: 275 },
  bottomCurvedSection: { position: 'absolute', bottom: -120, width: 550, height: 220, backgroundColor: '#FF1462', borderRadius: 275 },
  contentContainer: { width: '85%', maxWidth: 340, alignItems: 'center' },
  titleText: { fontSize: 28, color: '#000000', fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  subtitleText: { fontSize: 15, color: '#8A94A6', marginBottom: 40, textAlign: 'center' },
  inputWrapper: { width: '100%', height: 50, backgroundColor: '#F8F9FB', borderRadius: 10, marginBottom: 20, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center' },
  leftIcon: { marginRight: 10 },
  textInput: { flex: 1, fontSize: 15, color: '#000000' },
  button: { width: '100%', height: 50, backgroundColor: '#FF1462', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 15 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});