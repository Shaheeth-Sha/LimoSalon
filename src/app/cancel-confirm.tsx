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
        {/* Cancel/Close Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="close-circle-outline" size={100} color="#000000" />
        </View>

        <Text style={styles.titleText}>Cancel Appointment</Text>
        <Text style={styles.subText}>Are you sure you want to cancel{"\n"}this appointment</Text>

        {/* Two Buttons: No and Yes */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.back()}>
            <Text style={styles.buttonText}>No</Text>
          </TouchableOpacity>
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
  topCurve: { position: 'absolute', top: 0, width: width, height: 120, borderBottomLeftRadius: width / 2, borderBottomRightRadius: width / 2, transform: [{ scaleX: 1.2 }] },
  bottomCurve: { position: 'absolute', bottom: 0, width: width, height: 120, borderTopLeftRadius: width / 2, borderTopRightRadius: width / 2, transform: [{ scaleX: 1.2 }] },
  card: { width: '85%', backgroundColor: '#FFFFFF', borderRadius: 40, paddingVertical: 50, alignItems: 'center', zIndex: 1 },
  iconContainer: { marginBottom: 30 },
  titleText: { fontSize: 22, fontWeight: '700', color: '#000000', textAlign: 'center', marginBottom: 10 },
  subText: { fontSize: 15, color: '#444444', textAlign: 'center', marginBottom: 40, lineHorizontal: 22 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', width: '65%' },
  actionButton: { width: '45%', height: 40, backgroundColor: '#FF1462', justifyContent: 'center', alignItems: 'center', borderRadius: 6 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' }
});