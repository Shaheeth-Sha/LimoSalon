import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function CheckEmail() {
  const router = useRouter();

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.mainContainer}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topCurvedSection} />

        <View style={styles.contentContainer}>
          {/* සලකුණ (Check Icon) */}
          <View style={styles.iconContainer}>
            <Feather name="check-circle" size={120} color="#000000" />
          </View>

          <Text style={styles.titleText}>Check your email</Text>
          <Text style={styles.subtitleText}>A reset link has been sent to{"\n"}your email</Text>

          <TouchableOpacity style={styles.button} onPress={() => router.replace('/')}>
            <Text style={styles.buttonText}>Back to Login</Text>
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
  iconContainer: { marginBottom: 40 },
  titleText: { fontSize: 26, color: '#000000', fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  subtitleText: { fontSize: 16, color: '#000000', marginBottom: 40, textAlign: 'center', lineHeight: 22 },
  button: { width: '100%', height: 50, backgroundColor: '#FF1462', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});