import { parseDay } from "./dates.js";

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);

export const fmtMin = (m) => {
  const t = Math.round(m || 0);
  const h = Math.floor(t / 60);
  const mm = t % 60;
  return h === 0 ? `${mm}m` : `${h}h ${String(mm).padStart(2, "0")}m`;
};

export const fmtDate = (d) => {
  const t = parseDay(d);
  if (Number.isNaN(t)) return "—";
  return new Date(t).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" });
};

export const fmtDateLong = (d) => {
  const t = parseDay(d);
  if (Number.isNaN(t)) return "—";
  return new Date(t).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
};

export const fmtStamp = (t) =>
  new Date(t).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export const ordinal = (n) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;

export const csvCell = (v) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const days = (n) => `${n} day${n === 1 ? "" : "s"}`;

/** `plural(1, "case")` -> "1 case"; `plural(3, "entry", "entries")` -> "3 entries". */
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many || `${one}s`}`;

/** "nour.said@demo.konecta" -> "Nour Said". Empty in, empty out. */
export const nameFromEmail = (email) =>
  String(email || "")
    .split("@")[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
