import React from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function Notifications() {
  const router = useRouter();
  const notifications = [
    { title: 'New Booking', desc: 'James Park booked a Hair cut for 10.00 AM', time: '9min ago' },
    { title: 'Reminder', desc: 'Sara Nail-colour treatment in 30 minutes', time: '30min ago' },
    { title: 'New Booking', desc: 'James Smith booked a Hair cut for 11.00 AM', time: '45min ago' },
  ];

  return (
    <View style={styles.mainContainer}>
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.content}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subTitle}>Today</Text>
          {notifications.map((item, i) => (
            <View key={i} style={styles.card}>
              <View style={styles.iconBox}><Ionicons name="notifications" size={24} color="#FF1462" /></View>
              <View style={styles.textContainer}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDesc}>{item.desc}</Text>
              </View>
              <View style={styles.badge}><Text style={styles.badgeText}>2</Text></View>
              <Text style={styles.time}>{item.time}</Text>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/home')}>
          <Ionicons name="home-outline" size={22} color="#FFFFFF" />
          <Text style={styles.tabText}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/my-schedule')}>
          <Ionicons name="calendar-outline" size={22} color="#FFFFFF" />
          <Text style={styles.tabText}>Schedule</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/Notifications')}>
          <View style={styles.activeIconBg}>
            <Ionicons name="chatbubble-ellipses" size={22} color="#FF1462" />
          </View>
          <Text style={styles.activeTabText}>Notification</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/Profile Page')}>
          <Ionicons name="person-outline" size={22} color="#FFFFFF" />
          <Text style={styles.tabText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#FFF' },
  container: { flex: 1 },
  content: { padding: 25 },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  subTitle: { fontSize: 16, color: '#888', marginBottom: 15 },
  card: { flexDirection: 'row', backgroundColor: '#FBE4ED', padding: 15, borderRadius: 20, marginBottom: 15, alignItems: 'center' },
  iconBox: { backgroundColor: '#FFF', padding: 10, borderRadius: 10, marginRight: 15 },
  textContainer: { flex: 1 },
  cardTitle: { fontWeight: 'bold', fontSize: 16 },
  cardDesc: { fontSize: 13, color: '#555' },
  badge: { backgroundColor: '#FF1462', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', position: 'absolute', top: 10, right: 10 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  time: { fontSize: 12, color: '#888', position: 'absolute', bottom: 10, right: 10 },
  
  // Tab Bar Styles
  bottomTabBar: { flexDirection: 'row', backgroundColor: '#FF1462', height: 85, borderTopLeftRadius: 30, borderTopRightRadius: 30, justifyContent: 'space-around', alignItems: 'center', paddingBottom: 5 },
  tabItem: { alignItems: 'center', flex: 1 },
  activeIconBg: { backgroundColor: '#FFFFFF', width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  tabText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  activeTabText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' }
});