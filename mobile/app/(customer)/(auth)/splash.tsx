import { View, Text, Image, StyleSheet } from 'react-native';
import { useEffect } from 'react';
import { router } from 'expo-router';

export default function Splash() {

  useEffect(() => {
    setTimeout(() => {
      router.replace('/(customer)/(auth)/welcome');
    }, 2000);
  }, []);

  return (
    <View style={styles.container}>

      <Image
        source={require('../../../assets/LimoIcon/logo.png')}
        style={styles.logo}
      />

      <Text style={styles.text}>LIMO SALON</Text>

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
    resizeMode: 'contain',
  },

  text: {
    marginTop: 10,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F70954',
    letterSpacing: 2,
  },

});