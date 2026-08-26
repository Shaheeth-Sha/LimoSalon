import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../../config/api";
import { resolveAvatarUrl } from "../../../utils/resolveAvatarUrl";
import { pickProfileImage } from "../../../utils/pickProfileImage";
import { setPendingProfilePhoto } from "../../../utils/pendingProfilePhoto";

const PHOTO_API = `${BASE_URL}/api/customers/profile/photo`;

// Customer-side counterpart to the staff app's edit-profile-photo.tsx
// — same square-crop-then-preview-then-upload flow, styled to match
// this app's own existing profile screens (editProfile.tsx) rather
// than the staff app's, so both stay internally consistent with the
// screens right next to them.
export default function EditProfilePhoto() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [removing, setRemoving] = useState(false);
  const [picking, setPicking] = useState<"camera" | "gallery" | null>(null);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const stored = await AsyncStorage.getItem("customerData");
          if (stored) {
            const customer = JSON.parse(stored);
            setName(customer.name || "");
            setAvatar(customer.avatar || "");
          }
        } catch (err) {
          console.log("Failed to load customer data:", err);
        }
      })();
    }, [])
  );

  const handlePick = async (source: "camera" | "gallery") => {
    if (picking) return;
    setError("");
    setPicking(source);

    try {
      const picked = await pickProfileImage(source);
      if (!picked) return;

      setPendingProfilePhoto(picked);
      router.push("/(customer)/(services)/previewProfilePhoto");
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setPicking(null);
    }
  };

  const handleRemove = async () => {
    if (removing || !avatar) return;
    setError("");
    setRemoving(true);

    try {
      const token = await AsyncStorage.getItem("customerToken");

      const res = await fetch(PHOTO_API, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Unable to remove your photo. Please try again.");
        return;
      }

      await AsyncStorage.setItem("customerData", JSON.stringify(data.customer));
      setAvatar("");
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setRemoving(false);
    }
  };

  const getInitials = (value: string) => {
    const parts = value.trim().split(" ");
    if (parts.length === 0 || !parts[0]) return "";
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const avatarUrl = resolveAvatarUrl(avatar);
  const busy = Boolean(picking) || removing;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} disabled={busy}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.header}>Edit Profile Photo</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.avatar}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarInitials}>{getInitials(name)}</Text>
        )}
      </View>
      <Text style={styles.name}>{name}</Text>

      {Boolean(error) && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity
        style={[styles.primaryBtn, busy && styles.disabledBtn]}
        activeOpacity={0.85}
        onPress={() => handlePick("camera")}
        disabled={busy}
      >
        <Ionicons name="camera-outline" size={20} color="#FFF" />
        <Text style={styles.primaryBtnText}>
          {picking === "camera" ? "Opening Camera..." : "Take Photo"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.outlineBtn, busy && styles.disabledBtn]}
        activeOpacity={0.85}
        onPress={() => handlePick("gallery")}
        disabled={busy}
      >
        <Ionicons name="cloud-upload-outline" size={20} color="#ff2d55" />
        <Text style={styles.outlineBtnText}>
          {picking === "gallery" ? "Opening Gallery..." : "Upload from Gallery"}
        </Text>
      </TouchableOpacity>

      {Boolean(avatar) && (
        <TouchableOpacity
          style={[styles.removeBtn, busy && styles.disabledBtn]}
          activeOpacity={0.85}
          onPress={handleRemove}
          disabled={busy}
        >
          {removing ? (
            <ActivityIndicator color="#C13333" />
          ) : (
            <>
              <Ionicons name="close-circle-outline" size={20} color="#C13333" />
              <Text style={styles.removeBtnText}>Remove Photo</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F4F4",
    paddingHorizontal: 20,
    paddingTop: 60,
    alignItems: "center",
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    width: "100%",
  },

  header: {
    fontSize: 18,
    fontWeight: "600",
  },

  avatar: {
    backgroundColor: "#f5b6c6",
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginBottom: 12,
  },

  avatarImage: { width: "100%", height: "100%" },

  avatarInitials: {
    fontSize: 32,
    fontWeight: "700",
    color: "#7a1f33",
  },

  name: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 24,
  },

  errorText: {
    color: "#C13333",
    fontSize: 13,
    marginBottom: 14,
    textAlign: "center",
  },

  primaryBtn: {
    width: "100%",
    minHeight: 52,
    backgroundColor: "#ff2d55",
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 9,
    marginBottom: 12,
  },

  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  outlineBtn: {
    width: "100%",
    minHeight: 52,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#ff2d55",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 9,
    marginBottom: 12,
  },

  outlineBtnText: { color: "#ff2d55", fontSize: 15, fontWeight: "700" },

  removeBtn: {
    width: "100%",
    minHeight: 52,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#F3C6C6",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 9,
    marginBottom: 12,
  },

  removeBtnText: { color: "#C13333", fontSize: 15, fontWeight: "700" },

  disabledBtn: { opacity: 0.6 },
});
