import { Stack } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';

export default function Layout() {
  return (
    <View style={styles.webContainer}>
      <View style={styles.mobileFrame}>
        <Stack screenOptions={{ headerShown: false }}>
          {/* ප්‍රධාන පේජ් එක (ලොගින්) */}
          <Stack.Screen name="index" />
          
          {/* ෆොගොට් පේජ් එක */}
          <Stack.Screen name="forgot" />

          {/* ඊමේල් එක චෙක් කරන්න කියන පේජ් එක */}
          <Stack.Screen name="check-email" />

          {/* අලුත් පාස්වර්ඩ් එක ඇතුළත් කරන පේජ් එක */}
          <Stack.Screen name="new-password" />

          {/* පාස්වර්ඩ් එක සාර්ථකව රීසෙට් වුණාම පෙන්වන පේජ් එක */}
          <Stack.Screen name="reset-success" />
          <Stack.Screen name="home" />
           <Stack.Screen name="schedule" />
          <Stack.Screen name="my-schedule" /> 
          <Stack.Screen name="update-availability" /> 
          <Stack.Screen name="Notifications" /> 
          <Stack.Screen name="Profile Page" /> 
        </Stack>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // වෙබ් එකේදී මුළු ස්ක්‍රීන් එකම මැදට ගන්නවා
  webContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5', // වටේට ලස්සන අළු පාටක්
    justifyContent: 'center',
    alignItems: 'center',
  },
  // වෙබ් එකේදී විතරක් iPhone එකක් වගේ සයිස් එක ලොක් කරනවා
  mobileFrame: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 390 : '100%', // iPhone 12/13 පළල
    height: '100%',
    maxHeight: Platform.OS === 'web' ? 844 : '100%', // iPhone උස
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        borderRadius: 30, // වටේ දාර රවුම් වෙනවා
        boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.08)', // වටේට Shadow එකක්
      },
    }),
  },
});