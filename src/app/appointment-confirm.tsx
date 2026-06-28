import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

export default function AppointmentConfirm() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Top Pink Curve */}
      <View style={[styles.topCurve, { backgroundColor: '#FF1462' }]} />

      {/* Main Content Card */}
      <View style={styles.card}>
        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="checkmark-circle-outline" size={100} color="#000000" />
        </View>

        {/* Text Details */}
        <Text style={styles.titleText}>Appointment confirmed</Text>
        <Text style={styles.subText}>The customer has been notified</Text>

        {/* Back to List Button */}
        {/* 💡 මෙතනට '/schedule' පාර දුන්නාම කෙලින්ම Schedule පේජ් එකට යනවා */}
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: '#FF1462' }]} 
          onPress={() => router.push('/schedule')}
        >
          <Text style={styles.buttonText}>Back to List</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Pink Curve */}
      <View style={[styles.bottomCurve, { backgroundColor: '#FF1462' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#EBEBEB', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  topCurve: { 
    position: 'absolute', 
    top: -50, 
    width: width, 
    height: 160, 
    borderBottomLeftRadius: width / 1.8, 
    borderBottomRightRadius: width / 1.8, 
    transform: [{ scaleX: 1.3 }] 
  },
  bottomCurve: { 
    position: 'absolute', 
    bottom: -50, 
    width: width, 
    height: 160, 
    borderTopLeftRadius: width / 1.8, 
    borderTopRightRadius: width / 1.8, 
    transform: [{ scaleX: 1.3 }] 
  },
  card: { 
    width: '85%', 
    height: '75%', // image_bc937a.png එකේ විදිහට උස වැඩි කලා
    backgroundColor: '#FFFFFF', 
    borderRadius: 40, 
    paddingVertical: 50, 
    alignItems: 'center', 
    justifyContent: 'center', // මැදට ගන්න
    zIndex: 1, 
    elevation: 5, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 10 
  },
  iconContainer: { 
    marginBottom: 40 
  },
  titleText: { 
    fontSize: 24, 
    fontWeight: '700', 
    color: '#000000', 
    textAlign: 'center', 
    marginBottom: 12 
  },
  subText: { 
    fontSize: 16, 
    color: '#444444', 
    textAlign: 'center', 
    marginBottom: 50 
  },
  button: { 
    width: '65%', 
    height: 48, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderRadius: 8 
  },
  buttonText: { 
    color: '#FFFFFF', 
    fontSize: 15, 
    fontWeight: '600' 
  }
});