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

/* ── v4 additions: identity, compensation, RTA, auth ─────────────────────── */

const { agentMatches, agentKeyOf } = await import(`${LIB}/identity.js`);
const { applyCompensation } = await import(`${LIB}/compensation.js`);
const { parseCsv, parseDur, parseRtaDate, mapHeaders, assessRta, buildEntries, TEMPLATE_CSV } = await import(`${LIB}/rta.js`);
const { can, TABS_FOR, ROLES, DEFAULT_PASSWORD } = await import(`${LIB}/auth.js`);
const bcrypt = (await import("bcryptjs")).default;

console.log("\n── Agent identity (empId OR email) ──");
eq("email matches email", agentMatches({ email: "A@x", empId: "" }, { email: "a@x" }), true);
eq("empId matches empId", agentMatches({ email: "", empId: "eg0412" }, { empId: "EG0412" }), true);
eq("string ref still works", agentMatches({ email: "a@x" }, "a@x"), true);
eq("no shared identifier -> no match", agentMatches({ email: "a@x", empId: "" }, { empId: "EG1" }), false);
eq("both empty -> no match", agentMatches({ email: "", empId: "" }, { email: "", empId: "" }), false);
eq("key prefers empId", agentKeyOf({ email: "a@x", empId: "EG1" }), "eg1");
{
  // The point of the rework: an email-keyed manual case and an ID-keyed RTA
  // case for the same person must chain into one occurrence count.
  const es = [mk({ date: D(10), violation: "NCNS", email: "a@x", empId: "EG0412" })];
  eq("RTA row (empId only) chains with manual history", occurrenceFor(es, { email: "", empId: "EG0412" }, "NCNS", D(0)).occ, 2);
}

console.log("\n── Compensable hours (spec 4D) ──");
{
  const c = applyCompensation({ tardyMin: 25, compMin: 25 });
  eq("fully compensated", [c.net, c.fullyCompensated], [0, true]);
}
{
  const c = applyCompensation({ tardyMin: 30, missingMin: 60, compMin: 45 });
  eq("partial: 90 lost, 45 comp -> 45 net", [c.lost, c.net, c.partiallyCompensated], [90, 45, true]);
}
{
  const c = applyCompensation({ missingMin: 30, compMin: 90 });
  eq("comp never exceeds lost", [c.comp, c.net], [30, 0]);
}
eq("nothing lost -> not 'fully compensated'", applyCompensation({ compMin: 60 }).fullyCompensated, false);

console.log("\n── RTA parsing ──");
eq("parseDur H:MM", [parseDur("0:25"), parseDur("9:00")], [25, 540]);
eq("parseDur decimal hours", [parseDur("1.5"), parseDur("0"), parseDur("")], [90, 0, 0]);
eq("parseRtaDate ISO", parseRtaDate("2026-07-14"), "2026-07-14");
eq("parseRtaDate DD/MM/YYYY", parseRtaDate("14/07/2026"), "2026-07-14");
eq("parseRtaDate MM/DD disambiguated", parseRtaDate("07/14/2026"), "2026-07-14");
eq("parseRtaDate garbage", parseRtaDate("yesterday"), "");
eq("quoted comma survives", parseCsv('a,"b,c",d')[0], ["a", "b,c", "d"]);
eq("escaped quote survives", parseCsv('a,"say ""hi""",c')[0], ["a", 'say "hi"', "c"]);
{
  const map = mapHeaders(["LOB", "Date", "Employee Name", "Employee ID", "Shift Start", "Shift End", "Status", "Executor Name", "Tardy", "Missing Hours", "Early Departure", "Hours can be compenstaed", "Status / Violation"]);
  eq("all 13 RTA headers map", Object.keys(map).length, 13);
  eq("typo'd compensated column maps", map.comp, 11);
  eq("Status vs Status/Violation kept apart", [map.status, map.violation], [6, 12]);
}
{
  const a = assessRta(TEMPLATE_CSV, DEFAULT_DCM);
  eq("template classifies", [a.counts.irregular, a.counts.compensated, a.counts.clean, a.counts.error || 0], [2, 1, 1, 0]);
  const built = buildEntries(a.rows, { account: "Beko", entries: [], dcm: DEFAULT_DCM, uploadedBy: "WFM" });
  eq("template commits 2 to triage + 1 auto-ack", [built.toTriage, built.acked], [2, 1]);
  const ack = built.entries.find((e) => e.stage === "active");
  eq("auto-ack is closed and non-disciplinary", [ack.disciplinary, ack.deductionApplied, ack.opsConfirmed], [false, 0, true]);
}
{
  // Two NCNS for one agent in one file: at upload both verdicts are provisional
  // №1 (pending cases never count), and the chain forms when the PM escalates —
  // decideCases re-verdicts oldest-first, so the second becomes a 2nd occurrence.
  const { decideCases } = await import(`${LIB}/engine.js`);
  const csv = [
    "Date,Employee Name,Employee ID,Status,Tardy,Missing Hours,Early Departure,Hours can be compenstaed",
    `${D(3)},Tarek H,EG0644,NCNS,0,9:00,0,0`,
    `${D(1)},Tarek H,EG0644,NCNS,0,9:00,0,0`,
  ].join("\n");
  const a = assessRta(csv, DEFAULT_DCM);
  const built = buildEntries(a.rows, { account: "Beko", entries: [], dcm: DEFAULT_DCM, uploadedBy: "WFM" });
  eq("upload-time verdicts are provisional №1s", built.entries.map((e) => e.occurrence), [1, 1]);

  const decided = decideCases(built.entries, built.entries.map((e) => e.id), "active", { by: "PM", assignee: "TL", comment: "Verified against RTA." }, DEFAULT_DCM);
  const byDate = [...decided].sort((x, y) => x.date.localeCompare(y.date));
  eq("bulk escalation chains 1st -> 2nd", byDate.map((e) => e.occurrence), [1, 2]);
  eq("escalated actions follow the NCNS progression", byDate.map((e) => e.action), ["Written Warning + 3-day deduction", "Final Warning + 5-day deduction"]);
  eq("second NCNS capped by month headroom (3, then 5 -> 2)", byDate.map((e) => e.deductionApplied), [3, 2]);
  eq("both carry the escalation log entry", decided.every((e) => e.activity.some((x) => x.type === "escalated")), true);
}
{
  // Dismissal must not re-verdict — the provisional verdict is archived as-is.
  const { decideCases } = await import(`${LIB}/engine.js`);
  const es = [mk({ date: D(2), violation: "NCNS", stage: "review", occurrence: 1, action: "Written Warning + 3-day deduction" })];
  const out = decideCases(es, [es[0].id], "dismissed", { by: "PM", assignee: "", comment: "System outage." }, DEFAULT_DCM);
  eq("dismiss keeps stage + verdict untouched", [out[0].stage, out[0].occurrence], ["dismissed", 1]);
}

console.log("\n── RBAC + password hashing ──");
{
  eq("six roles incl. Agent", [ROLES.length, ROLES.includes("Agent")], [6, true]);
  eq("agents have no workspace tabs", TABS_FOR.Agent.length, 0);
  eq("WFM sees only the RTA tab", TABS_FOR.WFM, ["rta"]);
  eq("only agents may acknowledge", [can({ role: "Agent" }, "acknowledge"), can({ role: "SuperAdmin" }, "acknowledge")], [true, false]);
  eq("only SuperAdmin administers", [can({ role: "SuperAdmin" }, "admin"), can({ role: "HRBusinessPartner" }, "admin")], [true, false]);
  eq("HR executes, OPS doesn't", [can({ role: "HRBusinessPartner" }, "hr"), can({ role: "OperationsLead" }, "hr")], [true, false]);
  eq("no user -> no permission", can(null, "triage"), false);

  const hash = bcrypt.hashSync(DEFAULT_PASSWORD, 10);
  eq("bcrypt roundtrip", [bcrypt.compareSync(DEFAULT_PASSWORD, hash), bcrypt.compareSync("nope", hash)], [true, false]);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
