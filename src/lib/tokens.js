/* Design tokens — the dark glass palette.

   The workspace components style themselves inline from this object, so this
   file IS the theme: every card, pill and border reads from here at runtime.
   v4 flips the palette from the legacy light "paper" look to the frosted dark
   aesthetic the login and agent portal already wear — translucent whites over
   the aurora backdrop painted by globals.css. */

export const P = {
  // Surfaces
  paper: "transparent", // the aurora body shows through
  card: "rgba(255,255,255,0.055)", // frosted card fill (pair with .ao-glass for blur)
  deep: "rgba(8,18,26,0.72)", // headers & verdict panels — darker than the cards
  mist: "rgba(255,255,255,0.07)", // inset wells, chart tracks, chips
  line: "rgba(255,255,255,0.12)", // hairline borders

  // Text
  ink: "#E9F1F0", // primary
  inkSoft: "#C9D6D4", // secondary
  sub: "#8FA6A9", // muted / labels

  // Accents (brightened for dark backgrounds)
  petrol: "#34B3A8",
  amber: "#E8A54B",
  brick: "#EC6F5D",
  green: "#46C08A",
};

export const SEV_ORDER = ["Minor", "Moderate", "Serious", "Zero Tolerance"];

export const SEV_COLOR = {
  Minor: "#93A6AB",
  Moderate: "#E8A54B",
  Serious: "#EC6F5D",
  "Zero Tolerance": "#A78BFA", // violet — matches the portal's high-priority accent
};

export const ACCOUNT_COLORS = { Hertz: "#FBBF24", Lenovo: "#F87171", Beko: "#60A5FA" };

export const STATUS_COLOR = {
  "Pending review": P.petrol,
  Dismissed: "#8A9598",
  Open: P.sub,
  "Awaiting OPS": P.amber,
  "Awaiting HR": P.brick,
  Closed: P.green,
};

export const accColor = (a) => ACCOUNT_COLORS[a] || P.petrol;
export const sevColor = (s) => SEV_COLOR[s] || P.brick;
