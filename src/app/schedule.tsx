import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function AppointmentDetails() {
  const router = useRouter();

  return (
    <View style={styles.mainContainer}>
      {/* Back Button Section */}
      <View style={styles.headerSection}>
        {/* 💡 Login පේජ් එකට යන්නේ නැති වෙන්න මෙතනට කෙලින්ම '/home' පාර දුන්නා */}
        <TouchableOpacity style={styles.backButton} activeOpacity={0.7} onPress={() => router.push('/home')}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Top Banner Image */}
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: 'https://i.ibb.co/VWVgXpby/Scedule.png' }}
            style={styles.bannerImage}
            resizeMode="cover"
          />
        </View>

        {/* Content Container */}
        <View style={styles.contentContainer}>
          <Text style={styles.screenTitle}>Appointment Details</Text>

          {/* Customer Row */}
          <View style={styles.detailRow}>
            <Text style={styles.labelFont}>Customer</Text>
            <Text style={styles.valueFont}>Nimasha</Text>
          </View>
          <View style={styles.rowDivider} />

          {/* Service Row */}
          <View style={styles.detailRow}>
            <Text style={styles.labelFont}>Service</Text>
            <Text style={styles.valueFont}>Hair Cut</Text>
          </View>
          <View style={styles.rowDivider} />

          {/* Time Row */}
          <View style={styles.detailRow}>
            <Text style={styles.labelFont}>Time</Text>
            <Text style={styles.valueFont}>10.00 A.M</Text>
          </View>
          <View style={styles.rowDivider} />

          {/* Status Row */}
          <View style={styles.detailRow}>
            <Text style={styles.labelFont}>Status</Text>
            <Text style={styles.valueFont}>Pending</Text>
          </View>
          <View style={styles.rowDivider} />

          {/* Action Buttons */}
          <View style={styles.buttonGroup}>
            
            {/* 1. Accept/Confirm บටන් එක */}
            <TouchableOpacity 
              style={styles.primaryButton} 
              activeOpacity={0.8}
              onPress={() => router.push('/appointment-confirm')}
            >
              <Text style={styles.buttonText}>Accept/confirm</Text>
            </TouchableOpacity>

            {/* 2. Mark as completed บටන් එක */}
            <TouchableOpacity 
              style={styles.primaryButton} 
              activeOpacity={0.8}
              onPress={() => router.push('/completed')}
            >
              <Text style={styles.buttonText}>Masrk as completed</Text>
            </TouchableOpacity>

            {/* 3. Cancel บටන් එක */}
            <TouchableOpacity 
              style={styles.primaryButton} 
              activeOpacity={0.8}
              onPress={() => router.push('/cancel-confirm')}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>

          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerSection: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: 20,
    color: '#000000',
    fontWeight: '500',
    marginLeft: 5,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  scrollContainer: {
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    height: 220,
    backgroundColor: '#FDE4E4',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    paddingHorizontal: 25,
    paddingTop: 25,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 30,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 10,
  },
  labelFont: {
    fontSize: 18,
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontWeight: '500',
  },
  valueFont: {
    fontSize: 18,
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontWeight: '500',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#CCCCCC',
    width: '100%',
  },
  buttonGroup: {
    marginTop: 45,
    marginBottom: 40,
  },
  primaryButton: {
    backgroundColor: '#FF1462',
    borderRadius: 8,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#FF1462',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});