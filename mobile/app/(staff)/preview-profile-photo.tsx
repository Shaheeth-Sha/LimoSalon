import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AlertModal, { AlertType } from '../../components/AlertModal';
import { BASE_URL } from '../../config/api';
import { getPendingProfilePhoto, clearPendingProfilePhoto } from '../../utils/pendingProfilePhoto';

const PHOTO_API = `${BASE_URL}/api/staff/profile/photo`;

// Second step of the photo-upload flow: shows the photo picked in
// edit-profile-photo.tsx (already square-cropped by the native picker
// UI — see pickProfileImage.ts) and lets staff confirm or back out
// before it's actually uploaded.
export default function PreviewProfilePhoto() {
  const router = useRouter();
  const pending = getPendingProfilePhoto();
  const [uploading, setUploading] = useState(false);

  const [alert, setAlert] = useState<{ visible: boolean; type: AlertType; title: string; message: string }>({
    visible: false,
    type: 'error',
    title: '',
    message: '',
  });

  const showAlert = (type: AlertType, title: string, message: string) =>
    setAlert({ visible: true, type, title, message });

  const closeAlert = () => setAlert((prev) => ({ ...prev, visible: false }));

  const handleCancel = () => {
    clearPendingProfilePhoto();
    router.back();
  };

  const handleUsePhoto = async () => {
    if (!pending || uploading) return;
    setUploading(true);

    try {
      const token = await AsyncStorage.getItem('staffToken');
      const dataUrl = `data:${pending.mimeType};base64,${pending.base64}`;

      const res = await fetch(PHOTO_API, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: dataUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        showAlert('error', 'Upload Failed', data.message || 'Unable to upload this photo.');
        return;
      }

      await AsyncStorage.setItem('staffData', JSON.stringify(data.staff));
      clearPendingProfilePhoto();
      router.replace('/photo-uploaded');
    } catch (error: any) {
      showAlert('error', 'Something Went Wrong', String(error?.message || error));
    } finally {
      setUploading(false);
    }
  };

  if (!pending) {
    // Reached with nothing actually picked yet — a stale deep link, or
    // the app got reloaded mid-flow. Nothing sane to preview, so send
    // back rather than rendering a blank image box.
    return (
      <View style={[styles.mainContainer, styles.emptyState]}>
        <Text style={styles.noticeText}>No photo selected.</Text>
        <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={() => router.back()}>
          <Text style={styles.primaryBtnText}>Go Back</Text>
        </TouchableOpacity>
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
          onPress={handleCancel}
          disabled={uploading}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Preview Photo</Text>

        <Image source={{ uri: pending.uri }} style={styles.previewImage} />
        <Text style={styles.caption}>This will be your new profile photo</Text>

        <TouchableOpacity
          style={[styles.primaryBtn, uploading && styles.disabledBtn]}
          activeOpacity={0.85}
          onPress={handleUsePhoto}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryBtnText}>Use Photo</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.outlineBtn, uploading && styles.disabledBtn]}
          activeOpacity={0.85}
          onPress={handleCancel}
          disabled={uploading}
        >
          <Text style={styles.outlineBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>

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
  emptyState: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  headerSection: {
    width: '100%',
    paddingTop: 15,
    paddingBottom: 10,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  backButton: { flexDirection: 'row', alignItems: 'center' },
  backText: {
    fontSize: 18,
    color: '#000000',
    fontWeight: '500',
    marginLeft: 5,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  content: { flex: 1, paddingHorizontal: 25, alignItems: 'center' },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    marginTop: 10,
    marginBottom: 25,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  previewImage: {
    width: 220,
    height: 220,
    borderRadius: 20,
    backgroundColor: '#FADADD',
    marginBottom: 14,
  },
  caption: { fontSize: 13, color: '#888', marginBottom: 40, textAlign: 'center' },
  noticeText: { fontSize: 15, color: '#666', marginBottom: 20, textAlign: 'center' },
  primaryBtn: {
    width: '100%',
    minHeight: 54,
    backgroundColor: '#FF1462',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
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
    borderColor: '#C13333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outlineBtnText: { color: '#C13333', fontSize: 16, fontWeight: '700' },
  disabledBtn: { opacity: 0.6 },
});
