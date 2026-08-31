import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AlertModal, { AlertType } from '../../components/AlertModal';
import { BASE_URL } from '../../config/api';

const PROFILE_API = `${BASE_URL}/api/staff/profile`;

// The editable half of the view/edit split introduced in Profile
// Page.tsx (per the Figma reference) — Full Name and Mobile Number
// are editable here; Email stays read-only (it's the login identity,
// same rule the customer app's editProfile.tsx already follows).
export default function EditProfile() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [alert, setAlert] = useState<{ visible: boolean; type: AlertType; title: string; message: string }>({
    visible: false,
    type: 'error',
    title: '',
    message: '',
  });

  const showAlert = (type: AlertType, title: string, message: string) =>
    setAlert({ visible: true, type, title, message });

  const closeAlert = () => setAlert((prev) => ({ ...prev, visible: false }));

  // Strict phone formatting, matching the customer app's registration
  // rules: digits only (one leading "+" allowed for a country code),
  // capped at 15 characters (E.164 max) so the field can't be filled
  // with an arbitrarily long string of numbers.
  const MAX_PHONE_LENGTH = 15;
  const handlePhoneChange = (text: string) => {
    let cleaned = text.replace(/[^\d+]/g, ''); // strip anything but digits and "+"
    cleaned = cleaned.replace(/(?!^)\+/g, ''); // only a leading "+" is allowed
    if (cleaned.length > MAX_PHONE_LENGTH) cleaned = cleaned.slice(0, MAX_PHONE_LENGTH);
    setPhone(cleaned);
  };

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('staffData');
        if (stored) {
          const staff = JSON.parse(stored);
          setName(staff.name || '');
          setPhone(staff.phone || '');
          setEmail(staff.email || '');
        }
      } catch (error) {
        console.log('Failed to load staff data:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    if (saving) return;

    if (!name.trim()) {
      showAlert('error', 'Missing Name', 'Please enter your name.');
      return;
    }

    const digitsOnly = phone.replace(/\D/g, '');
    if (phone.trim() && (digitsOnly.length < 7 || digitsOnly.length > 15)) {
      showAlert('error', 'Invalid Phone Number', 'Please enter a valid phone number (7-15 digits).');
      return;
    }

    setSaving(true);

    try {
      const token = await AsyncStorage.getItem('staffToken');

      const res = await fetch(PROFILE_API, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        showAlert('error', 'Update Failed', data.message || 'Unable to update your profile');
        return;
      }

      await AsyncStorage.setItem('staffData', JSON.stringify(data.staff));
      router.replace('/profile-updated');
    } catch (error: any) {
      showAlert('error', 'Something Went Wrong', String(error?.message || error));
    } finally {
      setSaving(false);
    }
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
      <View style={styles.headerSection}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 20 }}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color="#000" />
          <Text style={styles.backText}>Back to Profile</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Edit Profile</Text>

        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your full name"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Mobile Number</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={handlePhoneChange}
          placeholder="Not set"
          placeholderTextColor="#999"
          keyboardType="phone-pad"
          maxLength={MAX_PHONE_LENGTH}
        />

        <Text style={styles.label}>Email</Text>
        <View style={styles.readOnlyBox}>
          <Text style={styles.readOnlyText}>{email}</Text>
        </View>
        <Text style={styles.helperText}>Email can't be changed here</Text>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.disabledBtn]}
          activeOpacity={0.85}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
        </TouchableOpacity>
      </ScrollView>

      <AlertModal
        visible={alert.visible}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        onClose={closeAlert}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  headerSection: {
    width: '100%',
    paddingTop: 60,
    paddingBottom: 10,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  backButton: { flexDirection: 'row', alignItems: 'center' },
  backText: {
    fontSize: 18,
    color: '#000000',
    fontWeight: '600',
    marginLeft: 5,
  },
  content: { paddingHorizontal: 25, paddingTop: 15, alignItems: 'center' },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 25,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  label: { alignSelf: 'flex-start', marginBottom: 6, fontWeight: '600', color: '#333' },
  input: {
    width: '100%',
    padding: 15,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    marginBottom: 18,
    backgroundColor: '#fff',
  },
  readOnlyBox: {
    width: '100%',
    padding: 15,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
  },
  readOnlyText: { color: '#777', fontSize: 15 },
  helperText: { alignSelf: 'flex-start', fontSize: 11, color: '#999', marginTop: 6, marginBottom: 20 },
  saveBtn: {
    width: '100%',
    padding: 16,
    borderRadius: 10,
    backgroundColor: '#FF1462',
    alignItems: 'center',
    marginTop: 15,
    shadowColor: '#FF1462',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  disabledBtn: { opacity: 0.6 },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});
