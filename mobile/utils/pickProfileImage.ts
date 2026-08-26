import * as ImagePicker from "expo-image-picker";

export type PickedImage = { uri: string; base64: string; mimeType: string };

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const guessMimeType = (uri: string): string => {
  const ext = uri.split(".").pop()?.toLowerCase().split("?")[0] || "jpeg";
  return MIME_BY_EXT[ext] || "image/jpeg";
};

// Shared by both the staff and customer "Edit Profile Photo" screens —
// same square-crop-then-upload flow on either side of the app.
// allowsEditing + a 1:1 aspect hands the actual crop/reposition/zoom
// step to the OS's own native picker UI (both iOS and Android already
// provide drag-to-reposition and pinch-to-zoom there), so there's no
// separate custom cropper to build or maintain — the picker returns an
// already-square image.
export const pickProfileImage = async (
  source: "camera" | "gallery"
): Promise<PickedImage | null> => {
  const permission =
    source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error(
      source === "camera"
        ? "Camera access is required to take a profile photo."
        : "Photo library access is required to choose a profile photo."
    );
  }

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.6,
    base64: true,
  };

  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

  if (result.canceled || !result.assets || !result.assets[0]) {
    return null;
  }

  const asset = result.assets[0];

  if (!asset.base64) {
    throw new Error("Unable to read the selected photo. Please try again.");
  }

  return {
    uri: asset.uri,
    base64: asset.base64,
    mimeType: asset.mimeType || guessMimeType(asset.uri),
  };
};
