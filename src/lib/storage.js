/* Reading whatever is in localStorage and dragging it up to the current shape.

   Saved data is never trusted: it may predate fields, use retired violation
   names, or be hand-edited nonsense. `normalize` always returns something the
   rest of the app can render. */

import { DEFAULTS, DATA_VERSION } from "./constants.js";
import { DEFAULT_DCM } from "./dcm.js";
import { settleDeductions } from "./deductions.js";

/** Violation names retired in v2. */
const NAME_MAP = {
  "Late Arrival": "Late login / tardy",
  "Late Arrival + Early Departure": "Late login / tardy",
  Absent: "Unauthorised absence",
  "Early Departure": "Leaving floor / early departure",
};

export function normalize(raw) {
  const stored = raw && typeof raw === "object" ? raw : {};
  const from = Number(stored.version) || 1;

  const base = {
    version: DATA_VERSION,
    accounts: Array.isArray(stored.accounts) && stored.accounts.length ? stored.accounts : DEFAULTS.accounts,
    tls: Array.isArray(stored.tls) && stored.tls.length ? stored.tls : DEFAULTS.tls,
    // The v1 matrix used different rule ids and a different shape, so it can't be
    // migrated field by field and is replaced wholesale. From v2 on the shape is
    // stable and any admin edits survive.
    dcm: from < 2 || !Array.isArray(stored.dcm) || !stored.dcm.length ? DEFAULT_DCM : stored.dcm,
    entries: Array.isArray(stored.entries) ? stored.entries : [],
  };

  base.entries = base.entries.map((e) => ({
    ...e,
    violation: from < 2 ? NAME_MAP[e.violation] || e.violation : e.violation,
    severity: e.severity === "Major" ? "Moderate" : e.severity,
    stage: e.stage || "active",
    assignee: e.assignee ?? (e.tl || ""),
    activity: Array.isArray(e.activity) ? e.activity : [],
  }));

  // v3 introduced stored deduction days — replay the ledger so each entry gets
  // the cap it would have been given when it was logged.
  if (from < DATA_VERSION) base.entries = settleDeductions(base.entries);

  return base;
}
