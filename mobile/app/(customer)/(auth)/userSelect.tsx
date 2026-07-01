import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';

export default function UserSelect() {
  return (
    <View style={styles.container}>

      <Image
        source={require('../../../assets/LimoIcon/logo.png')}
        style={styles.logo}
      />

      <Text style={styles.title}>LIMO SALON</Text>

      <TouchableOpacity style={styles.button}
        onPress={() => router.push('/(customer)/(auth)/login')}>
        <Text style={styles.buttonText}>Customer</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button}
        onPress={() => router.push("/(staff)")}>
        <Text style={styles.buttonText}>Staff</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },

  logo: {
    width: 90,
    height: 90,
    marginBottom: 10,
    resizeMode: 'contain',
  },

  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#e53935',
    marginBottom: 30,
    letterSpacing: 2,
  },

  button: {
    width: '75%',
    backgroundColor: '#ff1744',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 15,
    alignItems: 'center',
    elevation: 3, // shadow for Android
  },

  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },

});