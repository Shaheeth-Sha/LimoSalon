import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function ResetSuccessfully() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Feather name="check-circle" size={90} color="#FF1462" />
        </View>

        <Text style={styles.titleText}>Password Reset Successfully</Text>
        <Text style={styles.subtitleText}>Your password has been updated.{'\n'}You can now log in with it.</Text>

        <TouchableOpacity style={styles.button} onPress={() => router.replace('/')} activeOpacity={0.8}>
          <Text style={styles.buttonText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  card: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#FDE4ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  titleText: {
    fontSize: 20,
    color: '#111',
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 14,
    color: '#777',
    marginBottom: 36,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    width: '100%',
    backgroundColor: '#FF1462',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
