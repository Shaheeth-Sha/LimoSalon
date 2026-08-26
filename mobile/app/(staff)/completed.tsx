import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Redesigned to match two things at once (per user request):
//   1. cancel-confirm.tsx / cancel-success.tsx — same flat #F5F5F7
//      background, same ring-icon treatment, same pill button, so all
//      three staff outcome screens read as one family instead of this
//      one alone using a muted pink curve banner (#EAAEC5) nothing
//      else in the app used.
//   2. The customer app's own booking-confirmed screen
//      ((customer)/(services)/bookingSuccess.tsx) — same black-ring/
//      big-checkmark motif and spring-in entrance animation, just
//      recolored green for "Completed" (matching the green already
//      used for Completed everywhere else in the staff app: today's
//      Jobs, My Schedule) and without the confetti/payment-details
//      card, since this is a much lighter "task done" moment than a
//      customer's new booking.
export default function ServiceCompleted() {
  const router = useRouter();

  const iconScale = useRef(new Animated.Value(0)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(iconScale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(checkOpacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.content}>
        <Animated.View style={[styles.iconRing, { transform: [{ scale: iconScale }] }]}>
          <Animated.View style={{ opacity: checkOpacity }}>
            <Ionicons name="checkmark" size={64} color="#1E8A3C" />
          </Animated.View>
        </Animated.View>

        <Animated.View style={{ opacity: contentOpacity, width: '100%', alignItems: 'center' }}>
          <Text style={styles.title}>Service Completed</Text>
          <Text style={styles.subtitle}>Nice work!</Text>
          <Text style={styles.message}>
            The customer has been notified and this appointment is now marked complete.
          </Text>

          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.85}
            onPress={() => router.replace('/my-schedule')}
          >
            <Ionicons name="list-outline" size={20} color="#FFFFFF" />
            <Text style={styles.buttonText}>Back to List</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconRing: {
    width: 118,
    height: 118,
    borderRadius: 59,
    borderWidth: 8,
    borderColor: '#1E8A3C',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000000',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 5,
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
  },
  message: {
    marginTop: 8,
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  button: {
    width: '100%',
    minHeight: 56,
    backgroundColor: '#FF1462',
    borderRadius: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 9,
    shadowColor: '#FF1462',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
