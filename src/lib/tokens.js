/* Design tokens — Quorum's "Ink & Signal" palette.

   The workspace components style themselves inline from this object, so this
   file IS the theme: every card, pill and border reads from it at runtime.
   One accent — the violet Signal — carries the brand; amber/rose/green stay
   strictly semantic (warning/danger/success), never decorative. */

export const P = {
  // Surfaces
  paper: "transparent", // the ink aurora shows through
  card: "rgba(255,255,255,0.045)", // frosted panel fill (pair with .ao-glass for blur)
  deep: "rgba(7,10,18,0.74)", // headers & verdict panels — darker than the cards
  mist: "rgba(255,255,255,0.08)", // inset wells, chart tracks, chips
  line: "rgba(255,255,255,0.09)", // hairline borders

  // Text
  ink: "#F4F7F9", // primary
  inkSoft: "#B7C3CC", // secondary
  sub: "#8B9AA6", // muted / labels

  // The Signal — Quorum violet. Primary actions, active nav, pending states.
  petrol: "#8B5CF6", // (name kept for compatibility: ~40 call sites read P.petrol)

  // Semantic accents
  amber: "#F5A623",
  brick: "#F26D5F",
  green: "#34D399",
};

export const SEV_ORDER = ["Minor", "Moderate", "Serious", "Zero Tolerance"];

export const SEV_COLOR = {
  Minor: "#93A6AB",
  Moderate: "#F5A623",
  Serious: "#F26D5F",
  // Magenta, not violet: Zero Tolerance must never read as brand accent.
  "Zero Tolerance": "#F472B6",
};

export const ACCOUNT_COLORS = { Hertz: "#F5A623", Lenovo: "#F87171", Beko: "#38BDF8" };

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
