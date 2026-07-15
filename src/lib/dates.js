/* Calendar-date arithmetic.

   Every date in this app is a plain YYYY-MM-DD calendar day, never an instant.
   Parsing those through `new Date("2026-05-01T00:00:00")` binds them to local
   midnight, so any span crossing a DST boundary is an hour short and a 90-day
   comparison can land on the wrong side of the window. Anchoring to UTC instead
   makes the arithmetic exact: every day is 86 400 000 ms wide, always. */

export const DAY_MS = 86400000;

/** YYYY-MM-DD -> UTC-midnight timestamp. NaN for empty/malformed input. */
export function parseDay(s) {
  if (!s) return NaN;
  const [y, m, d] = String(s).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return NaN;
  return Date.UTC(y, m - 1, d);
}

/** UTC-midnight timestamp -> YYYY-MM-DD. */
export function toDay(ts) {
  return new Date(ts).toISOString().slice(0, 10);
}

/** The user's *local* calendar date. `toISOString()` would report the UTC day,
    which is the previous date for Cairo (UTC+2/+3) before 02:00 local. */
export function todayStr() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

export function addDays(s, n) {
  const t = parseDay(s);
  return Number.isNaN(t) ? "" : toDay(t + n * DAY_MS);
}

/** Whole days from `a` to `b`. Negative when `b` precedes `a`. */
export function daysBetween(a, b) {
  const ta = parseDay(a);
  const tb = parseDay(b);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return NaN;
  return Math.round((tb - ta) / DAY_MS);
}

/** Whole days from `dateStr` until today. */
export function daysAgo(dateStr) {
  return daysBetween(dateStr, todayStr());
}

export const monthOf = (d) => String(d || "").slice(0, 7);
export const yearOf = (d) => String(d || "").slice(0, 4);

/** Length of the unbroken run of calendar days containing `target`. */
export function consecutiveRun(dates, target) {
  const set = new Set(dates);
  set.add(target);
  let len = 1;
  for (let d = addDays(target, -1); set.has(d); d = addDays(d, -1)) len++;
  for (let d = addDays(target, 1); set.has(d); d = addDays(d, 1)) len++;
  return len;
}
