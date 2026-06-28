import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';

export default function Welcome() {
  return (
    <View style={styles.container}>

      {/* Top Curve */}
      <View style={styles.topCurve} />

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

      {/* Bottom Card */}
      <View style={styles.bottomCard}>

        <Text style={styles.title}>
          Your beauty journey{'\n'}starts here
        </Text>

        <Text style={styles.subtitle}>
          Book, relax, and transform with our professional salon experience
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/(customer)/(auth)/userSelect')}
        >
          <Text style={styles.buttonText}>GET STARTED</Text>
        </TouchableOpacity>

      </View>

    </View>
  );
}

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
    height: 72.67,
    backgroundColor: '#f70954',
  },

  logoContainer: {
    marginTop: 85,
    alignItems: 'center'
  },

  logo: {
    width: 70,
    height: 70,
    resizeMode: 'contain',
    marginTop:35,
  },

  logoText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f70954',
    marginTop: 5,
    letterSpacing: 2,
    
  },

  mainImage: {
    width: 240,
    height: 240,
    borderRadius: 25,
    marginTop: 50,
    zIndex:10,
    resizeMode: 'contain',
  },

  bottomCard: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: '50%',
    backgroundColor: '#f70954',
    alignItems: 'center',
    paddingTop: 150,
    zIndex:1,
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
    color: '#F70954',
    fontWeight: 'bold',
  },
});
