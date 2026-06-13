import { View, Text, StyleSheet, Image, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Services() {
  return (
    <View style={styles.container}>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* TOP IMAGE SECTION */}
        <View style={styles.header}>
          <Image
            source={require('../../../assets/LimoImage/serviceTop.png')} // replace
            style={styles.headerImage}
          />

          <View style={styles.overlay}>
            <Text style={styles.hello}>Hello, Nisali!</Text>
            <Text style={styles.sub}>Find the best service for you</Text>

            {/* Search */}
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color="#999" />
              <TextInput
                placeholder="Search for service..."
                style={styles.input}
              />
            </View>
          </View>
        </View>

        {/* SERVICES TITLE */}
        <Text style={styles.title}>OUR SERVICES</Text>

        {/* GRID */}
        <View style={styles.grid}>

          {/* ITEM */}
          <View style={styles.card}>
            <Image
              source={require('../../../assets/LimoImage/hair.png')}
              style={styles.cardImage}
            />
            <Text style={styles.cardText}>Hair Care</Text>
          </View>

          <View style={styles.card}>
            <Image
              source={require('../../../assets/LimoImage/body.png')}
              style={styles.cardImage}
            />
            <Text style={styles.cardText}>Body Care</Text>
          </View>

          <View style={styles.card}>
            <Image
              source={require('../../../assets/LimoImage/face.png')}
              style={styles.cardImage}
            />
            <Text style={styles.cardText}>Face Care</Text>
          </View>

          <View style={styles.card}>
            <Image
              source={require('../../../assets/LimoImage/bridal.png')}
              style={styles.cardImage}
            />
            <Text style={styles.cardText}>Bridal Dressing</Text>
          </View>

        </View>

      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  /* HEADER */
  header: {
    height: 260,
  },

  headerImage: {
    width: '100%',
    height: '100%',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },

  overlay: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
  },

  hello: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ff4d6d',
  },

  sub: {
    fontSize: 14,
    color: '#ff4d6d',
    marginBottom: 10,
  },

  /* SEARCH */
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 40,
  },

  input: {
    marginLeft: 8,
    flex: 1,
  },

  /* TITLE */
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    margin: 20,
  },

  /* GRID */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },

  card: {
    width: '48%',
    marginBottom: 20,
    alignItems: 'center',
  },

  cardImage: {
    width: '100%',
    height: 140,
    borderRadius: 20,
  },

  cardText: {
    marginTop: 8,
    fontWeight: '600',
    fontSize: 14,
  },

});