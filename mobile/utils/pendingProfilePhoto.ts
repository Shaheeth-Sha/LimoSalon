import type { PickedImage } from "./pickProfileImage";

// A picked profile photo is held here — briefly, in memory — while the
// user moves from "Edit Profile Photo" (pick) to "Preview" (confirm)
// to upload. Router params are the normal way to pass data between
// Expo Router screens, but a picked photo's base64 payload can run
// into the hundreds of KB, well past what's sane to serialize into a
// URL param. This intentionally isn't persisted or exposed via
// context — it only needs to survive a couple of screen transitions
// in the same session, and gets cleared as soon as it's consumed
// (uploaded or cancelled) so a stale photo can never leak into an
// unrelated flow.
let pending: PickedImage | null = null;

export const setPendingProfilePhoto = (image: PickedImage | null) => {
  pending = image;
};

export const getPendingProfilePhoto = (): PickedImage | null => pending;

export const clearPendingProfilePhoto = () => {
  pending = null;
};
