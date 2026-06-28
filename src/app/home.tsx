import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router'; // 👈 Expo Router සම්බන්ධ කලා

export default function Home() {
  const [search, setSearch] = useState('');
  const router = useRouter(); // 👈 Router එක ඩිෆයින් කලා

  const todaysAppointments = [
    { id: '1', name: 'Nimasha Kumara', service: 'Hair Cut', time: '10.00A.M', status: 'Pending', img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
    { id: '2', name: 'Hiruni Navodya', service: 'Color treatment', time: '12.00 P.M', status: 'Confirmed', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
  ];

  const upcomingAppointments = [
    { id: '3', name: 'Amasha Pathirana', service: 'Hair Cut', time: '10.00A.M Tomorow', status: 'Pending', img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150' },
    { id: '4', name: 'Naduni Wasana', service: 'Facial treatments', time: '13.00 P.M', status: 'Pending', img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150' },
  ];

  return (
    <View style={styles.mainContainer}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {}
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.greetingText}>Good Morning,</Text>
          <Text style={styles.userNameText}>Venumi Rathnayeka</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchWrapper}>
          <Ionicons name="search-outline" size={22} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Appointments"
            placeholderTextColor="#A0A4A8"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {}
        {/* Today's Appointment Section */}
        <Text style={styles.sectionTitle}>Today's Appointment</Text>
        {todaysAppointments.map((item) => (
          <View key={item.id} style={styles.appointmentCard}>
            <Image source={{ uri: item.img }} style={styles.avatar} />
            <View style={styles.cardDetails}>
              <View style={styles.rowLayout}>
                <Text style={styles.clientName} numberOfLines={2}>{item.name}</Text>
                
                <View style={styles.infoStack}>
                  <Text style={styles.serviceText} numberOfLines={1}>{item.service}</Text>
                  <Text style={styles.timeText}>{item.time}</Text>
                </View>
              </View>
            </View>
            {/* 💡 මෙතන soft pink status badge එක TouchableOpacity එකක් කරලා /schedule පේජ් එකට ලින්ක් කලා */}
            <TouchableOpacity 
              style={styles.statusBadge}
              activeOpacity={0.7}
              onPress={() => router.push('/schedule')}
            >
              <Text style={styles.statusText}>{item.status}</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Clean Divider Line */}
        <View style={styles.divider} />

        {}
        {/* Upcoming Appointments Section */}
        <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
        {upcomingAppointments.map((item) => (
          <View key={item.id} style={styles.appointmentCard}>
            <Image source={{ uri: item.img }} style={styles.avatar} />
            <View style={styles.cardDetails}>
              <View style={styles.rowLayout}>
                <Text style={styles.clientName} numberOfLines={2}>{item.name}</Text>
                
                <View style={styles.infoStack}>
                  <Text style={styles.serviceText} numberOfLines={1}>{item.service}</Text>
                  <Text style={styles.timeText}>{item.time}</Text>
                </View>
              </View>
            </View>
            {/* 💡 මෙතනත් soft pink status badge එක TouchableOpacity එකක් කරලා /schedule පේජ් එකට ලින්ක් කලා */}
            <TouchableOpacity 
              style={styles.statusBadge}
              activeOpacity={0.7}
              onPress={() => router.push('/schedule')}
            >
              <Text style={styles.statusText}>{item.status}</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Extra bottom padding */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {}
      {/* Modern Bottom Navigation Bar */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity style={styles.tabItem}>
          <View style={styles.activeIconBg}>
            <Ionicons name="home" size={22} color="#FF1462" />
          </View>
          <Text style={styles.activeTabText}>Home</Text>
        </TouchableOpacity>

        {/* 👈 💡 Schedule ක්ලික් කරපු ගමන් කෙලින්ම My Schedule (Calendar) පේජ් එකට යන්න '/my-schedule' පාර දුන්නා */}
        <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/my-schedule')}>
          <Ionicons name="calendar-outline" size={22} color="#FFFFFF" style={styles.inactiveIcon} />
          <Text style={styles.tabText}>Schedule</Text>
        </TouchableOpacity>
         
         <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/Notifications')}>
          <Ionicons name="chatbubble-ellipses-outline" size={22} color="#FFFFFF" style={styles.inactiveIcon} />
          <Text style={styles.tabText}>Notification</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/Profile Page')}>
          <Ionicons name="person-outline" size={22} color="#FFFFFF" style={styles.inactiveIcon} />
          <Text style={styles.tabText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 35 : 55,
  },
  headerSection: {
    marginBottom: 25,
  },
  greetingText: {
    fontSize: 28,
    color: '#1A1A1A',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    letterSpacing: -0.2,
  },
  userNameText: {
    fontSize: 28,
    color: '#1A1A1A',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    letterSpacing: -0.2,
    marginTop: 4,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F3F6',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 54,
    marginBottom: 30,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
  },
  sectionTitle: {
    fontSize: 19,
    color: '#1A1A1A',
    fontWeight: '500',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12, // image_c76906.png එකේ විදිහට කලා
    paddingHorizontal: 12,
    height: 95,
    marginBottom: 15,
    backgroundColor: '#FFFFFF',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 12,
  },
  cardDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  rowLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clientName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    width: '45%',
  },
  infoStack: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
    width: '55%',
    paddingLeft: 5,
  },
  serviceText: {
    fontSize: 15,
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 2,
  },
  timeText: {
    fontSize: 15,
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  statusBadge: {
    width: 90,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EAAEC5',
    borderRadius: 8, // image_c76906.png එකේ විදිහට කලා
    marginLeft: 5,
  },
  statusText: {
    color: '#000000',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 22,
    width: '100%',
  },
  bottomTabBar: {
    flexDirection: 'row',
    backgroundColor: '#FF1462',
    height: 85,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 20 : 5,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  activeIconBg: {
    backgroundColor: '#FFFFFF',
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  inactiveIcon: {
    marginBottom: 4,
  },
  tabText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});