import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { resolveAvatarUrl } from '../utils/resolveAvatarUrl';

type AvatarProps = {
  // Staff.image / Customer.avatar / Booking.staff.image — the server-
  // relative path avatarStorage.js hands back. resolveAvatarUrl turns
  // it into a full URL; a blank/unset value falls back to initials.
  uri?: string | null;
  name?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  // Background color for the initials-fallback circle (each screen's
  // existing initials circles used their own accent color — passing
  // this keeps that per-screen identity instead of forcing one brand
  // color everywhere real photos aren't available yet).
  fallbackColor?: string;
};

// Shared "show the real photo, or initials if there isn't one yet"
// pattern — first built for each person's own profile screen
// (profile.tsx/edit-profile-photo.tsx), now the single implementation
// reused everywhere a staff member's or customer's photo needs to
// show up on the OTHER side of the app too (staff picker, booking
// confirmations, appointment details, schedule lists, reviews) — the
// real-world-app expectation that a person's photo follows them
// everywhere they appear, not just on their own profile tab.
export default function Avatar({ uri, name, size = 44, style, textStyle, fallbackColor = '#FF1462' }: AvatarProps) {
  const resolvedUri = resolveAvatarUrl(uri);
  const initial = (name || '').trim().charAt(0).toUpperCase() || '?';
  const dimStyle: ViewStyle = { width: size, height: size, borderRadius: size / 2 };

  if (resolvedUri) {
    return <Image source={{ uri: resolvedUri }} style={[styles.image, dimStyle, style as any]} />;
  }

  return (
    <View style={[styles.circle, dimStyle, { backgroundColor: fallbackColor }, style as any]}>
      <Text style={[styles.initial, { fontSize: size * 0.42 }, textStyle]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: '#EEE' },
  circle: { justifyContent: 'center', alignItems: 'center' },
  initial: { color: '#FFF', fontWeight: '700' },
});
