import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

export default function PasswordResetSuccess() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Feather name="check-circle" size={64} color="#111" />
        </View>

        <Text style={styles.heading}>Password Reset</Text>
        <Text style={styles.subheading}>Your password has been updated successfully.</Text>

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace('/(customer)/(auth)/login')}
          activeOpacity={0.8}
        >
          <Text style={styles.backText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eee' },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingVertical: 64,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  iconCircle: { marginBottom: 20 },
  heading: { fontSize: 20, fontWeight: 'bold', color: '#111', textAlign: 'center' },
  subheading: { fontSize: 13, color: '#777', textAlign: 'center', marginTop: 8, marginBottom: 32 },
  backBtn: {
    width: '100%',
    backgroundColor: '#FF2D75',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});