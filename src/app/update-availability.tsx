import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, SafeAreaView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function UpdateAvailability() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Update Availability</Text>
        
        <Text style={styles.label}>Select Date</Text>
        <View style={styles.dateRow}>
          <TouchableOpacity style={styles.dateBtn}>
            <Text style={styles.dateText}>April 7, 2026</Text>
          </TouchableOpacity>
          <View style={styles.calThumb}>
            <Ionicons name="calendar" size={24} color="#FF1462" />
          </View>
        </View>

        <Text style={styles.label}>Select Timeslot</Text>
        <View style={styles.grid}>
          {['11:00', '11:00', '11:00', '11:00', '11:00', '11:00'].map((t, i) => (
            <TouchableOpacity key={i} style={styles.timeBtn}>
              <Text style={styles.timeText}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={() => setShowModal(true)}>
          <Text style={styles.btnText}>Save</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal - Mobile Friendly */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Ionicons name="checkmark-circle" size={80} color="#FF1462" />
            <Text style={styles.modalTitle}>Availability Updated</Text>
            <Text style={styles.modalSub}>Your schedule has been saved !</Text>
            <TouchableOpacity 
              style={styles.backBtn} 
              onPress={() => { 
                setShowModal(false); 
                router.replace('/my-schedule'); 
              }}
            >
              <Text style={styles.btnText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  content: { padding: 25 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 25, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  label: { fontSize: 16, marginBottom: 10, fontWeight: '500', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  dateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  dateBtn: { flex: 1, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#FF1462' },
  dateText: { fontSize: 15 },
  calThumb: { marginLeft: 15, padding: 10, borderWidth: 1, borderColor: '#FF1462', borderRadius: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 30 },
  timeBtn: { width: '30%', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#FF1462', alignItems: 'center' },
  timeText: { fontSize: 13 },
  saveBtn: { backgroundColor: '#FF1462', padding: 18, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { width: '85%', backgroundColor: '#FFF', borderRadius: 20, padding: 30, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 15, textAlign: 'center' },
  modalSub: { marginVertical: 10, color: '#666', textAlign: 'center', fontSize: 15 },
  backBtn: { backgroundColor: '#FF1462', width: '100%', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 20 }
});