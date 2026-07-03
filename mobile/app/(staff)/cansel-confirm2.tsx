import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

export default function CancelConfirm() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={[styles.topCurve, { backgroundColor: '#FF1462' }]} />

      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Ionicons name="close-circle-outline" size={100} color="#000000" />
        </View>

        <Text style={styles.titleText}>Cancel Appointment</Text>
        <Text style={styles.subText}>Are you sure you want to cancel{"\n"}this appointment</Text>

        <View style={styles.buttonRow}>
          {/* No ebuwama ආපහු schedule details ekata yanawa */}
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/schedule')}>
            <Text style={styles.buttonText}>No</Text>
          </TouchableOpacity>
          {/* Yes ebuwama success screen ekata yanawa */}
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/cancel-success')}>
            <Text style={styles.buttonText}>Yes</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.bottomCurve, { backgroundColor: '#FF1462' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EBEBEB', justifyContent: 'center', alignItems: 'center' },
  topCurve: { position: 'absolute', top: -50, width: width, height: 160, borderBottomLeftRadius: width / 1.8, borderBottomRightRadius: width / 1.8, transform: [{ scaleX: 1.3 }] },
  bottomCurve: { position: 'absolute', bottom: -50, width: width, height: 160, borderTopLeftRadius: width / 1.8, borderTopRightRadius: width / 1.8, transform: [{ scaleX: 1.3 }] },
  card: { width: '85%', height: '75%', backgroundColor: '#FFFFFF', borderRadius: 40, alignItems: 'center', justifyContent: 'center', zIndex: 1, elevation: 5 },
  iconContainer: { marginBottom: 30 },
  titleText: { fontSize: 24, fontWeight: '700', color: '#000000', marginBottom: 12 },
  subText: { fontSize: 16, color: '#444444', textAlign: 'center', marginBottom: 40 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', width: '65%' },
  actionButton: { width: '45%', height: 42, backgroundColor: '#FF1462', justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' }
});