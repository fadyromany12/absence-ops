/* The Disciplinary Consequences Matrix.

   Per the Lenovo Acknowledgement Form HR-EG-DIS-001 v1.0 (effective 21 Apr 2026).
   35 violations across four severity tiers. This is the *default* matrix — the
   DCM tab writes user edits over it, so nothing here may be assumed at runtime.

   Executor is derived, not stored per row: a Verbal Warning is issued by the TL,
   everything above it is executed by HR. */

export const VW = "Verbal Warning";
export const WW1 = "Written Warning + 1-day deduction";
export const WW3 = "Written Warning + 3-day deduction";
export const FW3 = "Final Warning + 3-day deduction";
export const FW5 = "Final Warning + 5-day deduction";
export const TERM = "Termination of Employment";
export const INV = "HR + Legal Investigation";
export const ZT = "Zero Tolerance — Immediate Termination";

const ex = (a) => (!a ? "" : a.startsWith("Verbal") ? "TL" : "HR");

const mk = (id, name, severity, a1, a2, a3) => ({
  id,
  name,
  severity,
  a1,
  e1: ex(a1),
  a2: a2 || "",
  e2: ex(a2),
  a3: a3 || "",
  e3: ex(a3),
});

export const DEFAULT_DCM = [
  // ── Minor — progressive discipline ────────────────────────────────────────
  mk("late", "Late login / tardy", "Minor", VW, WW1, WW3),
  mk("break", "Exceeding break time", "Minor", VW, WW1, WW3),
  mk("offhours", "Login outside scheduled hours", "Minor", VW, WW1, FW3),
  mk("sleep", "Sleeping / resting at workstation", "Minor", VW, WW1, WW3),
  mk("script", "Not following scripts / procedures", "Minor", VW, WW1, FW3),
  mk("casedoc", "Case documentation failure", "Minor", VW, WW1, FW3),
  mk("tailgate", "Tailgating security checkpoint", "Minor", VW, WW1, FW3),

  // ── Moderate — accelerated discipline ─────────────────────────────────────
  mk("absent", "Unauthorised absence", "Moderate", WW1, WW3, FW5),
  mk("ncns", "NCNS", "Moderate", WW3, FW5, TERM),
  mk("floor", "Leaving floor / early departure", "Moderate", WW1, WW3, FW5),
  mk("attcust", "Bad attitude — customer", "Moderate", WW3, FW5, TERM),
  mk("attcol", "Bad attitude — colleague", "Moderate", WW1, WW3, FW5),
  mk("insub", "Insubordination to manager", "Moderate", WW3, FW5, TERM),
  mk("conduct", "Conduct unbecoming", "Moderate", WW3, FW5, TERM),
  mk("auth", "Failure to authenticate customer", "Moderate", WW3, FW5, TERM),
  mk("datachg", "Changing data without confirmation", "Moderate", WW3, FW5, TERM),
  mk("aux", "Avoiding contacts / AUX manipulation", "Moderate", WW3, FW5, TERM),
  mk("transfer", "Unauthorised transfer", "Moderate", WW1, FW3, TERM),
  mk("roam", "Roaming on productive AUX", "Moderate", WW3, FW5, TERM),
  mk("device", "Personal devices on floor", "Moderate", WW3, FW5, TERM),

  // ── Serious — fast-track ──────────────────────────────────────────────────
  mk("assault", "Physical assault / threats", "Serious", INV, TERM, ""),
  mk("refuse", "Refusing HR investigation", "Serious", WW3, FW5, TERM),
  mk("dataaccess", "Data access without business reason", "Serious", INV, TERM, ""),
  mk("csat", "CSAT survey manipulation", "Serious", FW5, TERM, ""),
  mk("card", "Sharing / using colleague's access card", "Serious", INV, TERM, ""),
  mk("fakesick", "Fake sick leave", "Serious", FW5, TERM, ""),
  mk("avoidance", "Deliberate contact avoidance", "Serious", WW3, FW5, TERM),

  // ── Zero Tolerance — immediate termination ────────────────────────────────
  mk("disclose", "Disclosing customer data", "Zero Tolerance", ZT, "", ""),
  mk("retain", "Retaining customer data for personal use", "Zero Tolerance", ZT, "", ""),
  mk("creds", "Sharing system credentials", "Zero Tolerance", ZT, "", ""),
  mk("fraud", "Fraud / falsifying records", "Zero Tolerance", ZT, "", ""),
  mk("theft", "Theft", "Zero Tolerance", ZT, "", ""),
  mk("substances", "Bringing prohibited substances", "Zero Tolerance", ZT, "", ""),
  mk("influence", "Under the influence at work", "Zero Tolerance", ZT, "", ""),
  mk("bribe", "Bribery / personal benefit", "Zero Tolerance", ZT, "", ""),
];

export const newRule = (id) => ({
  id,
  name: "New violation",
  severity: "Minor",
  a1: VW,
  e1: "TL",
  a2: WW1,
  e2: "HR",
  a3: FW3,
  e3: "HR",
});
