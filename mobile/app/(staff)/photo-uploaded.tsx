import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resolveAvatarUrl } from '../../utils/resolveAvatarUrl';

// Final step of the photo-upload flow — same ring/spring-in outcome
// family as completed.tsx / profile-updated.tsx, but showing the
// actual new photo (with a green "done" badge) instead of a plain
// icon, per the Figma reference.
export default function PhotoUploaded() {
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initials, setInitials] = useState('');

  const iconScale = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('staffData');
        if (stored) {
          const staff = JSON.parse(stored);
          setAvatarUrl(resolveAvatarUrl(staff.image));
          setInitials(
            (staff.name || '?')
              .trim()
              .split(/\s+/)
              .map((part: string) => part.charAt(0).toUpperCase())
              .slice(0, 2)
              .join('')
          );
        }
      } catch (error) {
        console.log('Failed to load staff data:', error);
      }
    })();

    Animated.sequence([
      Animated.spring(iconScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      Animated.timing(contentOpacity, { toValue: 1, duration: 260, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.content}>
        <Animated.View style={[styles.avatarWrap, { transform: [{ scale: iconScale }] }]}>
          <View style={styles.avatar}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </View>
          <View style={styles.badge}>
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: contentOpacity, width: '100%', alignItems: 'center' }}>
          <Text style={styles.title}>Photo Uploaded</Text>
          <Text style={styles.message}>Your profile photo has been saved!</Text>

          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.85}
            onPress={() => router.replace('/Profile Page')}
          >
            <Text style={styles.buttonText}>Back to Profile</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  avatarWrap: { marginBottom: 24 },
  avatar: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#FADADD',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: 42, fontWeight: 'bold' },
  badge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E8A3C',
    borderWidth: 3,
    borderColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 24, fontWeight: '800', color: '#000000', textAlign: 'center' },
  message: { marginTop: 8, fontSize: 15, color: '#666666', textAlign: 'center', marginBottom: 32 },
  button: {
    width: '100%',
    minHeight: 56,
    backgroundColor: '#FF1462',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF1462',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
