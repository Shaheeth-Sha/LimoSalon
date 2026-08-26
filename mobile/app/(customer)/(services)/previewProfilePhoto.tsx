import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../../config/api";
import { getPendingProfilePhoto, clearPendingProfilePhoto } from "../../../utils/pendingProfilePhoto";

const PHOTO_API = `${BASE_URL}/api/customers/profile/photo`;

// Customer-side counterpart to the staff app's preview-profile-photo.tsx.
export default function PreviewProfilePhoto() {
  const router = useRouter();
  const pending = getPendingProfilePhoto();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleCancel = () => {
    clearPendingProfilePhoto();
    router.back();
  };

  const handleUsePhoto = async () => {
    if (!pending || uploading) return;
    setError("");
    setUploading(true);

    try {
      const token = await AsyncStorage.getItem("customerToken");
      const dataUrl = `data:${pending.mimeType};base64,${pending.base64}`;

      const res = await fetch(PHOTO_API, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ image: dataUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Unable to upload this photo. Please try again.");
        return;
      }

      await AsyncStorage.setItem("customerData", JSON.stringify(data.customer));
      clearPendingProfilePhoto();
      router.replace("/(customer)/(services)/photoUploaded");
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setUploading(false);
    }
  };

  if (!pending) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.noticeText}>No photo selected.</Text>
        <TouchableOpacity style={[styles.primaryBtn, { width: "100%", marginTop: 16 }]} onPress={() => router.back()}>
          <Text style={styles.primaryBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={handleCancel} disabled={uploading}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.header}>Preview Photo</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.centered}>
        <Image source={{ uri: pending.uri }} style={styles.previewImage} />
        <Text style={styles.caption}>This will be your new profile photo</Text>

        {Boolean(error) && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[styles.primaryBtn, uploading && styles.disabledBtn]}
          activeOpacity={0.85}
          onPress={handleUsePhoto}
          disabled={uploading}
        >
          {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Use Photo</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.outlineBtn, uploading && styles.disabledBtn]}
          activeOpacity={0.85}
          onPress={handleCancel}
          disabled={uploading}
        >
          <Text style={styles.outlineBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F4F4",
    paddingHorizontal: 20,
    paddingTop: 60,
  },

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  header: {
    fontSize: 18,
    fontWeight: "600",
  },

  previewImage: {
    width: 220,
    height: 220,
    borderRadius: 20,
    backgroundColor: "#f5b6c6",
    marginBottom: 14,
  },

  caption: { fontSize: 13, color: "#888", marginBottom: 30, textAlign: "center" },
  noticeText: { fontSize: 15, color: "#666", textAlign: "center" },
  errorText: { color: "#C13333", fontSize: 13, marginBottom: 14, textAlign: "center" },

  primaryBtn: {
    width: "100%",
    minHeight: 52,
    backgroundColor: "#ff2d55",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },

  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  outlineBtn: {
    width: "100%",
    minHeight: 52,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#C13333",
    justifyContent: "center",
    alignItems: "center",
  },

  outlineBtnText: { color: "#C13333", fontSize: 15, fontWeight: "700" },

  disabledBtn: { opacity: 0.6 },
});
