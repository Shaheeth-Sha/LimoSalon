import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      
      {/* Auth Flow First */}
      <Stack.Screen name="(customer)/(auth)/splash" />
      <Stack.Screen name="(customer)/(auth)/welcome" />
      <Stack.Screen name="(customer)/(auth)/userSelect" />
      <Stack.Screen name="(customer)/(auth)/login" />
     

      {/* Main App */}
      <Stack.Screen name="(staff)" />

    

    </Stack>
  );
}