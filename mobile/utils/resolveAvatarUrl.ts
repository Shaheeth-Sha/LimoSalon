import { BASE_URL } from "../config/api";

// Staff.image / Customer.avatar are stored as the server-relative path
// avatarStorage.js hands back ("/uploads/avatars/xxxx.jpg"), never a
// full URL — so every screen that renders one needs the same
// BASE_URL prefix. Centralized here so a blank/unset value
// consistently resolves to "no photo, show initials instead" instead
// of every screen re-deriving that check slightly differently.
export const resolveAvatarUrl = (path?: string | null): string | null => {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${BASE_URL}${path}`;
};
