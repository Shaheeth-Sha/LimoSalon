import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AlertModal, { AlertType } from '../../components/AlertModal';
import { BASE_URL } from '../../config/api';
import { resolveAvatarUrl } from '../../utils/resolveAvatarUrl';
import { pickProfileImage } from '../../utils/pickProfileImage';
import { setPendingProfilePhoto } from '../../utils/pendingProfilePhoto';

const PHOTO_API = `${BASE_URL}/api/staff/profile/photo`;

// First step of the photo-upload flow from the Figma reference: Take
// Photo / Upload from Gallery both hand off to preview-profile-photo.tsx
// via pendingProfilePhoto.ts (see that file for why this isn't passed
// as a router param); Remove Photo deletes the current photo directly
// since there's nothing to preview there.
export default function EditProfilePhoto() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [image, setImage] = useState<string | undefined>(undefined);
  const [removing, setRemoving] = useState(false);
  const [picking, setPicking] = useState<'camera' | 'gallery' | null>(null);

  const [alert, setAlert] = useState<{ visible: boolean; type: AlertType; title: string; message: string }>({
    visible: false,
    type: 'error',
    title: '',
    message: '',
  });

  const showAlert = (type: AlertType, title: string, message: string) =>
    setAlert({ visible: true, type, title, message });

  const closeAlert = () => setAlert((prev) => ({ ...prev, visible: false }));

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const stored = await AsyncStorage.getItem('staffData');
          if (stored) {
            const staff = JSON.parse(stored);
            setName(staff.name || '');
            setImage(staff.image || undefined);
          }
        } catch (error) {
          console.log('Failed to load staff data:', error);
        }
      })();
    }, [])
  );

  const handlePick = async (source: 'camera' | 'gallery') => {
    if (picking) return;
    setPicking(source);

    try {
      const picked = await pickProfileImage(source);
      if (!picked) return;

      setPendingProfilePhoto(picked);
      router.push('/preview-profile-photo');
    } catch (error: any) {
      showAlert('error', 'Unable to Open', String(error?.message || error));
    } finally {
      setPicking(null);
    }
  };

  const handleRemove = async () => {
    if (removing || !image) return;
    setRemoving(true);

    try {
      const token = await AsyncStorage.getItem('staffToken');

      const res = await fetch(PHOTO_API, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        showAlert('error', 'Unable to Remove', data.message || 'Please try again.');
        return;
      }

      await AsyncStorage.setItem('staffData', JSON.stringify(data.staff));
      setImage(undefined);
      showAlert('success', 'Photo Removed', 'Your profile photo has been removed.');
    } catch (error: any) {
      showAlert('error', 'Something Went Wrong', String(error?.message || error));
    } finally {
      setRemoving(false);
    }
  };

  const initials = (name || '?')
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

  const avatarUrl = resolveAvatarUrl(image);
  const busy = Boolean(picking) || removing;

  return (
    <View style={styles.mainContainer}>
      <View style={styles.headerSection}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 20 }}
          onPress={() => router.back()}
          disabled={busy}
        >
          <Ionicons name="chevron-back" size={24} color="#000" />
          <Text style={styles.backText}>Back to Profile</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Edit Profile Photo</Text>

        <View style={styles.avatar}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{initials}</Text>
          )}
        </View>
        <Text style={styles.name}>{name}</Text>

        <TouchableOpacity
          style={[styles.primaryBtn, busy && styles.disabledBtn]}
          activeOpacity={0.85}
          onPress={() => handlePick('camera')}
          disabled={busy}
        >
          <Ionicons name="camera-outline" size={20} color="#FFF" />
          <Text style={styles.primaryBtnText}>
            {picking === 'camera' ? 'Opening Camera...' : 'Take Photo'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.outlineBtn, busy && styles.disabledBtn]}
          activeOpacity={0.85}
          onPress={() => handlePick('gallery')}
          disabled={busy}
        >
          <Ionicons name="cloud-upload-outline" size={20} color="#FF1462" />
          <Text style={styles.outlineBtnText}>
            {picking === 'gallery' ? 'Opening Gallery...' : 'Upload from Gallery'}
          </Text>
        </TouchableOpacity>

        {Boolean(image) && (
          <TouchableOpacity
            style={[styles.removeBtn, busy && styles.disabledBtn]}
            activeOpacity={0.85}
            onPress={handleRemove}
            disabled={busy}
          >
            <Ionicons name="close-circle-outline" size={20} color="#C13333" />
            <Text style={styles.removeBtnText}>{removing ? 'Removing...' : 'Remove Photo'}</Text>
          </TouchableOpacity>
        )}
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
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FADADD',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 12,
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: 40, fontWeight: 'bold' },
  name: { fontSize: 18, fontWeight: '700', marginBottom: 30 },
  primaryBtn: {
    width: '100%',
    minHeight: 54,
    backgroundColor: '#FF1462',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 9,
    marginBottom: 14,
    shadowColor: '#FF1462',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  outlineBtn: {
    width: '100%',
    minHeight: 54,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FF1462',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 9,
    marginBottom: 14,
  },
  outlineBtnText: { color: '#FF1462', fontSize: 16, fontWeight: '700' },
  removeBtn: {
    width: '100%',
    minHeight: 54,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#F3C6C6',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 9,
    marginBottom: 14,
  },
  removeBtnText: { color: '#C13333', fontSize: 16, fontWeight: '700' },
  disabledBtn: { opacity: 0.6 },
});
