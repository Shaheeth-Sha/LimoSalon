import React from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function Profile() {
  const router = useRouter();

  return (
    <View style={styles.mainContainer}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}><Text style={styles.avatarText}>AJ</Text></View>
          <TouchableOpacity style={styles.editIcon}><Ionicons name="pencil" size={16} color="#FFF" /></TouchableOpacity>
        </View>
        <Text style={styles.name}>Alice Jhonson</Text>
        <Text style={styles.role}>Stylist</Text>
        <View style={styles.line} />
        
        <Text style={styles.label}>Full Name</Text>
        <TextInput style={styles.input} value="Alice Johnson" />
        
        <Text style={styles.label}>Mobile Number</Text>
        <TextInput style={styles.input} value="+94 75 1234 567" />

        <TouchableOpacity style={styles.btn}><Text style={styles.btnText}>Edit Profile</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#FF1462' }]}><Text style={styles.btnText}>Logout</Text></TouchableOpacity>
        
        <View style={{ height: 100 }} />
      </ScrollView>

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
          <Ionicons name="chatbubble-ellipses-outline" size={22} color="#FFFFFF" />
          <Text style={styles.tabText}>Notification</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/Profile Page')}>
          <View style={styles.activeIconBg}>
            <Ionicons name="person" size={22} color="#FF1462" />
          </View>
          <Text style={styles.activeTabText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#FFF' },
  content: { padding: 25, alignItems: 'center', paddingTop: 60 },
  avatarContainer: { marginBottom: 15 },
  avatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#FADADD', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 40, fontWeight: 'bold' },
  editIcon: { position: 'absolute', bottom: 5, right: 5, backgroundColor: '#000', padding: 8, borderRadius: 15 },
  name: { fontSize: 22, fontWeight: 'bold' },
  role: { color: '#888', marginBottom: 20 },
  line: { width: '100%', height: 2, backgroundColor: '#000', marginBottom: 20 },
  label: { alignSelf: 'flex-start', marginBottom: 5, fontWeight: '600' },
  input: { width: '100%', padding: 15, borderWidth: 1, borderColor: '#DDD', borderRadius: 10, marginBottom: 20 },
  btn: { width: '100%', padding: 15, borderRadius: 10, backgroundColor: '#FF1462', alignItems: 'center', marginBottom: 10 },
  btnText: { color: '#FFF', fontWeight: 'bold' },
  
  // Tab Bar Styles (Home පේජ් එකේ තිබුණු විදිහටම)
  bottomTabBar: { flexDirection: 'row', backgroundColor: '#FF1462', height: 85, position: 'absolute', bottom: 0, left: 0, right: 0, justifyContent: 'space-around', alignItems: 'center', borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  tabItem: { alignItems: 'center', flex: 1 },
  activeIconBg: { backgroundColor: '#FFFFFF', width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  tabText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  activeTabText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' }
});