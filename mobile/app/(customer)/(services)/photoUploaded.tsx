import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { resolveAvatarUrl } from "../../../utils/resolveAvatarUrl";

// Customer-side counterpart to the staff app's photo-uploaded.tsx —
// same ring/spring-in outcome family used by this app's own
// bookingSuccess.tsx, recolored to this app's #ff2d55 brand accent.
export default function PhotoUploaded() {
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initials, setInitials] = useState("");

  const iconScale = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem("customerData");
        if (stored) {
          const customer = JSON.parse(stored);
          setAvatarUrl(resolveAvatarUrl(customer.avatar));

          const parts = String(customer.name || "").trim().split(" ");
          const value =
            parts.length <= 1
              ? (parts[0]?.charAt(0) || "").toUpperCase()
              : (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
          setInitials(value);
        }
      } catch (error) {
        console.log("Failed to load customer data:", error);
      }
    })();

    Animated.sequence([
      Animated.spring(iconScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      Animated.timing(contentOpacity, { toValue: 1, duration: 260, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Animated.View style={[styles.avatarWrap, { transform: [{ scale: iconScale }] }]}>
          <View style={styles.avatar}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </View>
          <View style={styles.badge}>
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: contentOpacity, width: "100%", alignItems: "center" }}>
          <Text style={styles.title}>Photo Uploaded</Text>
          <Text style={styles.message}>Your profile photo has been saved!</Text>

          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.85}
            onPress={() => router.replace("/(customer)/(tabs)/profile")}
          >
            <Text style={styles.buttonText}>Back to Profile</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F4F4" },
  content: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  avatarWrap: { marginBottom: 24 },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f5b6c6",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  avatarText: { fontSize: 38, fontWeight: "700", color: "#7a1f33" },
  badge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#2ECC71",
    borderWidth: 3,
    borderColor: "#F4F4F4",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 22, fontWeight: "800", color: "#000000", textAlign: "center" },
  message: { marginTop: 8, fontSize: 14, color: "#666666", textAlign: "center", marginBottom: 28 },
  button: {
    width: "100%",
    minHeight: 52,
    backgroundColor: "#ff2d55",
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
