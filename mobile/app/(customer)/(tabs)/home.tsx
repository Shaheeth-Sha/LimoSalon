import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Home() {
  return (
    <View style={styles.container}>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello Nisali!</Text>
          <Ionicons name="notifications-outline" size={24} color="#000" />
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <TextInput
            placeholder="Search for services or staff...."
            style={styles.searchInput}
          />
          <Ionicons name="search" size={18} color="#888" />
        </View>

        {/* Upcoming */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Upcoming</Text>
          <Text style={styles.viewAll}>View All</Text>
        </View>

        <View style={styles.upcomingCard}>
          <Text style={styles.status}>Confirmed</Text>

          <Text style={styles.serviceTitle}>Hair Cut & Styling</Text>
          <Text style={styles.staff}>With Rashmi W.</Text>

          <View style={styles.dateRow}>
            <View>
              <Text style={styles.label}>Date</Text>
              <Text style={styles.value}>Oct 24</Text>
            </View>

            <View style={styles.divider} />

            <View>
              <Text style={styles.label}>Time</Text>
              <Text style={styles.value}>10.00 AM</Text>
            </View>

            <View style={styles.divider} />

            <View>
              <Text style={styles.label}>In</Text>
              <Text style={styles.value}>2 days</Text>
            </View>
          </View>
        </View>

        {/* Offers */}
        <Text style={styles.sectionTitle}>Special Offers</Text>

        {/* Offer 1 */}
        <View style={styles.offerCard}>
          <Text style={styles.offerTitle}>Bridal Season</Text>
          <Text style={styles.offerSub}>20% off Bridal Packages</Text>
          <Text style={styles.offerDesc}>
            Book your complete bridal look this month and save
          </Text>

          <TouchableOpacity style={styles.offerBtn}>
            <Text style={styles.offerBtnText}>Claim Offer</Text>
          </TouchableOpacity>
        </View>

        {/* Offer 2 */}
        <View style={styles.offerCard}>
          <Text style={styles.offerTitle}>Festival Special</Text>
          <Text style={styles.offerSub}>Combo Offer</Text>
          <Text style={styles.offerDesc}>
            Any stylish haircut with wash + Threading 25%
          </Text>

          <TouchableOpacity style={styles.offerBtn}>
            <Text style={styles.offerBtnText}>Claim Offer</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>


  {/* Home */}
  <View style={styles.navItem}>
    <Ionicons name="home" size={26} color="#ff4d6d" />
    <Text style={styles.activeTab}>Home</Text>
  </View>

  {/* Services */}
  <View style={styles.navItem}>
    <Ionicons name="cut-outline" size={24} color="#777" />
    <Text style={styles.tab}>Services</Text>
  </View>

  {/* Bookings */}
  <View style={styles.navItem}>
    <Ionicons name="calendar-outline" size={24} color="#777" />
    <Text style={styles.tab}>Bookings</Text>
  </View>

  {/* Profile */}
  <View style={styles.navItem}>
    <Ionicons name="person-outline" size={24} color="#777" />
    <Text style={styles.tab}>Profile</Text>
  </View>

</View>

      </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#f2f2f2',
    paddingTop: 40,
    paddingHorizontal: 20,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  greeting: {
    fontSize: 22,
    fontWeight: 'bold',
  },

  /* Search */
  searchBox: {
    marginTop: 15,
    backgroundColor: '#fff',
    borderRadius: 30,
    paddingHorizontal: 15,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  searchInput: {
    flex: 1,
  },

  /* Section */
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 25,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 25,
  },

  viewAll: {
    color: '#ff4d6d',
    marginTop: 25,
  },

  /* Upcoming Card */
  upcomingCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 15,
    marginTop: 10,
  },

  status: {
    color: '#ff4d6d',
    fontWeight: 'bold',
    marginBottom: 5,
  },

  serviceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },

  staff: {
    color: '#777',
    marginBottom: 10,
  },

  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 10,
  },

  label: {
    fontSize: 12,
    color: '#777',
  },

  value: {
    fontWeight: 'bold',
  },

  divider: {
    width: 1,
    backgroundColor: '#ccc',
  },

  /* Offers */
  offerCard: {
    backgroundColor: '#ff6f91',
    borderRadius: 20,
    padding: 15,
    marginTop: 15,
  },

  offerTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  offerSub: {
    color: '#fff',
    marginTop: 5,
  },

  offerDesc: {
    marginTop: 5,
    color: '#000',
  },

  offerBtn: {
    marginTop: 10,
    backgroundColor: '#fff',
    paddingVertical: 6,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },

  offerBtnText: {
    color: '#ff4d6d',
    fontWeight: 'bold',
  },

  /* Bottom Nav */
  navItem: {
    alignItems: 'center'
  },

  bottomNav: {
    height: 70,
    backgroundColor: '#fff',
    borderRadius: 25,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 10,
  },

  activeTab: {
    color: '#ff4d6d',
    fontWeight: 'bold',
    fontSize: 15,
  },

  tab: {
    color: '#777',
    fontSize: 15,
  },

});