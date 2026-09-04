// Shared "premium card" styling for loyalty tiers — used everywhere a
// membership/loyalty card is rendered (home.tsx's loyalty card,
// loyaltyDashboard.tsx's tier card, membershipCard.tsx's physical
// card). Centralized here so all three always agree on what each
// tier actually looks like, instead of each screen picking its own
// colors (which is how membershipCard.tsx ended up hardcoded to a
// single gold color regardless of the customer's real tier).
//
// Modeled on how real banking/loyalty apps differentiate tiers: a
// darker, warmer metal for the entry tier, a cool brushed-steel look
// for the middle tier, a bright warm-gold sheen for the top consumer
// tier, and a sleek near-black "exclusive" finish for the highest
// tier — each as a 3-stop diagonal gradient so the card catches
// light like an actual card rather than reading as a flat color
// swatch.

export type TierName = "Bronze" | "Silver" | "Gold" | "Platinum";

// [start, mid, end] stops for expo-linear-gradient, applied diagonally
// (top-left to bottom-right) for a soft brushed-metal highlight.
export const TIER_GRADIENTS: Record<string, [string, string, string]> = {
  Bronze: ["#5C3A21", "#9C6B3E", "#C89664"],
  Silver: ["#3F4347", "#7C838A", "#B7BEC5"],
  Gold: ["#7A5C0E", "#C79A2E", "#F0CB63"],
  Platinum: ["#1C1D1F", "#3A3D40", "#6E6E73"],
};

// Color for the headline number (points) and the crown icon — chosen
// per tier so it always stands out against that tier's gradient
// (plain "#FFD166" gold, used everywhere else in the app as an
// accent, would nearly disappear against the Gold tier's own gold
// background).
export const TIER_ACCENT: Record<string, string> = {
  Bronze: "#FFD9A0",
  Silver: "#F2F3F5",
  Gold: "#FFF6E0",
  Platinum: "#E5E4E2",
};

// Subtle border to give each card a defined metallic edge.
export const TIER_BORDER: Record<string, string> = {
  Bronze: "#E8C39A",
  Silver: "#E3E6E9",
  Gold: "#FBE7A6",
  Platinum: "#8E8E93",
};

const DEFAULT_TIER: TierName = "Bronze";

export const getTierGradient = (tier?: string | null): [string, string, string] =>
  TIER_GRADIENTS[tier || DEFAULT_TIER] || TIER_GRADIENTS[DEFAULT_TIER];

export const getTierAccent = (tier?: string | null): string =>
  TIER_ACCENT[tier || DEFAULT_TIER] || TIER_ACCENT[DEFAULT_TIER];

export const getTierBorder = (tier?: string | null): string =>
  TIER_BORDER[tier || DEFAULT_TIER] || TIER_BORDER[DEFAULT_TIER];
