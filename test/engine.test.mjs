/* Exercising the rules engine against the spec's stated behaviours. */
const LIB = "../src/lib";
const { verdictFor, occurrenceFor, emergencyUsage, computeEscalations } = await import(`${LIB}/engine.js`);
const { applyLaborLawCap, settleDeductions, deductionDaysOf } = await import(`${LIB}/deductions.js`);
const { DEFAULT_DCM } = await import(`${LIB}/dcm.js`);
const { addDays, todayStr, daysBetween, consecutiveRun } = await import(`${LIB}/dates.js`);

let pass = 0, fail = 0;
const eq = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}\n         got:  ${JSON.stringify(got)}\n         want: ${JSON.stringify(want)}`); }
};

const T = todayStr();
const D = (n) => addDays(T, -n);
let seq = 0;
const mk = (o) => ({
  id: `e${++seq}`, account: "Lenovo", email: "a@x", empId: "EG1", tl: "TL",
  stage: "active", disciplinary: true, missingMin: 0, createdAt: seq,
  deductionDays: 0, deductionApplied: 0, activity: [], ...o,
});

console.log("\n── Date arithmetic ──");
eq("90 days apart", daysBetween("2026-01-01", "2026-04-01"), 90);
eq("addDays crosses month", addDays("2026-01-31", 1), "2026-02-01");
eq("leap day", addDays("2028-02-28", 1), "2028-02-29");
eq("consecutive run of 3", consecutiveRun(["2026-05-01", "2026-05-02", "2026-05-03"], "2026-05-02"), 3);
eq("broken run", consecutiveRun(["2026-05-01", "2026-05-03"], "2026-05-03"), 1);

console.log("\n── 90-day chain (spec 3A) ──");
{
  // day 0, day 80, day 170: neither gap exceeds 90, so the chain never breaks.
  const es = [mk({ date: D(170), violation: "Late login / tardy" }), mk({ date: D(90), violation: "Late login / tardy" })];
  eq("chained: 170d + 90d ago -> 3rd", occurrenceFor(es, "a@x", "Late login / tardy", D(0)).occ, 3);
}
{
  // A gap of 91 days resets the count.
  const es = [mk({ date: D(200), violation: "Late login / tardy" }), mk({ date: D(100), violation: "Late login / tardy" })];
  eq("gap 100d resets -> 1st", occurrenceFor(es, "a@x", "Late login / tardy", D(0)).occ, 1);
}
{
  const es = [mk({ date: D(91), violation: "NCNS" })];
  eq("exactly 91d -> reset", occurrenceFor(es, "a@x", "NCNS", D(0)).occ, 1);
  const es2 = [mk({ date: D(90), violation: "NCNS" })];
  eq("exactly 90d -> advances", occurrenceFor(es2, "a@x", "NCNS", D(0)).occ, 2);
}
{
  const es = [mk({ date: D(10), violation: "NCNS", stage: "dismissed" })];
  eq("dismissed excluded", occurrenceFor(es, "a@x", "NCNS", D(0)).occ, 1);
  const es2 = [mk({ date: D(10), violation: "NCNS", stage: "review" })];
  eq("pending triage not counted", occurrenceFor(es2, "a@x", "NCNS", D(0)).occ, 1);
}
{
  const es = [mk({ date: D(10), violation: "NCNS", email: "other@x" })];
  eq("other agent excluded", occurrenceFor(es, "a@x", "NCNS", D(0)).occ, 1);
}

console.log("\n── DCM progression ──");
{
  const es = [];
  const v1 = verdictFor("NCNS", "a@x", D(20), es, DEFAULT_DCM);
  eq("NCNS 1st", [v1.occ, v1.action], [1, "Written Warning + 3-day deduction"]);
  es.push(mk({ date: D(20), violation: "NCNS", action: v1.action, deductionDays: 3, deductionApplied: 3 }));
  const v2 = verdictFor("NCNS", "a@x", D(10), es, DEFAULT_DCM);
  eq("NCNS 2nd", [v2.occ, v2.action], [2, "Final Warning + 5-day deduction"]);
  es.push(mk({ date: D(10), violation: "NCNS", action: v2.action, deductionDays: 5, deductionApplied: 5 }));
  const v3 = verdictFor("NCNS", "a@x", D(1), es, DEFAULT_DCM);
  eq("NCNS 3rd -> termination", [v3.occ, v3.action], [3, "Termination of Employment"]);
}
{
  const v = verdictFor("Disclosing customer data", "a@x", D(0), [], DEFAULT_DCM);
  eq("ZT 1st", [v.severity, v.action, v.investigation], ["Zero Tolerance", "Zero Tolerance — Immediate Termination", true]);
}
{
  const v = verdictFor("Late login / tardy", "a@x", D(0), [], DEFAULT_DCM);
  eq("Minor 1st -> verbal, TL executes", [v.action, v.executor, v.cap.prescribed], ["Verbal Warning", "TL", 0]);
}
{
  // 4th occurrence has no a4 — must clamp to the 3rd step, not crash.
  const es = [1, 2, 3].map((i) => mk({ date: D(30 - i * 5), violation: "Late login / tardy" }));
  const v = verdictFor("Late login / tardy", "a@x", D(0), es, DEFAULT_DCM);
  eq("4th clamps to 3rd step", [v.occ, v.action], [4, "Written Warning + 3-day deduction"]);
}
{
  // Serious rule with only two steps defined.
  const es = [mk({ date: D(10), violation: "Physical assault / threats" })];
  const v = verdictFor("Physical assault / threats", "a@x", D(0), es, DEFAULT_DCM);
  eq("Serious 2nd -> termination", [v.occ, v.action], [2, "Termination of Employment"]);
}

console.log("\n── Labour-law caps (spec 3B) ──");
eq("parse deduction days", [deductionDaysOf("Written Warning + 3-day deduction"), deductionDaysOf("Verbal Warning")], [3, 0]);
{
  const c = applyLaborLawCap(7, { entries: [], email: "a@x", date: D(0) });
  eq("7 days -> capped at 5", [c.applied, c.incidentCapped, c.waived], [5, true, 2]);
}
{
  const es = [mk({ date: D(2), violation: "NCNS", deductionApplied: 3 })];
  const c = applyLaborLawCap(5, { entries: es, email: "a@x", date: D(1) });
  eq("3 used -> only 2 headroom", [c.applied, c.monthUsed, c.headroom, c.monthCapped], [2, 3, 2, true]);
}
{
  const es = [mk({ date: D(2), violation: "NCNS", deductionApplied: 5 })];
  const c = applyLaborLawCap(5, { entries: es, email: "a@x", date: D(1) });
  eq("month exhausted -> 0", [c.applied, c.headroom], [0, 0]);
}
{
  const es = [mk({ date: D(2), violation: "NCNS", deductionApplied: 5, stage: "dismissed" })];
  const c = applyLaborLawCap(5, { entries: es, email: "a@x", date: D(1) });
  eq("dismissed frees headroom", c.applied, 5);
}
{
  // Different calendar month -> fresh headroom.
  const es = [mk({ date: "2026-05-30", violation: "NCNS", deductionApplied: 5 })];
  const c = applyLaborLawCap(5, { entries: es, email: "a@x", date: "2026-06-01" });
  eq("new month resets headroom", c.applied, 5);
}
{
  const settled = settleDeductions([
    mk({ date: "2026-06-10", violation: "NCNS", action: "Written Warning + 3-day deduction", deductionDays: 3 }),
    mk({ date: "2026-06-20", violation: "NCNS", action: "Final Warning + 5-day deduction", deductionDays: 5 }),
  ]);
  eq("settle: 3 then 5 -> 3 + 2", settled.map((e) => e.deductionApplied), [3, 2]);
  const total = settled.reduce((s, e) => s + e.deductionApplied, 0);
  eq("settle: month total never exceeds 5", total, 5);
}

console.log("\n── Emergency leave (spec 3C) ──");
{
  const es = Array.from({ length: 6 }, (_, i) => mk({ date: D(150 - i * 20), violation: "Emergency Leave", disciplinary: false }));
  const u = emergencyUsage(es, "a@x", D(0));
  eq("6 used -> 7th exceeds", [u.yearUsed, u.yearExceeded], [6, true]);
  const v = verdictFor("Emergency Leave", "a@x", D(0), es, DEFAULT_DCM);
  eq("7th reclassified as absence", [v.disciplinary, v.reclassifiedFrom, v.action], [true, "Emergency Leave", "Written Warning + 1-day deduction"]);
}
{
  const es = [mk({ date: D(2), violation: "Emergency Leave", disciplinary: false }), mk({ date: D(1), violation: "Emergency Leave", disciplinary: false })];
  const v = verdictFor("Emergency Leave", "a@x", D(0), es, DEFAULT_DCM);
  eq("3 consecutive -> reclassified", [v.disciplinary, v.reclassifiedFrom], [true, "Emergency Leave"]);
}
{
  const es = [mk({ date: D(1), violation: "Emergency Leave", disciplinary: false })];
  const v = verdictFor("Emergency Leave", "a@x", D(0), es, DEFAULT_DCM);
  eq("2 consecutive -> still leave", v.disciplinary, false);
}

console.log("\n── Escalation flags ──");
{
  const es = [
    mk({ date: D(5), violation: "Late login / tardy" }),
    mk({ date: D(10), violation: "Exceeding break time" }),
    mk({ date: D(20), violation: "NCNS" }),
  ];
  const f = computeEscalations(es);
  eq("3-in-30 fires", f.some((x) => x.kind === "3in30"), true);
}
{
  const es = [mk({ date: D(5), violation: "NCNS" }), mk({ date: D(20), violation: "NCNS" })];
  const f = computeEscalations(es);
  eq("repeat NCNS fires", f.some((x) => x.kind === "ncns"), true);
}
{
  const es = [mk({ date: D(5), violation: "Late login / tardy", stage: "dismissed" })];
  eq("dismissed raises no flag", computeEscalations(es).length, 0);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
