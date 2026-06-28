import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function MySchedule() {
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState(7);
  const [month, setMonth] = useState("April");
  const [year, setYear] = useState(2026);
  const days = Array.from({ length: 30 }, (_, i) => i + 1);

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF' }}>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.headerTitle}>My Schedule</Text>

          <View style={styles.calendarBox}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={() => setMonth("March")}><Ionicons name="chevron-back" size={24} color="#FFF" /></TouchableOpacity>
              <View style={styles.pillContainer}>
                <Text style={styles.pillText}>{month}</Text>
                <Text style={styles.pillText}>{year}</Text>
              </View>
              <TouchableOpacity onPress={() => setMonth("May")}><Ionicons name="chevron-forward" size={24} color="#FFF" /></TouchableOpacity>
            </View>
            
            <View style={styles.weekDays}>
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => <Text key={d} style={styles.weekDayText}>{d}</Text>)}
            </View>

            <View style={styles.calendarGrid}>
              {days.map((day, i) => (
                <TouchableOpacity 
                  key={i} 
                  onPress={() => setSelectedDay(day)} 
                  style={[styles.dayCell, day === selectedDay && styles.selectedDay]}
                >
                  <Text style={[styles.dayText, day === selectedDay && {color: '#FFF', fontWeight: 'bold'}]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Text style={styles.sectionTitle}>Today's Appointments</Text>
          
          {[{time: '09:00', status: 'Booked'}, {time: '10:00', status: 'Available'}, {time: '11:00', status: 'Available'}, {time: '12:00', status: 'Booked'}].map((item, idx) => (
            <View key={idx} style={styles.slotContainer}>
              <View style={styles.timeBox}><Text style={styles.timeText}>{item.time}</Text></View>
              <TouchableOpacity 
                  style={[styles.statusBox, item.status === 'Booked' ? styles.bookedBox : styles.availableBox]} 
                  onPress={() => item.status === 'Available' && router.push('/update-availability')}
              >
                <Text style={styles.statusText}>{item.status}</Text>
              </TouchableOpacity>
            </View>
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Tab Bar - Bottom Navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/home')}>
          <Ionicons name="home" size={24} color="#FFF" />
          <Text style={styles.tabLabel}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItemActive}>
          <Ionicons name="calendar" size={24} color="#FF1462" />
          <Text style={styles.tabLabelActive}>Schedule</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/Notifications')}>
          <Ionicons name="chatbubble" size={24} color="#FFF" />
          <Text style={styles.tabLabel}>Notification</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/Profile Page')}>
          <Ionicons name="person" size={24} color="#FFF" />
          <Text style={styles.tabLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 25 },
  headerTitle: { fontSize: 28, fontWeight: '700', fontFamily: 'serif', marginBottom: 20 },
  calendarBox: { backgroundColor: '#D8A0B2', borderRadius: 20, padding: 20, marginBottom: 30 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  pillContainer: { flexDirection: 'row', gap: 10 },
  pillText: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },
  weekDays: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  weekDayText: { color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#333', borderWidth: 0.5, borderColor: '#555' },
  selectedDay: { backgroundColor: '#FF1462' },
  dayText: { color: '#FFF', fontSize: 12 },
  sectionTitle: { fontSize: 22, fontWeight: '700', marginBottom: 20 },
  slotContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  timeBox: { width: 120, height: 50, borderRadius: 25, borderWidth: 1, borderColor: '#FF1462', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  timeText: { fontSize: 16 },
  statusBox: { flex: 1, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  availableBox: { backgroundColor: '#EAAEC5' },
  bookedBox: { backgroundColor: '#FF1462' },
  statusText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
  tabBar: { flexDirection: 'row', height: 80, backgroundColor: '#FF1462', borderTopLeftRadius: 30, borderTopRightRadius: 30, justifyContent: 'space-around', alignItems: 'center', paddingBottom: 10, position: 'absolute', bottom: 0, left: 0, right: 0 },
  tabItem: { alignItems: 'center' },
  tabItemActive: { alignItems: 'center', backgroundColor: '#FFF', padding: 10, borderRadius: 20 },
  tabLabel: { color: '#FFF', fontSize: 12 },
  tabLabelActive: { color: '#FF1462', fontSize: 12, fontWeight: 'bold' }
});