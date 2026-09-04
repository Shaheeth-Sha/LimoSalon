import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AlertModal, { AlertType } from '../../components/AlertModal';
import { BASE_URL } from '../../config/api';
import { useStaffUnreadCount } from '../../hooks/useStaffUnreadCount';
import Avatar from '../../components/Avatar';

const PROFILE_API = `${BASE_URL}/api/staff/profile`;

type StaffProfile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  image?: string;
};

// Redesigned to match the Figma reference: a view-only profile card
// (name/role/photo, Full Name + Mobile Number + Email shown but not
// editable here) with a single "Edit Profile" button that now routes
// to its own screen (edit-profile.tsx) instead of toggling an inline
// edit state — same split the customer app's profile screen already
// uses (profile.tsx view -> editProfile.tsx edit). The avatar's pencil
// icon is a separate entry point into the new photo-upload flow
// (edit-profile-photo.tsx -> preview-profile-photo.tsx ->
// photo-uploaded.tsx).
export default function Profile() {
  const router = useRouter();
  const { unreadCount } = useStaffUnreadCount();
  const [staff, setStaff] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [alert, setAlert] = useState<{ visible: boolean; type: AlertType; title: string; message: string }>({
    visible: false,
    type: 'error',
    title: '',
    message: '',
  });

  const showAlert = (type: AlertType, title: string, message: string) =>
    setAlert({ visible: true, type, title, message });

  const closeAlert = () => setAlert((prev) => ({ ...prev, visible: false }));

  const loadProfile = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('staffToken');

      if (!token) {
        router.replace('/');
        return;
      }

      const res = await fetch(PROFILE_API, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        await AsyncStorage.multiRemove(['staffToken', 'staffData']);
        router.replace('/');
        return;
      }

      setStaff(data.staff);
      await AsyncStorage.setItem('staffData', JSON.stringify(data.staff));
    } catch (error) {
      console.error('Load staff profile failed:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Refetch every time this screen regains focus — coming back here
  // after editing the name/phone or uploading a new photo (both live
  // on their own screens now) needs to show the fresh data right
  // away, not whatever loaded the first time this screen ever
  // mounted. Same fix already applied to my-schedule.tsx / bookings.tsx
  // this session for the same class of staleness bug.
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['staffToken', 'staffData']);
    router.replace('/');
  };

  if (loading) {
    return (
      <View style={[styles.mainContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#FF1462" />
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Profile</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Same shared Avatar component every other staff screen uses
            to show this person's photo (customer-profile.tsx,
            top-customer.tsx, schedule.tsx, home.tsx...) — this screen
            used to hand-roll its own off-brand pink circle instead. */}
        <View style={styles.avatarContainer}>
          <Avatar uri={staff?.image} name={staff?.name} size={120} textStyle={styles.avatarText} />
          <TouchableOpacity
            style={styles.editIcon}
            activeOpacity={0.8}
            onPress={() => router.push('/edit-profile-photo')}
          >
            <Ionicons name="pencil" size={16} color="#FFF" />
          </TouchableOpacity>
        </View>
        <Text style={styles.name}>{staff?.name}</Text>
        <Text style={styles.role}>{staff?.role}</Text>

        <Text style={styles.label}>Full Name</Text>
        <View style={styles.readOnlyBox}>
          <Text style={styles.readOnlyText}>{staff?.name}</Text>
        </View>

        <Text style={styles.label}>Mobile Number</Text>
        <View style={styles.readOnlyBox}>
          <Text style={styles.readOnlyText}>{staff?.phone || 'Not set'}</Text>
        </View>

        <Text style={styles.label}>Email</Text>
        <View style={styles.readOnlyBox}>
          <Text style={styles.readOnlyText}>{staff?.email}</Text>
        </View>

        <TouchableOpacity style={styles.btn} onPress={() => router.push('/edit-profile')}>
          <Text style={styles.btnText}>Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, styles.logoutBtn]} onPress={handleLogout}>
          <Text style={[styles.btnText, styles.logoutBtnText]}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      <AlertModal
        visible={alert.visible}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        onClose={closeAlert}
      />

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
          <View>
            <Ionicons name="chatbubble-ellipses-outline" size={22} color="#FFFFFF" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </View>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#000' },
  avatarContainer: { marginBottom: 15 },
  avatarText: { fontSize: 40, fontWeight: 'bold' },
  editIcon: { position: 'absolute', bottom: 5, right: 5, backgroundColor: '#000', padding: 8, borderRadius: 15 },
  name: { fontSize: 22, fontWeight: 'bold' },
  role: { color: '#888', marginBottom: 20 },
  label: { alignSelf: 'flex-start', marginBottom: 5, fontWeight: '600' },
  readOnlyBox: {
    width: '100%',
    padding: 15,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    marginBottom: 20,
    backgroundColor: '#F5F5F5',
  },
  readOnlyText: { color: '#333', fontSize: 15 },
  btn: { width: '100%', padding: 15, borderRadius: 25, backgroundColor: '#FF1462', alignItems: 'center', marginBottom: 10 },
  btnText: { color: '#FFF', fontWeight: 'bold' },
  logoutBtn: { backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#FF1462' },
  logoutBtnText: { color: '#FF1462' },

  // Tab Bar Styles (Home පේජ් එකේ තිබුණු විදිහටම)
  bottomTabBar: { flexDirection: 'row', backgroundColor: '#FF1462', height: 85, position: 'absolute', bottom: 0, left: 0, right: 0, justifyContent: 'space-around', alignItems: 'center', borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  tabItem: { alignItems: 'center', flex: 1 },
  activeIconBg: { backgroundColor: '#FFFFFF', width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  tabText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  activeTabText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#FF1462',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  badgeText: { color: '#FF1462', fontSize: 9, fontWeight: '700' },
});
