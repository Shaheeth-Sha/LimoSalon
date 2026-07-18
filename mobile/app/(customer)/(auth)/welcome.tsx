import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// NOTE: requires 'react-native-safe-area-context' — already a dependency of
// Expo Router projects by default, so no new install should be needed.

export default function Welcome() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>

      {/* Top Curve
         Fixed: was a hardcoded 72.67px height that only matched the
         Pixel 6 emulator's status bar. Now it grows with the real
         device safe-area inset, so it lines up on notched phones too. */}
      <View style={[styles.topCurve, { height: insets.top + 40 }]} />

      {/* Logo Section */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../../../assets/LimoIcon/logo.png')}
          style={styles.logo}
        />
        <Text style={styles.logoText}>LIMO SALON</Text>
      </View>

      {/* Main Image */}
      <Image
        source={require('../../../assets/LimoImage/welcome.png')}
        style={styles.mainImage}
      />

      {/* Bottom Card
         Fixed: fixed paddingTop (150) + percentage height (50%) could
         push the button off-screen on small devices. Switched to
         justifyContent + safe-area bottom padding so content always
         stays visible and centered regardless of screen size. */}
      <View style={[styles.bottomCard, { paddingBottom: insets.bottom + 20 }]}>

        <Text style={styles.title}>
          Your beauty journey{'\n'}starts here
        </Text>

        <Text style={styles.subtitle}>
          Book, relax, and transform with our professional salon experience
        </Text>

        <TouchableOpacity
          style={styles.button}
          activeOpacity={0.8}
          onPress={() => router.push('/(customer)/(auth)/userSelect')}
        >
          <Text style={styles.buttonText}>GET STARTED</Text>
        </TouchableOpacity>

      </View>

    </View>
  );
}

// =====================================================
// App primary color: #FF2D75 (matches project design spec)
// Keep this same hex across every screen for consistency.
// =====================================================
const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
  },

  topCurve: {
    position: 'absolute',
    top: 0,
    width: '100%',
    backgroundColor: '#FF2D75',
  },

  logoContainer: {
    marginTop: 85,
    alignItems: 'center'
  },

  logo: {
    width: 70,
    height: 70,
    resizeMode: 'contain',
    marginTop: 35,
  },

  logoText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF2D75',
    marginTop: 5,
    letterSpacing: 2,
  },

  mainImage: {
    width: 240,
    height: 240,
    borderRadius: 25,
    marginTop: 50,
    zIndex: 10,
    resizeMode: 'contain',
  },

  bottomCard: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    minHeight: '48%',
    backgroundColor: '#FF2D75',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    zIndex: 1,
  },

  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 13,
    color: '#fff',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 25,
    lineHeight: 18,
  },

  button: {
    marginTop: 25,
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 35,
    borderRadius: 25,
  },

  buttonText: {
    color: '#FF2D75',
    fontWeight: 'bold',
  },
});