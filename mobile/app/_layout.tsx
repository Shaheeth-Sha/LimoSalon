import { Stack } from "expo-router";
import { StripeProvider } from "@stripe/stripe-react-native";

const stripePublishableKey =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

export default function RootLayout() {
  if (!stripePublishableKey) {
    console.warn(
      "EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY is missing from mobile/.env"
    );
  }

  return (
    <StripeProvider publishableKey="pk_test_51TthLkK2fdvltzMthDyKYDpAyLiOazgJnQg87yrKdSJCiywIYb6LRaisMTOUSbXfAbSEpO1QXoN2iqkdH0sRwBQk00TPL5VKBv">
      <Stack screenOptions={{ headerShown: false }}>
        {/* Customer authentication flow */}
        <Stack.Screen name="(customer)/(auth)/splash" />
        <Stack.Screen name="(customer)/(auth)/welcome" />
        <Stack.Screen name="(customer)/(auth)/userSelect" />
        <Stack.Screen name="(customer)/(auth)/login" />

        {/* Staff application */}
        <Stack.Screen name="(staff)" />
      </Stack>
    </StripeProvider>
  );
}