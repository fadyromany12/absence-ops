/* The brand, in one place. Every header, title, login screen and doc string
   reads from here — renaming the product is an edit to this file, not a hunt. */

export const BRAND = {
  name: "Quorum",
  /** Lowercase wordmark form, per the identity spec. */
  wordmark: "quorum",
  tagline: "Workforce compliance — present and accounted for",
  org: "Konecta GDC",
  /** The Signal: the one accent color. Violet, per the Quorum identity. */
  signal: "#8B5CF6",
  signalSoft: "rgba(139,92,246,0.14)",
} as const;
