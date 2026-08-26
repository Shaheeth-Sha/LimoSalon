const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Profile photos are stored as plain files on disk under
// backend/uploads/avatars, served back out via express.static (see
// index.js). No cloud storage / CDN is wired up for this project, so
// this is the simplest thing that actually works for a single-server
// deployment — the tradeoff is that these files live on whichever
// machine runs the backend and aren't backed up separately from it.
const UPLOADS_ROOT = path.join(__dirname, "..", "uploads", "avatars");

// Customer.avatar / Staff.image both arrive here as a
// "data:image/<type>;base64,<data>" string — the shape the mobile app
// builds client-side from expo-image-picker's base64 result (see
// mobile/utils/pickProfileImage.ts). Restricting the mime type to a
// known image type here is what keeps this endpoint from turning into
// an arbitrary file-write.
const DATA_URL_PATTERN = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/;

// A profile photo has no business being huge — this caps the
// *decoded* file size, generous for a phone camera photo (which
// allowsEditing already crops to a small square before it ever
// reaches here) while keeping a broken or malicious client from
// filling the disk one request at a time.
const MAX_AVATAR_BYTES = 8 * 1024 * 1024;

const ensureUploadsDir = () => {
  fs.mkdirSync(UPLOADS_ROOT, { recursive: true });
};

const saveBase64Avatar = (dataUrl) => {
  const match = typeof dataUrl === "string" && dataUrl.match(DATA_URL_PATTERN);

  if (!match) {
    const error = new Error("Image must be a base64-encoded JPEG, PNG, or WEBP data URL");
    error.statusCode = 400;
    throw error;
  }

  const [, extRaw, base64Data] = match;
  const ext = extRaw === "jpg" ? "jpeg" : extRaw;
  const buffer = Buffer.from(base64Data, "base64");

  if (buffer.length > MAX_AVATAR_BYTES) {
    const error = new Error("Image is too large (max 8MB)");
    error.statusCode = 400;
    throw error;
  }

  ensureUploadsDir();

  const filename = `${crypto.randomBytes(16).toString("hex")}.${ext}`;
  fs.writeFileSync(path.join(UPLOADS_ROOT, filename), buffer);

  // Relative, server-rooted path — the mobile client prefixes this
  // with its own BASE_URL (see mobile/utils/resolveAvatarUrl.ts)
  // rather than this baking in a specific host, so it keeps working
  // across dev/staging/prod without touching stored data.
  return `/uploads/avatars/${filename}`;
};

// Best-effort cleanup of a previously uploaded avatar when it's
// replaced or removed. Deliberately scoped to ONLY this avatars
// directory and never accepts/deletes anything else — a stray
// external URL that ended up in the `avatar`/`image` field (or a
// crafted value) can't be used to delete an arbitrary file elsewhere
// on disk. Failures here are logged, not thrown — losing track of one
// orphaned file is a much smaller problem than failing the request
// that just successfully saved the new photo.
const deleteAvatarFile = (relativeUrlPath) => {
  if (typeof relativeUrlPath !== "string") return;
  if (!relativeUrlPath.startsWith("/uploads/avatars/")) return;

  const filename = path.basename(relativeUrlPath);
  const fullPath = path.join(UPLOADS_ROOT, filename);

  try {
    fs.unlinkSync(fullPath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Failed to delete old avatar file:", error.message);
    }
  }
};

module.exports = { saveBase64Avatar, deleteAvatarFile, ensureUploadsDir };
