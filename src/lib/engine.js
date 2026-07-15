/* The rules engine: given an agent, a violation and a date, what does the
   matrix prescribe? Everything here is pure — no React, no storage — so the
   Log form, the Triage gate and the Agent profile all read the same verdict. */

import {
  RESET_DAYS,
  EMERGENCY_QUOTA,
  EMERGENCY_MAX_CONSECUTIVE,
  PER_INCIDENT_CAP,
  PER_MONTH_CAP,
  LAW_CITATION,
} from "./constants.js";
import { todayStr, daysBetween, addDays, monthOf, yearOf, consecutiveRun } from "./dates.js";
import { deductionDaysOf, applyLaborLawCap, capNotes } from "./deductions.js";
import { days, ordinal } from "./format.js";

const norm = (s) => (s || "").trim().toLowerCase();
const sameAgent = (e, email) => norm(e.email) === norm(email);

/** A case counts toward discipline only once a manager has escalated it.
    Pending-review cases are deliberately inert — that is the point of the
    triage gate — and dismissed cases never count at all. */
export const countsForDiscipline = (e) => e.stage === "active";

export function statusOf(e) {
  if (e.stage === "review") return "Pending review";
  if (e.stage === "dismissed") return "Dismissed";
  if (e.notified && e.opsConfirmed && (!e.hrNeeded || e.hrConfirmed)) return "Closed";
  if (e.notified && e.opsConfirmed && e.hrNeeded && !e.hrConfirmed) return "Awaiting HR";
  if (e.notified && !e.opsConfirmed) return "Awaiting OPS";
  return "Open";
}

export function findRule(dcm, { id, name }) {
  return (id && dcm.find((r) => r.id === id)) || (name && dcm.find((r) => r.name === name)) || null;
}

/**
 * Which occurrence of `violation` would an incident on `date` be?
 *
 * Warnings expire 90 days after the *previous* occurrence, so the count is a
 * chain, not a fixed window: each incident either extends the chain (gap from
 * the one before it is <= 90 days) or starts a fresh one at №1. An agent late
 * on day 0, day 80 and day 170 is on their 3rd occurrence — even though day 0
 * is 170 days back — because neither gap ever exceeded 90.
 */
export function occurrenceFor(entries, email, violation, date, excludeId) {
  const priors = entries
    .filter(
      (e) =>
        e.id !== excludeId &&
        e.violation === violation &&
        sameAgent(e, email) &&
        countsForDiscipline(e) &&
        e.date &&
        e.date <= date
    )
    .map((e) => e.date)
    .sort();

  let occ = 0;
  let prev = null;
  for (const d of [...priors, date]) {
    occ = prev === null || daysBetween(prev, d) > RESET_DAYS ? 1 : occ + 1;
    prev = d;
  }
  return { occ, priorDates: priors, lastPrior: priors[priors.length - 1] || null };
}

/** Emergency-leave consumption for an agent, as of `date`. */
export function emergencyUsage(entries, email, date, excludeId) {
  const rows = entries.filter(
    (e) =>
      e.id !== excludeId &&
      e.violation === "Emergency Leave" &&
      sameAgent(e, email) &&
      e.stage !== "dismissed" &&
      e.date
  );

  const yearUsed = rows.filter((e) => yearOf(e.date) === yearOf(date)).length;
  const monthDates = rows.filter((e) => monthOf(e.date) === monthOf(date)).map((e) => e.date);
  const run = consecutiveRun(monthDates, date);

  const yearAfter = yearUsed + 1;
  const yearExceeded = yearAfter > EMERGENCY_QUOTA;
  const runExceeded = run > EMERGENCY_MAX_CONSECUTIVE;

  let reason = "";
  if (yearExceeded) {
    reason = `Annual emergency quota spent — this is day ${yearAfter} of ${EMERGENCY_QUOTA}. Beyond the quota, unplanned leave is unauthorised absence.`;
  } else if (runExceeded) {
    reason = `${run} consecutive emergency days this month — the limit is ${EMERGENCY_MAX_CONSECUTIVE}. Days beyond the run are unauthorised absence.`;
  }

  return {
    yearUsed,
    yearAfter,
    monthDates,
    run,
    yearExceeded,
    runExceeded,
    exceeded: yearExceeded || runExceeded,
    remaining: Math.max(0, EMERGENCY_QUOTA - yearAfter),
    reason,
  };
}

function disciplinaryVerdict(rule, email, date, entries, dcm, excludeId) {
  const { occ, lastPrior } = occurrenceFor(entries, email, rule.name, date, excludeId);

  // Walk back to the highest step the matrix actually defines.
  let step = Math.min(occ, 3);
  while (step > 1 && !rule["a" + step]) step--;
  const action = rule["a" + step];
  const executor = rule["e" + step] || "HR";

  const cap = applyLaborLawCap(deductionDaysOf(action), { entries, email, date, excludeId });

  const notes = [];
  if (lastPrior) {
    notes.push(
      `Previous occurrence ${fmtGap(lastPrior, date)} — inside the ${RESET_DAYS}-day window, so the count advances. Dismissed cases are excluded.`
    );
  }
  const pending = countPendingSame(entries, email, rule.name, date, excludeId);
  if (pending > 0) {
    notes.push(
      `${pending} earlier case${pending === 1 ? "" : "s"} of this violation still awaiting triage — not counted until escalated.`
    );
  }
  if (occ > 3 && rule.a3) {
    notes.push("Beyond the 3rd occurrence — the matrix is exhausted; escalate to HR / Practice.");
  }
  if (occ > 1 && !rule["a" + Math.min(occ, 3)]) {
    notes.push("Matrix defines no further step — the outcome follows the HR / Legal investigation.");
  }
  if (rule.severity === "Zero Tolerance") {
    notes.push("Immediate suspension pending investigation may apply; termination only after the mandatory investigation.");
  }
  if (rule.severity === "Serious" || rule.severity === "Zero Tolerance") {
    notes.push("Employee must be notified in writing, given 3–5 working days to respond, and may have a colleague present.");
  }
  if (cap.prescribed > 0) {
    notes.push(
      `${LAW_CITATION}: deductions capped at ${PER_INCIDENT_CAP} days per incident and ${PER_MONTH_CAP} days per calendar month.`
    );
    notes.push(...capNotes(cap));
  }

  return {
    disciplinary: true,
    ruleId: rule.id,
    occ,
    step,
    action,
    executor,
    severity: rule.severity,
    cap,
    resetOn: addDays(date, RESET_DAYS),
    investigation: rule.severity === "Serious" || rule.severity === "Zero Tolerance",
    notes,
  };
}

function countPendingSame(entries, email, violation, date, excludeId) {
  return entries.filter(
    (e) =>
      e.id !== excludeId &&
      e.violation === violation &&
      sameAgent(e, email) &&
      e.stage === "review" &&
      e.date &&
      e.date <= date
  ).length;
}

function fmtGap(from, to) {
  const n = daysBetween(from, to);
  if (n === 0) return "was the same day";
  return `was ${days(n)} ago`;
}

const NO_CAP = applyLaborLawCap(0);

/**
 * The verdict for one incident. Returns null when no violation is selected.
 *
 * `entries` is the whole ledger; `excludeId` omits an entry from its own
 * history when re-evaluating a case that is already logged.
 */
export function verdictFor(violation, email, date, entries, dcm, excludeId) {
  if (!violation) return null;
  const d = date || todayStr();

  // Emergency leave past the quota is not leave at all — the policy reclassifies
  // it as unauthorised absence, which means it runs through the matrix.
  if (violation === "Emergency Leave") {
    const em = emergencyUsage(entries, email, d, excludeId);
    if (em.exceeded) {
      const rule = findRule(dcm, { id: "absent", name: "Unauthorised absence" });
      if (rule) {
        const v = disciplinaryVerdict(rule, email, d, entries, dcm, excludeId);
        return { ...v, emergency: em, reclassifiedFrom: "Emergency Leave", notes: [em.reason, ...v.notes] };
      }
    }
    return {
      disciplinary: false,
      occ: null,
      action: "No disciplinary action — approved leave",
      executor: "TL",
      severity: null,
      cap: NO_CAP,
      emergency: em,
      investigation: false,
      notes: [
        `Emergency quota: day ${em.yearAfter} of ${EMERGENCY_QUOTA} this year, ${em.remaining} remaining.`,
        `Consecutive run this month: ${days(em.run)} of ${EMERGENCY_MAX_CONSECUTIVE} allowed.`,
      ],
    };
  }

  const rule = dcm.find((r) => r.name === violation);
  if (rule) return disciplinaryVerdict(rule, email, d, entries, dcm, excludeId);

  // Everything else is approved / excused leave.
  const notes = [];
  if (violation === "Sick Leave") notes.push("Medical certificate required for 2+ consecutive days.");
  if (violation === "Annual Leave") notes.push("Must be requested and approved one month in advance.");
  if (violation === "Work From Home") notes.push("Requires prior manager approval.");
  if (violation === "Exam Leave") notes.push("Requires proof of enrolment and the exam timetable.");
  if (violation === "Other") notes.push("Describe the case and the action taken in the notes.");

  return {
    disciplinary: false,
    occ: null,
    action: "No disciplinary action — approved leave",
    executor: "TL",
    severity: null,
    cap: NO_CAP,
    investigation: false,
    notes,
  };
}

/* ── Systemic escalation thresholds ─────────────────────────────────────────
   These look across violations rather than at one rule, and fire on patterns
   the matrix alone would miss. */

export function computeEscalations(entries) {
  const live = entries.filter(countsForDiscipline);
  const today = todayStr();
  const byAgent = {};

  for (const e of live) {
    const em = norm(e.email);
    if (!em) continue;
    if (!byAgent[em]) {
      byAgent[em] = { email: e.email, account: e.account, in30: 0, in60: 0, ncns: [], emergency: 0 };
    }
    const a = byAgent[em];
    a.account = e.account;
    const age = daysBetween(e.date, today);

    if (e.disciplinary) {
      if (age <= 30) a.in30++;
      if (age <= 60) a.in60++;
      if (e.violation === "NCNS" && age <= RESET_DAYS) a.ncns.push(e.date);
    }
    if (e.violation === "Emergency Leave" && yearOf(e.date) === yearOf(today)) a.emergency++;
  }

  const out = [];
  for (const a of Object.values(byAgent)) {
    if (a.ncns.length >= 2) {
      out.push({
        level: "Serious",
        kind: "ncns",
        email: a.email,
        account: a.account,
        title: `Repeat NCNS — ${a.ncns.length}× in ${RESET_DAYS} days`,
        text: "Lock operational profiles immediately and escalate to HR.",
      });
    }
    if (a.in60 >= 5) {
      out.push({
        level: "Serious",
        kind: "5in60",
        email: a.email,
        account: a.account,
        title: `${a.in60} infractions in 60 days`,
        text: "Threshold breached — open an HR intervention plan.",
      });
    } else if (a.in30 >= 3) {
      out.push({
        level: "Moderate",
        kind: "3in30",
        email: a.email,
        account: a.account,
        title: `${a.in30} infractions in 30 days`,
        text: "Mandatory one-on-one performance alignment call with the TL.",
      });
    }
    if (a.emergency > EMERGENCY_QUOTA) {
      out.push({
        level: "Serious",
        kind: "emergency",
        email: a.email,
        account: a.account,
        title: `Emergency quota exceeded — ${a.emergency}/${EMERGENCY_QUOTA}`,
        text: "Further unplanned leave is logged as unauthorised absence.",
      });
    } else if (a.emergency >= EMERGENCY_QUOTA - 1) {
      out.push({
        level: "Moderate",
        kind: "emergency",
        email: a.email,
        account: a.account,
        title: `Emergency quota nearly spent — ${a.emergency}/${EMERGENCY_QUOTA}`,
        text: "Warn the TL before approving further unplanned time off.",
      });
    }
  }

  const rank = { Serious: 0, Moderate: 1 };
  return out.sort((x, y) => rank[x.level] - rank[y.level]);
}

/**
 * Deduction days consumed by an agent in a calendar month, against the 5-day
 * ceiling.
 *
 * Counts triage-stage cases as well as escalated ones, deliberately: this is
 * the figure the cap calculator spends, and a pending case must reserve its
 * headroom or two cases could each be promised the same 5 days and blow the
 * ceiling once both are escalated. Dismissing a case hands the headroom back.
 * Kept in step with `monthDeductionUsed` in deductions.js — change both or
 * neither.
 */
export function monthlyDeductionFor(entries, email, month) {
  return entries
    .filter((e) => sameAgent(e, email) && e.stage !== "dismissed" && monthOf(e.date) === month)
    .reduce((s, e) => s + (e.deductionApplied || 0), 0);
}
