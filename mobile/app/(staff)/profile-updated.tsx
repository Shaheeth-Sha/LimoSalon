import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Outcome screen shown after saving name/phone changes in
// edit-profile.tsx. Same ring-icon/spring-in family as
// completed.tsx / cancel-success.tsx / appointment-confirm.tsx, but
// with a black ring per the Figma reference — a deliberately neutral
// tone for "details saved" versus the semantic green/red/pink used
// for booking outcomes elsewhere.
export default function ProfileUpdated() {
  const router = useRouter();

  const iconScale = useRef(new Animated.Value(0)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(iconScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      Animated.timing(checkOpacity, { toValue: 1, duration: 180, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(contentOpacity, { toValue: 1, duration: 260, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.content}>
        <Animated.View style={[styles.iconRing, { transform: [{ scale: iconScale }] }]}>
          <Animated.View style={{ opacity: checkOpacity }}>
            <Ionicons name="checkmark" size={64} color="#000000" />
          </Animated.View>
        </Animated.View>

        <Animated.View style={{ opacity: contentOpacity, width: '100%', alignItems: 'center' }}>
          <Text style={styles.title}>Profile Updated</Text>
          <Text style={styles.message}>Your details have been saved!</Text>

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
  iconRing: {
    width: 118,
    height: 118,
    borderRadius: 59,
    borderWidth: 8,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
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
