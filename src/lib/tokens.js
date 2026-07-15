/* Design tokens — the Konecta GDC palette the tracker has always used.
   Colours live here rather than in Tailwind's theme because severity and
   account colours are looked up dynamically at runtime. */

export const P = {
  paper: "#EDF0EF",
  card: "#FFFFFF",
  ink: "#12262E",
  inkSoft: "#1D3640",
  petrol: "#0C5E63",
  amber: "#C97A1F",
  brick: "#B3392B",
  green: "#2F7A52",
  sub: "#5C6F74",
  line: "#D9E0DE",
  mist: "#E3E9E7",
};

export const SEV_ORDER = ["Minor", "Moderate", "Serious", "Zero Tolerance"];

export const SEV_COLOR = {
  Minor: "#5C6F74",
  Moderate: "#C97A1F",
  Serious: "#B3392B",
  "Zero Tolerance": "#191919",
};

export const ACCOUNT_COLORS = { Hertz: "#E0B22C", Lenovo: "#C43D33", Beko: "#2C5FA8" };

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
