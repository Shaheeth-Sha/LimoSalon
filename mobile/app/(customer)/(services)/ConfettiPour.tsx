import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  View,
} from "react-native";

// =====================================================
// Lightweight pink particle-pour effect for success screens
// (booking confirmation, payment success, etc).
//
// Deliberately built with React Native's built-in Animated API only —
// no external confetti/lottie library — so there's nothing new to
// install or configure. Each particle is a small colored square/
// circle that falls from above the screen down past the bottom,
// with a gentle side-to-side sway and rotation, then fades out.
//
// Usage:
//   <ConfettiPour />
// Mount it once (e.g. alongside your success screen's other
// entrance animations). It runs a single burst and then the
// particles are simply off-screen — nothing keeps looping or
// consuming resources afterward.
// =====================================================

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } =
  Dimensions.get("window");

const PARTICLE_COUNT = 45;

const PINK_SHADES = [
  "#FF2D75",
  "#FF6FA5",
  "#FFB3CE",
  "#D86B91",
  "#FF8FB3",
  "#FFD1E1",
];

type Particle = {
  id: number;
  left: number;
  size: number;
  color: string;
  isCircle: boolean;
  delay: number;
  duration: number;
  swayDistance: number;
  rotateTo: string;
};

const buildParticles = (): Particle[] => {
  return Array.from({ length: PARTICLE_COUNT }, (_, index) => {
    const size = 6 + Math.random() * 8;

    return {
      id: index,
      left: Math.random() * SCREEN_WIDTH,
      size,
      color:
        PINK_SHADES[
          Math.floor(Math.random() * PINK_SHADES.length)
        ],
      isCircle: Math.random() > 0.5,
      delay: Math.random() * 400,
      duration: 1800 + Math.random() * 1400,
      swayDistance: (Math.random() - 0.5) * 60,
      rotateTo: `${Math.floor(
        (Math.random() - 0.5) * 720
      )}deg`,
    };
  });
};

function ConfettiParticle({ particle }: { particle: Particle }) {
  const fall = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(particle.delay),
      Animated.parallel([
        Animated.timing(fall, {
          toValue: 1,
          duration: particle.duration,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(particle.duration * 0.6),
          Animated.timing(opacity, {
            toValue: 0,
            duration: particle.duration * 0.4,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();
  }, []);

  const translateY = fall.interpolate({
    inputRange: [0, 1],
    outputRange: [-40, SCREEN_HEIGHT + 40],
  });

  const translateX = fall.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, particle.swayDistance, 0],
  });

  const rotate = fall.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", particle.rotateTo],
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: particle.left,
          width: particle.size,
          height: particle.size,
          backgroundColor: particle.color,
          borderRadius: particle.isCircle
            ? particle.size / 2
            : 2,
          opacity,
          transform: [
            { translateY },
            { translateX },
            { rotate },
          ],
        },
      ]}
    />
  );
}

export default function ConfettiPour() {
  // Fixed set of particles for the lifetime of this mount — built
  // once via useMemo rather than regenerated on every render, so
  // each particle's random path stays stable throughout its own
  // animation instead of jumping around.
  const particles = useMemo(() => buildParticles(), []);

  return (
    <View style={styles.overlay} pointerEvents="none">
      {particles.map((particle) => (
        <ConfettiParticle key={particle.id} particle={particle} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },

  particle: {
    position: "absolute",
    top: 0,
  },
});