/* Rolling up the ledger per agent.

   Shared by the Live Verdict snapshot and the Agent Profiles tab so both answer
   "where does this person actually stand?" the same way. */

import { RESET_DAYS, EMERGENCY_QUOTA } from "./constants.js";
import { todayStr, daysBetween, addDays, monthOf } from "./dates.js";
import { countsForDiscipline, occurrenceFor, emergencyUsage, statusOf, monthlyDeductionFor } from "./engine.js";

const norm = (s) => (s || "").trim().toLowerCase();

/** Every distinct agent in the ledger, most recently active first. */
export function listAgents(entries) {
  const map = new Map();
  for (const e of entries) {
    const key = norm(e.email);
    if (!key) continue;
    const prev = map.get(key);
    const row = prev || { email: e.email, empId: e.empId, account: e.account, tl: e.tl, cases: 0, lastDate: "" };
    row.cases++;
    if (!row.empId && e.empId) row.empId = e.empId;
    // Most recent case wins for the mutable attributes — agents move accounts.
    if (!row.lastDate || String(e.date) > row.lastDate) {
      row.lastDate = e.date;
      row.account = e.account;
      row.tl = e.tl;
    }
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => String(b.lastDate).localeCompare(String(a.lastDate)));
}

/**
 * An agent's standing as of `asOf`.
 *
 * "Active warning" means the agent is mid-chain on a violation: the last
 * escalated occurrence is inside the 90-day window, so the next one advances
 * the tier rather than resetting to №1.
 */
export function agentSummary(entries, email, asOf = todayStr()) {
  const mine = entries.filter((e) => norm(e.email) === norm(email));
  const live = mine.filter(countsForDiscipline);
  const dismissed = mine.filter((e) => e.stage === "dismissed");
  const pending = mine.filter((e) => e.stage === "review");

  const violations = [...new Set(live.filter((e) => e.disciplinary).map((e) => e.violation))];

  const activeWarnings = violations
    .map((violation) => {
      const rows = live.filter((e) => e.violation === violation && e.date).sort((a, b) => a.date.localeCompare(b.date));
      const last = rows[rows.length - 1];
      if (!last) return null;
      const age = daysBetween(last.date, asOf);
      const { occ } = occurrenceFor(entries, email, violation, last.date, null);
      return {
        violation,
        severity: last.severity,
        occ,
        action: last.action,
        lastDate: last.date,
        resetOn: addDays(last.date, RESET_DAYS),
        daysLeft: RESET_DAYS - age,
        expired: age > RESET_DAYS,
      };
    })
    .filter(Boolean)
    .filter((w) => !w.expired)
    .sort((a, b) => b.occ - a.occ || a.resetOn.localeCompare(b.resetOn));

  const emergency = emergencyUsage(entries, email, asOf, "__none__");

  return {
    email,
    empId: mine.find((e) => e.empId)?.empId || "",
    account: live[0]?.account || mine[0]?.account || "",
    tl: live[0]?.tl || mine[0]?.tl || "",
    total: mine.length,
    live: live.length, // escalated only — the cases that carry consequences
    logged: mine.length - dismissed.length, // everything a manager hasn't thrown out
    pending: pending.length,
    dismissed: dismissed.length,
    hoursLost: live.reduce((s, e) => s + (e.missingMin || 0), 0),
    monthDeduction: monthlyDeductionFor(entries, email, monthOf(asOf)),
    totalDeduction: live.reduce((s, e) => s + (e.deductionApplied || 0), 0),
    activeWarnings,
    emergency: { ...emergency, used: emergency.yearUsed, quota: EMERGENCY_QUOTA },
    openCases: mine.filter((e) => {
      const s = statusOf(e);
      return s !== "Closed" && s !== "Dismissed";
    }).length,
  };
}

/** Chronological case history, newest first, for the profile timeline. */
export function agentTimeline(entries, email, windowDays) {
  const today = todayStr();
  return entries
    .filter((e) => norm(e.email) === norm(email))
    .filter((e) => !windowDays || daysBetween(e.date, today) <= windowDays)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)) || (b.createdAt || 0) - (a.createdAt || 0));
}
