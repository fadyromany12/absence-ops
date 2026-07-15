import { useState, useEffect, useMemo } from "react";

/* ================= PALETTE & TOKENS ================= */
const P = {
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
const SEV_COLOR = {
  Minor: "#5C6F74",
  Moderate: "#C97A1F",
  Serious: "#B3392B",
  "Zero Tolerance": "#191919",
};
const SEV_ORDER = ["Minor", "Moderate", "Serious", "Zero Tolerance"];
const ACCOUNT_COLORS = { Hertz: "#E0B22C", Lenovo: "#C43D33", Beko: "#2C5FA8" };
const accColor = (a) => ACCOUNT_COLORS[a] || P.petrol;
const sevColor = (s) => SEV_COLOR[s] || P.brick;

const FONT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
.ao-disp { font-family: 'Barlow Semi Condensed', ui-sans-serif, system-ui, sans-serif; }
.ao-mono { font-family: 'IBM Plex Mono', ui-monospace, monospace; }
.ao-body { font-family: 'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif; }
.ao-body input, .ao-body select, .ao-body textarea { font-family: 'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif; }
.ao-body :focus-visible { outline: 2px solid #0C5E63; outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { .ao-body * { transition: none !important; } }
`;

/* ================= DEFAULT DATA ================= */
const DEFAULT_ACCOUNTS = ["Hertz", "Lenovo", "Beko"];
const DEFAULT_TLS = [
  "Salma Elhadad",
  "Ibrahim Kamel",
  "Mohamed Rashad",
  "Abdallah Ismail",
  "Ahmed Nagi",
  "Fady Bekhet",
  "Kirolos Nagi",
];

/* DCM per Lenovo Acknowledgement Form HR-EG-DIS-001, v1.0, effective 21 Apr 2026.
   Executor derived: Verbal Warning → TL, everything else → HR. */
const ex = (a) => (!a ? "" : a.startsWith("Verbal") ? "TL" : "HR");
const mk = (id, name, severity, a1, a2, a3) => ({ id, name, severity, a1, e1: ex(a1), a2: a2 || "", e2: ex(a2), a3: a3 || "", e3: ex(a3) });
const VW = "Verbal Warning";
const WW1 = "Written Warning + 1-day deduction";
const WW3 = "Written Warning + 3-day deduction";
const FW3 = "Final Warning + 3-day deduction";
const FW5 = "Final Warning + 5-day deduction";
const TERM = "Termination of Employment";
const INV = "HR + Legal Investigation";
const ZT = "Zero Tolerance — Immediate Termination";

const DEFAULT_DCM = [
  // Minor — progressive discipline
  mk("late", "Late login / tardy", "Minor", VW, WW1, WW3),
  mk("break", "Exceeding break time", "Minor", VW, WW1, WW3),
  mk("offhours", "Login outside scheduled hours", "Minor", VW, WW1, FW3),
  mk("sleep", "Sleeping / resting at workstation", "Minor", VW, WW1, WW3),
  mk("script", "Not following scripts / procedures", "Minor", VW, WW1, FW3),
  mk("casedoc", "Case documentation failure", "Minor", VW, WW1, FW3),
  mk("tailgate", "Tailgating security checkpoint", "Minor", VW, WW1, FW3),
  // Moderate — accelerated discipline
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
  // Serious — fast-track
  mk("assault", "Physical assault / threats", "Serious", INV, TERM, ""),
  mk("refuse", "Refusing HR investigation", "Serious", WW3, FW5, TERM),
  mk("dataaccess", "Data access without business reason", "Serious", INV, TERM, ""),
  mk("csat", "CSAT survey manipulation", "Serious", FW5, TERM, ""),
  mk("card", "Sharing / using colleague's access card", "Serious", INV, TERM, ""),
  mk("fakesick", "Fake sick leave", "Serious", FW5, TERM, ""),
  mk("avoidance", "Deliberate contact avoidance", "Serious", WW3, FW5, TERM),
  // Zero Tolerance — immediate termination
  mk("disclose", "Disclosing customer data", "Zero Tolerance", ZT, "", ""),
  mk("retain", "Retaining customer data for personal use", "Zero Tolerance", ZT, "", ""),
  mk("creds", "Sharing system credentials", "Zero Tolerance", ZT, "", ""),
  mk("fraud", "Fraud / falsifying records", "Zero Tolerance", ZT, "", ""),
  mk("theft", "Theft", "Zero Tolerance", ZT, "", ""),
  mk("substances", "Bringing prohibited substances", "Zero Tolerance", ZT, "", ""),
  mk("influence", "Under the influence at work", "Zero Tolerance", ZT, "", ""),
  mk("bribe", "Bribery / personal benefit", "Zero Tolerance", ZT, "", ""),
];

const LEAVE_TYPES = ["Sick Leave", "Emergency Leave", "Annual Leave", "Work From Home", "Exam Leave", "Other"];
const EMERGENCY_QUOTA = 6;
const RESET_DAYS = 90; // warning reset period per the acknowledgement doc
const DATA_VERSION = 2;

const DEFAULTS = {
  version: DATA_VERSION,
  accounts: DEFAULT_ACCOUNTS,
  tls: DEFAULT_TLS,
  dcm: DEFAULT_DCM,
  entries: [],
};

const STORAGE_KEY = "absence-ops:v1";

/* ================= HELPERS ================= */
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtMin = (m) => {
  const t = Math.round(m || 0);
  const h = Math.floor(t / 60), mm = t % 60;
  if (h === 0) return `${mm}m`;
  return `${h}h ${String(mm).padStart(2, "0")}m`;
};
const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
};
const fmtStamp = (t) => new Date(t).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const daysAgo = (dateStr) => (Date.now() - new Date(dateStr + "T00:00:00").getTime()) / 86400000;
const csvCell = (v) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function statusOf(e) {
  if (e.stage === "review") return "Pending review";
  if (e.stage === "dismissed") return "Dismissed";
  if (e.notified && e.opsConfirmed && (!e.hrNeeded || e.hrConfirmed)) return "Closed";
  if (e.notified && e.opsConfirmed && e.hrNeeded && !e.hrConfirmed) return "Awaiting HR";
  if (e.notified && !e.opsConfirmed) return "Awaiting OPS";
  return "Open";
}
const STATUS_COLOR = {
  "Pending review": P.petrol,
  Dismissed: "#8A9598",
  Open: P.sub,
  "Awaiting OPS": P.amber,
  "Awaiting HR": P.brick,
  Closed: P.green,
};

/* The engine: what does the matrix prescribe for this agent + violation?
   Occurrences count only violations inside the 90-day reset window,
   and dismissed cases never count. */
function verdictFor(violation, email, date, entries, dcm) {
  if (!violation) return null;
  const rule = dcm.find((r) => r.name === violation);
  const em = (email || "").trim().toLowerCase();
  const d = date || todayStr();
  if (rule) {
    const cutoff = new Date(d + "T00:00:00").getTime() - RESET_DAYS * 86400000;
    const prior = entries.filter(
      (e) =>
        e.violation === violation &&
        (e.email || "").toLowerCase() === em &&
        e.stage !== "dismissed" &&
        new Date((e.date || "1970-01-01") + "T00:00:00").getTime() >= cutoff &&
        (e.date || "") <= d
    ).length;
    const occ = prior + 1;
    let step = Math.min(occ, 3);
    while (step > 1 && !rule["a" + step]) step--;
    const action = rule["a" + step];
    const executor = rule["e" + step] || "HR";
    const notes = [];
    if (prior > 0) notes.push(`Counting the ${RESET_DAYS}-day reset window — earlier warnings expire; dismissed cases excluded.`);
    if (occ > 1 && !rule["a" + Math.min(occ, 3)]) notes.push("Matrix defines no further step — outcome follows the HR / Legal investigation.");
    if (occ > 3 && rule.a3) notes.push("Beyond 3rd occurrence — matrix exhausted, escalate directly to HR / Practice.");
    if (rule.severity === "Zero Tolerance") notes.push("Immediate suspension pending investigation may apply; termination only after the mandatory investigation.");
    if (rule.severity === "Serious" || rule.severity === "Zero Tolerance") notes.push("Employee must be notified in writing, given 3–5 working days to respond, and may have a colleague present.");
    if (/5-day/.test(action)) notes.push("Labor-law cap: max 5 days' deduction per incident and per calendar month.");
    return { disciplinary: true, occ, action, executor, severity: rule.severity, notes };
  }
  const notes = [];
  let action = "No disciplinary action — approved leave";
  let severity = null;
  if (violation === "Sick Leave") notes.push("Medical certificate required for 2+ consecutive days.");
  if (violation === "Emergency Leave") {
    const yr = d.slice(0, 4);
    const used = entries.filter((e) => e.violation === "Emergency Leave" && (e.email || "").toLowerCase() === em && e.stage !== "dismissed" && (e.date || "").slice(0, 4) === yr).length;
    notes.push(`Emergency quota used this year: ${used + 1} of ${EMERGENCY_QUOTA} (max 2 consecutive per month).`);
    if (used + 1 > EMERGENCY_QUOTA) {
      action = "Quota exceeded — count as Unauthorised absence";
      severity = "Moderate";
      notes.push("Per policy: after consuming the quota, unplanned emergency counts as absent.");
    }
  }
  if (violation === "Annual Leave") notes.push("Must be requested and approved one month in advance.");
  if (violation === "Work From Home") notes.push("Requires prior manager approval.");
  if (violation === "Other") notes.push("Describe the case and the action taken in the notes.");
  return { disciplinary: false, occ: null, action, executor: "TL", severity, notes };
}

/* Escalation thresholds from the process document */
function computeEscalations(entries) {
  const live = entries.filter((e) => e.stage !== "dismissed");
  const byAgent = {};
  live.forEach((e) => {
    const em = (e.email || "").toLowerCase();
    if (!em) return;
    if (!byAgent[em]) byAgent[em] = { email: e.email, account: e.account, abs30: 0, abs60: 0, ncns: 0, emergency: {} };
    const a = byAgent[em];
    a.account = e.account;
    const age = daysAgo(e.date);
    if (e.violation === "Unauthorised absence" || e.violation === "NCNS") {
      if (age <= 30) a.abs30++;
      if (age <= 60) a.abs60++;
    }
    if (e.violation === "NCNS") a.ncns++;
    if (e.violation === "Emergency Leave") {
      const yr = (e.date || "").slice(0, 4);
      a.emergency[yr] = (a.emergency[yr] || 0) + 1;
    }
  });
  const out = [];
  const thisYr = todayStr().slice(0, 4);
  Object.values(byAgent).forEach((a) => {
    if (a.ncns >= 2) out.push({ level: "Serious", email: a.email, account: a.account, text: `Repeat NCNS (${a.ncns}×) — HR escalation + performance plan` });
    else if (a.abs60 >= 5) out.push({ level: "Serious", email: a.email, account: a.account, text: `${a.abs60} absences in 60 days — formal warning + HR escalation` });
    else if (a.abs30 >= 3) out.push({ level: "Moderate", email: a.email, account: a.account, text: `${a.abs30} absences in 30 days — call with employee required` });
    if ((a.emergency[thisYr] || 0) > EMERGENCY_QUOTA)
      out.push({ level: "Moderate", email: a.email, account: a.account, text: `Emergency quota exceeded (${a.emergency[thisYr]}/${EMERGENCY_QUOTA}) — count further as absent` });
  });
  return out.sort((x, y) => (x.level === "Serious" ? -1 : 1) - (y.level === "Serious" ? -1 : 1));
}

/* Migrate v1 data: old violation names, no stage / assignee / activity, old DCM */
const NAME_MAP = {
  "Late Arrival": "Late login / tardy",
  "Late Arrival + Early Departure": "Late login / tardy",
  Absent: "Unauthorised absence",
  "Early Departure": "Leaving floor / early departure",
};
function normalize(d) {
  const base = { ...DEFAULTS, ...d };
  if (base.version !== DATA_VERSION) {
    base.dcm = DEFAULT_DCM;
    base.entries = (base.entries || []).map((e) => ({
      ...e,
      violation: NAME_MAP[e.violation] || e.violation,
      severity: e.severity === "Major" ? "Moderate" : e.severity,
      stage: e.stage || "active",
      assignee: e.assignee ?? (e.tl || ""),
      activity: e.activity || [],
    }));
    base.version = DATA_VERSION;
  }
  return base;
}

/* ================= SAMPLE DATA ================= */
function buildSamples(tls, dcm) {
  const d = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
  const raw = [
    { acc: "Lenovo", n: 9, email: "nour.said@demo.konecta", id: "EG0412", v: "Late login / tardy", min: 25, s: "10:00", e: "19:00", stage: "active", done: true },
    { acc: "Lenovo", n: 8, email: "karim.adel@demo.konecta", id: "EG0388", v: "Unauthorised absence", min: 540, s: "10:00", e: "19:00", stage: "active", done: true },
    { acc: "Hertz", n: 7, email: "mona.farid@demo.konecta", id: "EG0521", v: "Sick Leave", min: 480, s: "09:00", e: "17:00", sick: true, stage: "active", done: true },
    { acc: "Beko", n: 6, email: "tarek.hassan@demo.konecta", id: "EG0644", v: "NCNS", min: 540, s: "12:00", e: "21:00", stage: "active" },
    { acc: "Lenovo", n: 5, email: "nour.said@demo.konecta", id: "EG0412", v: "Late login / tardy", min: 40, s: "10:00", e: "19:00", stage: "dismissed", why: "System outage at login — confirmed with RTA, not agent fault." },
    { acc: "Hertz", n: 4, email: "dina.samy@demo.konecta", id: "EG0533", v: "Emergency Leave", min: 480, s: "09:00", e: "17:00", stage: "active" },
    { acc: "Beko", n: 3, email: "omar.lotfy@demo.konecta", id: "EG0602", v: "Leaving floor / early departure", min: 95, s: "12:00", e: "21:00", stage: "active" },
    { acc: "Lenovo", n: 2, email: "karim.adel@demo.konecta", id: "EG0388", v: "Unauthorised absence", min: 540, s: "10:00", e: "19:00", stage: "review" },
    { acc: "Lenovo", n: 1, email: "sara.adly@demo.konecta", id: "EG0455", v: "CSAT survey manipulation", min: 0, s: "10:00", e: "19:00", stage: "review" },
    { acc: "Hertz", n: 1, email: "aya.magdy@demo.konecta", id: "EG0517", v: "Annual Leave", min: 0, s: "09:00", e: "17:00", stage: "active", done: true },
  ];
  const entries = [];
  raw.forEach((r, i) => {
    const v = verdictFor(r.v, r.email, d(r.n), entries, dcm);
    const tl = tls[i % tls.length];
    const activity = [];
    if (r.stage === "active") activity.push({ at: Date.now() - r.n * 86400000 + 3600e3, by: tl, type: "escalated", text: "Verified against RTA data — proceeding per matrix." });
    if (r.stage === "dismissed") activity.push({ at: Date.now() - r.n * 86400000 + 3600e3, by: tl, type: "dismissed", text: r.why });
    entries.push({
      id: uid(), account: r.acc, date: d(r.n), email: r.email, empId: r.id, tl,
      shiftStart: r.s, shiftEnd: r.e, violation: r.v, sickNote: !!r.sick, missingMin: r.min,
      occurrence: v.occ, action: v.action, executor: v.executor, severity: v.severity, disciplinary: v.disciplinary,
      notes: "Sample entry", stage: r.stage, assignee: r.stage === "review" ? "" : tl, activity,
      notified: !!r.done || r.n >= 3, opsConfirmed: !!r.done,
      hrNeeded: v.disciplinary && v.executor === "HR", hrConfirmed: !!r.done && r.n >= 7,
      actionDate: r.done && r.n >= 7 ? d(r.n - 1) : "",
      createdAt: Date.now() - r.n * 86400000,
    });
  });
  return entries.reverse();
}

/* ================= SMALL UI PIECES ================= */
const Label = ({ children }) => (
  <div className="ao-disp uppercase tracking-wider font-semibold" style={{ fontSize: 11, color: P.sub }}>{children}</div>
);
const Field = ({ label, children, span }) => (
  <div className={span ? "md:col-span-2" : ""}>
    <Label>{label}</Label>
    <div className="mt-1">{children}</div>
  </div>
);
const inputStyle = { border: `1px solid ${P.line}`, background: "#FBFCFB", color: P.ink, borderRadius: 6, padding: "8px 10px", fontSize: 14, width: "100%" };
const TInput = (props) => <input {...props} style={{ ...inputStyle, ...(props.style || {}) }} />;
const TSelect = (props) => <select {...props} style={{ ...inputStyle, ...(props.style || {}) }} />;
const TArea = (props) => <textarea {...props} style={{ ...inputStyle, minHeight: 64, resize: "vertical", ...(props.style || {}) }} />;

const Pill = ({ color, children, filled }) => (
  <span
    className="ao-disp uppercase tracking-wide font-semibold inline-flex items-center"
    style={{
      fontSize: 11, padding: "2px 8px", borderRadius: 999,
      color: filled ? "#fff" : color,
      background: filled ? color : "transparent",
      border: `1px solid ${color}`,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </span>
);

const Toggle = ({ on, label, onClick, disabledLook }) => (
  <button
    onClick={onClick}
    className="ao-disp uppercase tracking-wide font-semibold transition"
    style={{
      fontSize: 11, padding: "4px 10px", borderRadius: 6, cursor: "pointer",
      color: on ? "#fff" : disabledLook ? "#9AA8AB" : P.sub,
      background: on ? P.green : "transparent",
      border: `1px ${disabledLook && !on ? "dashed" : "solid"} ${on ? P.green : P.line}`,
    }}
  >
    {on ? "✓ " : ""}{label}
  </button>
);

const BtnPrimary = ({ children, onClick, disabled, bg }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="ao-disp uppercase tracking-wider font-semibold transition"
    style={{
      fontSize: 13, padding: "10px 18px", borderRadius: 6, color: "#fff",
      background: disabled ? "#9AB5B4" : bg || P.petrol,
      border: "none", cursor: disabled ? "default" : "pointer",
    }}
  >
    {children}
  </button>
);
const BtnGhost = ({ children, onClick, color, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="ao-disp uppercase tracking-wider font-semibold transition"
    style={{ fontSize: 13, padding: "10px 16px", borderRadius: 6, color: disabled ? "#9AA8AB" : color || P.inkSoft, background: "transparent", border: `1px solid ${P.line}`, cursor: disabled ? "default" : "pointer" }}
  >
    {children}
  </button>
);

/* ================= VERDICT PANEL (signature element) ================= */
function VerdictPanel({ verdict }) {
  if (!verdict) return null;
  const sev = verdict.severity ? sevColor(verdict.severity) : P.green;
  return (
    <div className="flex" style={{ background: P.ink, borderRadius: 8, overflow: "hidden" }}>
      <div style={{ width: 6, background: sev, flexShrink: 0 }} />
      <div className="p-4 flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          {verdict.disciplinary ? (
            <span className="ao-mono font-semibold" style={{ fontSize: 12, color: "#8FB6B3", letterSpacing: 1 }}>OCCURRENCE Nº {verdict.occ}</span>
          ) : (
            <span className="ao-mono font-semibold" style={{ fontSize: 12, color: "#8FB6B3", letterSpacing: 1 }}>EXCUSED / LEAVE</span>
          )}
          {verdict.severity && <Pill color={sev} filled>{verdict.severity}</Pill>}
          <Pill color="#8FB6B3">Executor · {verdict.executor}</Pill>
        </div>
        <div className="ao-disp font-semibold mt-2" style={{ fontSize: 20, color: "#F2F6F5", lineHeight: 1.2 }}>
          {verdict.action}
        </div>
        {verdict.notes.map((n, i) => (
          <div key={i} className="mt-1" style={{ fontSize: 12.5, color: "#B9C9C7" }}>• {n}</div>
        ))}
      </div>
    </div>
  );
}

/* ================= LOG FORM ================= */
function LogForm({ data, onAdd, onCancel, defaultAccount }) {
  const [f, setF] = useState({
    account: defaultAccount && defaultAccount !== "All" ? defaultAccount : data.accounts[0] || "",
    date: todayStr(),
    email: "",
    empId: "",
    tl: data.tls[0] || "",
    shiftStart: "10:00",
    shiftEnd: "19:00",
    violation: "",
    sickNote: false,
    missH: 0,
    missM: 0,
    notes: "",
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const verdict = useMemo(
    () => verdictFor(f.violation, f.email, f.date, data.entries, data.dcm),
    [f.violation, f.email, f.date, data.entries, data.dcm]
  );
  const valid = f.account && f.date && f.email.trim() && f.violation;
  const groups = SEV_ORDER.map((s) => ({ s, rules: data.dcm.filter((r) => r.severity === s) })).filter((g) => g.rules.length);

  const submit = () => {
    if (!valid) return;
    const v = verdictFor(f.violation, f.email, f.date, data.entries, data.dcm);
    onAdd({
      id: uid(),
      account: f.account,
      date: f.date,
      email: f.email.trim(),
      empId: f.empId.trim(),
      tl: f.tl,
      shiftStart: f.shiftStart,
      shiftEnd: f.shiftEnd,
      violation: f.violation,
      sickNote: f.sickNote,
      missingMin: (Number(f.missH) || 0) * 60 + (Number(f.missM) || 0),
      occurrence: v.occ,
      action: v.action,
      executor: v.executor,
      severity: v.severity,
      disciplinary: v.disciplinary,
      notes: f.notes.trim(),
      stage: "review",
      assignee: "",
      activity: [],
      notified: false,
      opsConfirmed: false,
      hrNeeded: v.executor === "HR",
      hrConfirmed: false,
      actionDate: "",
      createdAt: Date.now(),
    });
    setF((p) => ({ ...p, email: "", empId: "", violation: "", sickNote: false, missH: 0, missM: 0, notes: "" }));
  };

  return (
    <div className="p-4 md:p-5" style={{ background: P.card, border: `1px solid ${P.line}`, borderRadius: 10 }}>
      <div className="ao-disp font-bold uppercase tracking-wide" style={{ fontSize: 16, color: P.ink }}>Log absence / violation</div>
      <div className="mt-1" style={{ fontSize: 12.5, color: P.sub }}>New cases start as <b>Pending review</b> — a TL or direct manager must escalate or dismiss them with a comment.</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
        <Field label="Account">
          <TSelect value={f.account} onChange={(e) => set("account", e.target.value)}>
            {data.accounts.map((a) => <option key={a}>{a}</option>)}
          </TSelect>
        </Field>
        <Field label="Date">
          <TInput type="date" value={f.date} onChange={(e) => set("date", e.target.value)} />
        </Field>
        <Field label="Logged by (TL)">
          <TSelect value={f.tl} onChange={(e) => set("tl", e.target.value)}>
            {data.tls.map((t) => <option key={t}>{t}</option>)}
          </TSelect>
        </Field>
        <Field label="Agent email">
          <TInput type="text" placeholder="name@konecta.com" value={f.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="Employee ID">
          <TInput type="text" placeholder="EG0000" value={f.empId} onChange={(e) => set("empId", e.target.value)} />
        </Field>
        <Field label="Violation / type">
          <TSelect value={f.violation} onChange={(e) => set("violation", e.target.value)}>
            <option value="">Select…</option>
            {groups.map((g) => (
              <optgroup key={g.s} label={`${g.s} (DCM)`}>
                {g.rules.map((r) => <option key={r.id}>{r.name}</option>)}
              </optgroup>
            ))}
            <optgroup label="Leave / excused">
              {LEAVE_TYPES.map((t) => <option key={t}>{t}</option>)}
            </optgroup>
          </TSelect>
        </Field>
        <Field label="Shift start">
          <TInput type="time" value={f.shiftStart} onChange={(e) => set("shiftStart", e.target.value)} />
        </Field>
        <Field label="Shift end">
          <TInput type="time" value={f.shiftEnd} onChange={(e) => set("shiftEnd", e.target.value)} />
        </Field>
        <Field label="Missing time">
          <div className="flex gap-2 items-center">
            <TInput type="number" min="0" value={f.missH} onChange={(e) => set("missH", e.target.value)} style={{ width: 70 }} />
            <span style={{ color: P.sub, fontSize: 13 }}>h</span>
            <TInput type="number" min="0" max="59" value={f.missM} onChange={(e) => set("missM", e.target.value)} style={{ width: 70 }} />
            <span style={{ color: P.sub, fontSize: 13 }}>m</span>
          </div>
        </Field>
        {f.violation === "Sick Leave" && (
          <Field label="Sick note provided?">
            <Toggle on={f.sickNote} label={f.sickNote ? "Certificate on file" : "No certificate"} onClick={() => set("sickNote", !f.sickNote)} />
          </Field>
        )}
        <Field label="Notes" span>
          <TInput type="text" placeholder="Context, HR case ref, warning letter no.…" value={f.notes} onChange={(e) => set("notes", e.target.value)} />
        </Field>
      </div>

      {verdict && <div className="mt-4"><VerdictPanel verdict={verdict} /></div>}

      <div className="flex gap-3 mt-4 justify-end">
        <BtnGhost onClick={onCancel}>Close</BtnGhost>
        <BtnPrimary onClick={submit} disabled={!valid}>Log entry</BtnPrimary>
      </div>
    </div>
  );
}

/* ================= REVIEW BOX (triage gate) ================= */
function ReviewBox({ e, tls, onDecide }) {
  const [by, setBy] = useState(e.tl || tls[0] || "");
  const [assignee, setAssignee] = useState(e.tl || "");
  const [comment, setComment] = useState("");
  const ok = comment.trim().length > 0;
  return (
    <div className="mt-3 p-3" style={{ background: "#F3F7F6", border: `1px dashed ${P.petrol}66`, borderRadius: 8 }}>
      <div className="ao-disp uppercase tracking-wide font-semibold" style={{ fontSize: 12, color: P.petrol }}>Manager review required</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
        <Field label="Reviewed by (TL / direct manager)">
          <TSelect value={by} onChange={(ev) => setBy(ev.target.value)}>
            {tls.map((t) => <option key={t}>{t}</option>)}
          </TSelect>
        </Field>
        <Field label="Assign to">
          <TSelect value={assignee} onChange={(ev) => setAssignee(ev.target.value)}>
            <option value="">Unassigned</option>
            {tls.map((t) => <option key={t}>{t}</option>)}
          </TSelect>
        </Field>
      </div>
      <div className="mt-3">
        <Label>Review comment (required)</Label>
        <div className="mt-1">
          <TArea placeholder="Why this case is escalated or dismissed…" value={comment} onChange={(ev) => setComment(ev.target.value)} />
        </div>
      </div>
      <div className="flex gap-2 justify-end mt-3 flex-wrap">
        <BtnGhost disabled={!ok} color={P.sub} onClick={() => ok && onDecide("dismissed", by, assignee, comment.trim())}>Dismiss</BtnGhost>
        <BtnPrimary disabled={!ok} onClick={() => ok && onDecide("active", by, assignee, comment.trim())}>Escalate</BtnPrimary>
      </div>
    </div>
  );
}

/* ================= ENTRY CARD ================= */
function EntryCard({ e, tls, onPatch, onDelete }) {
  const [showHistory, setShowHistory] = useState(false);
  const [newComment, setNewComment] = useState("");
  const st = statusOf(e);
  const sev = e.severity ? sevColor(e.severity) : P.green;
  const dimmed = e.stage === "dismissed";

  const toggle = (k) => {
    const next = { ...e, [k]: !e[k] };
    if (statusOf(next) === "Closed" && !next.actionDate) next.actionDate = todayStr();
    onPatch(next);
  };
  const decide = (stage, by, assignee, text) => {
    onPatch({
      ...e,
      stage,
      assignee: stage === "active" ? assignee : e.assignee,
      activity: [...(e.activity || []), { at: Date.now(), by, type: stage === "active" ? "escalated" : "dismissed", text }],
    });
  };
  const addComment = () => {
    const t = newComment.trim();
    if (!t) return;
    onPatch({ ...e, activity: [...(e.activity || []), { at: Date.now(), by: "", type: "comment", text: t }] });
    setNewComment("");
  };

  return (
    <div className="flex" style={{ background: P.card, border: `1px solid ${P.line}`, borderRadius: 8, overflow: "hidden", opacity: dimmed ? 0.7 : 1 }}>
      <div style={{ width: 5, background: dimmed ? "#B9C4C2" : sev, flexShrink: 0 }} />
      <div className="p-3 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="ao-mono font-medium truncate" style={{ fontSize: 13, color: P.ink, maxWidth: "60%" }}>{e.email}</span>
          {e.empId && <span className="ao-mono" style={{ fontSize: 11, color: P.sub }}>{e.empId}</span>}
          <span className="flex-1" />
          <Pill color={STATUS_COLOR[st]} filled={st !== "Closed" && st !== "Dismissed"}>{st}</Pill>
        </div>
        <div className="flex items-center gap-2 flex-wrap mt-2">
          <Pill color={sev} filled>{e.violation}{e.occurrence ? ` · №${e.occurrence}` : ""}</Pill>
          <span className="inline-flex items-center gap-1" style={{ fontSize: 12, color: P.sub }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: accColor(e.account), display: "inline-block" }} />
            {e.account}
          </span>
          <span style={{ fontSize: 12, color: P.sub }}>{fmtDate(e.date)}</span>
          <span className="ao-mono" style={{ fontSize: 12, color: P.sub }}>{e.shiftStart}–{e.shiftEnd}</span>
          {e.missingMin > 0 && <span className="ao-mono" style={{ fontSize: 12, color: P.brick }}>−{fmtMin(e.missingMin)}</span>}
        </div>
        <div className="mt-2" style={{ fontSize: 13, color: P.inkSoft }}>
          <span className="font-semibold">{e.action}</span>
          <span style={{ color: P.sub }}> · {e.executor === "HR" ? "HR executes" : "TL executes"} · logged by {e.tl}</span>
          {e.sickNote && <span style={{ color: P.green }}> · certificate ✓</span>}
          {e.actionDate && <span style={{ color: P.sub }}> · actioned {fmtDate(e.actionDate)}</span>}
        </div>
        {e.notes && <div className="mt-1 truncate" style={{ fontSize: 12, color: P.sub }}>“{e.notes}”</div>}

        {e.stage === "review" && <ReviewBox e={e} tls={tls} onDecide={decide} />}

        {e.stage === "dismissed" && (e.activity || []).filter((a) => a.type === "dismissed").slice(-1).map((a, i) => (
          <div key={i} className="mt-2 p-2" style={{ background: P.mist, borderRadius: 6, fontSize: 12.5, color: P.inkSoft }}>
            Dismissed by <b>{a.by}</b>: {a.text}
          </div>
        ))}

        {e.stage === "active" && (
          <div className="flex items-center gap-2 flex-wrap mt-3">
            <Toggle on={e.notified} label="Agent notified" onClick={() => toggle("notified")} />
            <Toggle on={e.opsConfirmed} label="OPS confirm" onClick={() => toggle("opsConfirmed")} />
            {e.hrNeeded ? (
              <Toggle on={e.hrConfirmed} label="HR confirm" onClick={() => toggle("hrConfirmed")} />
            ) : (
              <Toggle on={false} label="HR n/a" disabledLook onClick={() => onPatch({ ...e, hrNeeded: true })} />
            )}
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap mt-3" style={{ borderTop: `1px solid ${P.mist}`, paddingTop: 8 }}>
          {e.stage !== "review" && (
            <span className="inline-flex items-center gap-1" style={{ fontSize: 12, color: P.sub }}>
              Assignee
              <select
                value={e.assignee || ""}
                onChange={(ev) => onPatch({ ...e, assignee: ev.target.value })}
                style={{ fontSize: 12, color: P.ink, border: `1px solid ${P.line}`, borderRadius: 6, padding: "2px 6px", background: "#FBFCFB" }}
              >
                <option value="">Unassigned</option>
                {tls.map((t) => <option key={t}>{t}</option>)}
              </select>
            </span>
          )}
          <button onClick={() => setShowHistory((s) => !s)} style={{ fontSize: 12, color: P.petrol, background: "none", border: "none", cursor: "pointer" }}>
            History ({(e.activity || []).length}) {showHistory ? "▴" : "▾"}
          </button>
          <span className="flex-1" />
          <button
            onClick={() => { if (window.confirm("Delete this entry?")) onDelete(e.id); }}
            style={{ fontSize: 12, color: P.sub, background: "none", border: "none", cursor: "pointer" }}
          >
            Delete
          </button>
        </div>

        {showHistory && (
          <div className="mt-2 grid gap-1">
            {(e.activity || []).length === 0 && <div style={{ fontSize: 12, color: P.sub }}>No activity yet.</div>}
            {(e.activity || []).map((a, i) => (
              <div key={i} style={{ fontSize: 12.5, color: P.inkSoft }}>
                <span className="ao-mono" style={{ color: P.sub, fontSize: 11 }}>{fmtStamp(a.at)}</span>
                {" · "}
                <b style={{ color: a.type === "dismissed" ? P.sub : a.type === "escalated" ? P.petrol : P.ink }}>
                  {a.type === "comment" ? "Comment" : a.type === "escalated" ? "Escalated" : "Dismissed"}
                </b>
                {a.by ? ` by ${a.by}` : ""} — {a.text}
              </div>
            ))}
            <div className="flex gap-2 mt-1">
              <TInput placeholder="Add a comment…" value={newComment} onChange={(ev) => setNewComment(ev.target.value)} onKeyDown={(ev) => ev.key === "Enter" && addComment()} style={{ fontSize: 13, padding: "6px 8px" }} />
              <BtnGhost onClick={addComment}>Add</BtnGhost>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= DASHBOARD ================= */
function Dashboard({ entries, accounts, escalations }) {
  const live = entries.filter((e) => e.stage !== "dismissed");
  const perAccount = accounts.map((a) => {
    const rows = live.filter((e) => e.account === a);
    return { a, count: rows.length, min: rows.reduce((s, e) => s + (e.missingMin || 0), 0) };
  });
  const byViolation = useMemo(() => {
    const m = {};
    live.forEach((e) => {
      if (!m[e.violation]) m[e.violation] = { count: 0, sev: e.severity };
      m[e.violation].count++;
    });
    return Object.entries(m).map(([name, v]) => ({ name, ...v })).sort((x, y) => y.count - x.count);
  }, [entries]);
  const maxV = Math.max(1, ...byViolation.map((v) => v.count));
  const offenders = useMemo(() => {
    const m = {};
    live.forEach((e) => {
      if (!e.disciplinary) return;
      const em = (e.email || "").toLowerCase();
      if (!m[em]) m[em] = { email: e.email, account: e.account, count: 0 };
      m[em].count++;
    });
    return Object.values(m).sort((x, y) => y.count - x.count).slice(0, 5);
  }, [entries]);

  const Card = ({ title, children }) => (
    <div className="p-4" style={{ background: P.card, border: `1px solid ${P.line}`, borderRadius: 10 }}>
      <div className="ao-disp font-bold uppercase tracking-wide" style={{ fontSize: 13, color: P.sub }}>{title}</div>
      <div className="mt-3">{children}</div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card title="Accounts">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {perAccount.map((p) => (
            <div key={p.a} className="p-3" style={{ background: P.mist, borderRadius: 8, borderTop: `3px solid ${accColor(p.a)}` }}>
              <div className="ao-disp font-bold uppercase tracking-wide" style={{ fontSize: 13, color: P.ink }}>{p.a}</div>
              <div className="ao-mono font-semibold mt-1" style={{ fontSize: 22, color: P.ink }}>{p.count}</div>
              <div style={{ fontSize: 11, color: P.sub }}>records</div>
              <div className="ao-mono mt-1" style={{ fontSize: 13, color: P.brick }}>{fmtMin(p.min)}</div>
              <div style={{ fontSize: 11, color: P.sub }}>hours lost</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Escalation flags">
        {escalations.length === 0 && <div style={{ fontSize: 13, color: P.sub }}>No thresholds breached. 3 absences / 30 days triggers a call; 5 / 60 days triggers a formal warning.</div>}
        <div className="grid gap-2">
          {escalations.map((x, i) => (
            <div key={i} className="flex items-start gap-2 p-2" style={{ background: "#FBF6F0", border: `1px solid ${sevColor(x.level)}33`, borderLeft: `4px solid ${sevColor(x.level)}`, borderRadius: 6 }}>
              <div className="min-w-0">
                <div className="ao-mono truncate" style={{ fontSize: 12.5, color: P.ink }}>{x.email} <span style={{ color: P.sub }}>· {x.account}</span></div>
                <div style={{ fontSize: 12.5, color: P.inkSoft }}>{x.text}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Breakdown by type">
        {byViolation.length === 0 && <div style={{ fontSize: 13, color: P.sub }}>Nothing logged yet.</div>}
        <div className="grid gap-2">
          {byViolation.map((v) => (
            <div key={v.name} className="flex items-center gap-2">
              <div className="truncate" style={{ width: 150, fontSize: 12.5, color: P.inkSoft, flexShrink: 0 }}>{v.name}</div>
              <div className="flex-1" style={{ background: P.mist, borderRadius: 4, height: 14 }}>
                <div style={{ width: `${(v.count / maxV) * 100}%`, height: "100%", borderRadius: 4, background: v.sev ? sevColor(v.sev) : P.petrol }} />
              </div>
              <div className="ao-mono" style={{ fontSize: 12.5, color: P.ink, width: 28, textAlign: "right" }}>{v.count}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Repeat cases — top agents">
        {offenders.length === 0 && <div style={{ fontSize: 13, color: P.sub }}>No disciplinary entries.</div>}
        <div className="grid gap-2">
          {offenders.map((o) => (
            <div key={o.email} className="flex items-center gap-2">
              <span style={{ width: 8, height: 8, borderRadius: 999, background: accColor(o.account), flexShrink: 0 }} />
              <span className="ao-mono truncate flex-1" style={{ fontSize: 12.5, color: P.ink }}>{o.email}</span>
              <Pill color={o.count >= 3 ? P.brick : P.amber} filled>{o.count} case{o.count > 1 ? "s" : ""}</Pill>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ================= DCM EDITOR ================= */
function DcmEditor({ dcm, onChange }) {
  const patch = (id, k, v) => onChange(dcm.map((r) => (r.id === id ? { ...r, [k]: v } : r)));
  const remove = (id) => { if (window.confirm("Remove this rule?")) onChange(dcm.filter((r) => r.id !== id)); };
  const add = () =>
    onChange([...dcm, { id: uid(), name: "New violation", severity: "Minor", a1: "Verbal Warning", e1: "TL", a2: "Written Warning + 1-day deduction", e2: "HR", a3: "Final Warning + 3-day deduction", e3: "HR" }]);
  const OccRow = ({ r, n }) => (
    <div className="flex gap-2 items-center">
      <span className="ao-mono" style={{ fontSize: 11, color: P.sub, width: 28, flexShrink: 0 }}>{n}{n === 1 ? "st" : n === 2 ? "nd" : "rd"}</span>
      <TInput value={r["a" + n]} placeholder="—" onChange={(e) => patch(r.id, "a" + n, e.target.value)} style={{ fontSize: 13, padding: "6px 8px" }} />
      <TSelect value={r["e" + n]} onChange={(e) => patch(r.id, "e" + n, e.target.value)} style={{ width: 76, fontSize: 13, padding: "6px 8px", flexShrink: 0 }}>
        <option value=""></option><option>TL</option><option>HR</option>
      </TSelect>
    </div>
  );
  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div style={{ fontSize: 13, color: P.sub, maxWidth: 620 }}>
          Lenovo Disciplinary Consequences Matrix v1.0 (HR-EG-DIS-001, effective 21 Apr 2026). Occurrences are counted per agent per violation within the {RESET_DAYS}-day reset window; the matching action and executor are applied when a case is logged.
        </div>
        <BtnGhost onClick={add}>+ Add rule</BtnGhost>
      </div>
      {SEV_ORDER.map((s) => {
        const rules = dcm.filter((r) => r.severity === s);
        if (!rules.length) return null;
        return (
          <div key={s} className="mt-5">
            <div className="flex items-center gap-2">
              <span style={{ width: 10, height: 10, borderRadius: 2, background: sevColor(s), display: "inline-block" }} />
              <span className="ao-disp font-bold uppercase tracking-wide" style={{ fontSize: 14, color: P.ink }}>{s}</span>
              <span className="ao-mono" style={{ fontSize: 11, color: P.sub }}>({rules.length})</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-3">
              {rules.map((r) => (
                <div key={r.id} className="flex" style={{ background: P.card, border: `1px solid ${P.line}`, borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ width: 5, background: sevColor(r.severity), flexShrink: 0 }} />
                  <div className="p-4 flex-1 min-w-0 grid gap-2">
                    <div className="flex gap-2">
                      <TInput value={r.name} onChange={(e) => patch(r.id, "name", e.target.value)} style={{ fontWeight: 600 }} />
                      <TSelect value={r.severity} onChange={(e) => patch(r.id, "severity", e.target.value)} style={{ width: 130, flexShrink: 0 }}>
                        {SEV_ORDER.map((x) => <option key={x}>{x}</option>)}
                      </TSelect>
                    </div>
                    <OccRow r={r} n={1} />
                    <OccRow r={r} n={2} />
                    <OccRow r={r} n={3} />
                    <div className="flex justify-end">
                      <button onClick={() => remove(r.id)} style={{ fontSize: 12, color: P.sub, background: "none", border: "none", cursor: "pointer" }}>Remove</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ================= SETTINGS ================= */
function ListEditor({ title, items, onChange, placeholder }) {
  const [val, setVal] = useState("");
  const add = () => {
    const v = val.trim();
    if (!v || items.includes(v)) return;
    onChange([...items, v]);
    setVal("");
  };
  return (
    <div className="p-4" style={{ background: P.card, border: `1px solid ${P.line}`, borderRadius: 10 }}>
      <div className="ao-disp font-bold uppercase tracking-wide" style={{ fontSize: 13, color: P.sub }}>{title}</div>
      <div className="flex flex-wrap gap-2 mt-3">
        {items.map((it) => (
          <span key={it} className="inline-flex items-center gap-2" style={{ fontSize: 13, color: P.ink, background: P.mist, borderRadius: 999, padding: "4px 6px 4px 12px" }}>
            {it}
            <button onClick={() => onChange(items.filter((x) => x !== it))} aria-label={`Remove ${it}`}
              style={{ width: 18, height: 18, borderRadius: 999, border: "none", background: "#CBD6D3", color: P.ink, cursor: "pointer", fontSize: 11, lineHeight: "18px" }}>×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2 mt-3">
        <TInput value={val} placeholder={placeholder} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <BtnGhost onClick={add}>Add</BtnGhost>
      </div>
    </div>
  );
}

function Settings({ data, update, onReset, onExport }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ListEditor title="Accounts / projects" items={data.accounts} placeholder="e.g. Vodafone" onChange={(v) => update((d) => ({ ...d, accounts: v }))} />
      <ListEditor title="Team leads / managers" items={data.tls} placeholder="Full name" onChange={(v) => update((d) => ({ ...d, tls: v }))} />
      <div className="p-4" style={{ background: P.card, border: `1px solid ${P.line}`, borderRadius: 10 }}>
        <div className="ao-disp font-bold uppercase tracking-wide" style={{ fontSize: 13, color: P.sub }}>Export</div>
        <div className="mt-2" style={{ fontSize: 13, color: P.sub }}>Download all entries as CSV — includes stage, assignee, and the manager's review comment, ready for the weekly PMO report.</div>
        <div className="mt-3"><BtnPrimary onClick={onExport}>Export CSV</BtnPrimary></div>
      </div>
      <div className="p-4" style={{ background: P.card, border: `1px solid ${P.brick}55`, borderRadius: 10 }}>
        <div className="ao-disp font-bold uppercase tracking-wide" style={{ fontSize: 13, color: P.brick }}>Danger zone</div>
        <div className="mt-2" style={{ fontSize: 13, color: P.sub }}>Erase every entry and restore default accounts, team leads and the DCM.</div>
        <div className="mt-3"><BtnGhost color={P.brick} onClick={onReset}>Reset all data</BtnGhost></div>
      </div>
    </div>
  );
}

/* ================= APP ================= */
export default function AbsenceOps() {
  const [data, setData] = useState(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState("saved"); // saved | saving | error
  const [tab, setTab] = useState("dashboard");
  const [acc, setAcc] = useState("All");
  const [range, setRange] = useState("all"); // all | 30 | month
  const [showForm, setShowForm] = useState(false);
  const [logFilter, setLogFilter] = useState("all"); // all | review | open
  const [assigneeFilter, setAssigneeFilter] = useState("All");
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(STORAGE_KEY);
        if (r && r.value) setData(normalize(JSON.parse(r.value)));
      } catch (err) {
        // no saved data yet — start fresh
      }
      setLoaded(true);
    })();
  }, []);

  const persist = async (next) => {
    setSaveState("saving");
    try {
      const res = await window.storage.set(STORAGE_KEY, JSON.stringify(next));
      setSaveState(res ? "saved" : "error");
    } catch (err) {
      setSaveState("error");
    }
  };
  const update = (fn) => {
    setData((prev) => {
      const next = fn(prev);
      persist(next);
      return next;
    });
  };

  const inRange = (e) => {
    if (range === "30") return daysAgo(e.date) <= 30;
    if (range === "month") return (e.date || "").slice(0, 7) === todayStr().slice(0, 7);
    return true;
  };
  const scoped = useMemo(
    () => data.entries.filter((e) => (acc === "All" || e.account === acc) && inRange(e)),
    [data.entries, acc, range]
  );
  const escalations = useMemo(
    () => computeEscalations(data.entries.filter((e) => acc === "All" || e.account === acc)),
    [data.entries, acc]
  );
  const live = scoped.filter((e) => e.stage !== "dismissed");
  const pendingReview = scoped.filter((e) => e.stage === "review");
  const pendingOps = scoped.filter((e) => e.stage === "active" && e.notified && !e.opsConfirmed);
  const pendingHr = scoped.filter((e) => e.stage === "active" && e.hrNeeded && !e.hrConfirmed && e.opsConfirmed);
  const openCases = scoped.filter((e) => { const s = statusOf(e); return s !== "Closed" && s !== "Dismissed"; });
  const hoursLost = live.reduce((s, e) => s + (e.missingMin || 0), 0);

  const addEntry = (entry) => update((d) => ({ ...d, entries: [entry, ...d.entries] }));
  const patchEntry = (entry) => update((d) => ({ ...d, entries: d.entries.map((x) => (x.id === entry.id ? entry : x)) }));
  const deleteEntry = (id) => update((d) => ({ ...d, entries: d.entries.filter((x) => x.id !== id) }));
  const loadSamples = () => update((d) => ({ ...d, entries: [...buildSamples(d.tls, d.dcm), ...d.entries] }));

  const exportCsv = () => {
    const head = ["Account", "Date", "Agent Email", "Employee ID", "Logged By", "Assignee", "Shift Start", "Shift End", "Violation", "Severity", "Sick Note", "Occurrence", "Action", "Executor", "Missing Minutes", "Stage", "Review Comment", "Agent Notified", "OPS Confirmed", "HR Needed", "HR Confirmed", "Action Date", "Status", "Notes"];
    const rows = data.entries.map((e) => {
      const review = (e.activity || []).find((a) => a.type === "escalated" || a.type === "dismissed");
      return [
        e.account, e.date, e.email, e.empId, e.tl, e.assignee, e.shiftStart, e.shiftEnd, e.violation, e.severity || "",
        e.sickNote ? "Yes" : "No", e.occurrence ?? "", e.action, e.executor, e.missingMin,
        e.stage, review ? `${review.by}: ${review.text}` : "",
        e.notified ? "Yes" : "No", e.opsConfirmed ? "Yes" : "No", e.hrNeeded ? "Yes" : "No",
        e.hrConfirmed ? "Yes" : "No", e.actionDate, statusOf(e), e.notes,
      ];
    });
    const csv = [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `absence-log-${todayStr()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const resetAll = async () => {
    if (!window.confirm("This erases every logged entry and restores defaults. Continue?")) return;
    try { await window.storage.delete(STORAGE_KEY); } catch (err) { /* nothing stored */ }
    setData(DEFAULTS);
    setSaveState("saved");
  };

  const TabBtn = ({ id, children, badge }) => (
    <button
      onClick={() => setTab(id)}
      className="ao-disp uppercase tracking-wider font-semibold transition"
      style={{
        fontSize: 13, padding: "10px 4px", background: "none", border: "none", cursor: "pointer",
        color: tab === id ? P.ink : P.sub,
        borderBottom: `3px solid ${tab === id ? P.petrol : "transparent"}`,
      }}
    >
      {children}
      {badge > 0 && (
        <span className="ao-mono" style={{ marginLeft: 6, fontSize: 11, background: P.brick, color: "#fff", borderRadius: 999, padding: "1px 6px" }}>{badge}</span>
      )}
    </button>
  );

  const KPI = ({ label, value, tone }) => (
    <div className="p-3" style={{ background: P.card, border: `1px solid ${P.line}`, borderRadius: 10 }}>
      <div className="ao-mono font-semibold" style={{ fontSize: 22, color: tone || P.ink, lineHeight: 1 }}>{value}</div>
      <div className="ao-disp uppercase tracking-wider font-semibold mt-1" style={{ fontSize: 10.5, color: P.sub }}>{label}</div>
    </div>
  );

  const saveDot = saveState === "error" ? P.brick : saveState === "saving" ? P.amber : P.green;
  const saveText = saveState === "error" ? "Storage unavailable" : saveState === "saving" ? "Saving…" : "Saved";

  if (!loaded) {
    return (
      <div className="ao-body flex items-center justify-center" style={{ minHeight: "100vh", background: P.paper, color: P.sub }}>
        <style>{FONT_CSS}</style>
        <div className="ao-mono" style={{ fontSize: 13 }}>Loading tracker…</div>
      </div>
    );
  }

  const empty = data.entries.length === 0;
  const q = query.trim().toLowerCase();
  const visibleLog = scoped.filter((e) => {
    if (logFilter === "review" && e.stage !== "review") return false;
    if (logFilter === "open") { const s = statusOf(e); if (s === "Closed" || s === "Dismissed") return false; }
    if (assigneeFilter !== "All") {
      if (assigneeFilter === "Unassigned" ? (e.assignee || "") !== "" : e.assignee !== assigneeFilter) return false;
    }
    if (q && !(e.email || "").toLowerCase().includes(q) && !(e.empId || "").toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <div className="ao-body" style={{ minHeight: "100vh", background: P.paper, color: P.ink }}>
      <style>{FONT_CSS}</style>

      {/* Header band */}
      <div style={{ background: P.ink }}>
        <div className="mx-auto px-4 py-4" style={{ maxWidth: 1100 }}>
          <div className="flex items-center gap-3 flex-wrap">
            <div style={{ width: 30, height: 30, background: P.petrol, borderRadius: 6, position: "relative", flexShrink: 0 }}>
              <div style={{ position: "absolute", right: 3, top: 3, width: 8, height: 8, background: P.amber, borderRadius: 2 }} />
            </div>
            <div className="min-w-0">
              <div className="ao-disp font-bold uppercase" style={{ fontSize: 19, letterSpacing: 2, color: "#F2F6F5", lineHeight: 1 }}>Absence Ops</div>
              <div style={{ fontSize: 11.5, color: "#8FA6A9" }}>Daily leave &amp; absence management · Konecta GDC · DCM v1.0</div>
            </div>
            <span className="flex-1" />
            <div className="flex items-center gap-2">
              <span style={{ width: 8, height: 8, borderRadius: 999, background: saveDot, display: "inline-block" }} />
              <span className="ao-mono" style={{ fontSize: 11, color: "#8FA6A9" }}>{saveText}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-3">
            {["All", ...data.accounts].map((a) => (
              <button
                key={a}
                onClick={() => setAcc(a)}
                className="ao-disp uppercase tracking-wide font-semibold transition"
                style={{
                  fontSize: 12, padding: "5px 12px", borderRadius: 999, cursor: "pointer",
                  color: acc === a ? P.ink : "#C9D6D4",
                  background: acc === a ? "#F2F6F5" : "transparent",
                  border: `1px solid ${acc === a ? "#F2F6F5" : "#3A545C"}`,
                }}
              >
                {a !== "All" && <span style={{ width: 7, height: 7, borderRadius: 999, background: accColor(a), display: "inline-block", marginRight: 6 }} />}
                {a}
              </button>
            ))}
            <span className="flex-1" />
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="ao-disp uppercase tracking-wide font-semibold"
              style={{ fontSize: 12, padding: "5px 8px", borderRadius: 6, background: "transparent", color: "#C9D6D4", border: "1px solid #3A545C" }}
            >
              <option value="all" style={{ color: P.ink }}>All time</option>
              <option value="30" style={{ color: P.ink }}>Last 30 days</option>
              <option value="month" style={{ color: P.ink }}>This month</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mx-auto px-4 pb-16" style={{ maxWidth: 1100 }}>
        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <KPI label="Pending review" value={pendingReview.length} tone={pendingReview.length ? P.petrol : P.green} />
          <KPI label="Open cases" value={openCases.length} tone={openCases.length ? P.amber : P.green} />
          <KPI label="Hours lost" value={fmtMin(hoursLost)} tone={P.brick} />
          <KPI label="Escalations" value={escalations.length} tone={escalations.length ? P.brick : P.green} />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-5 flex-wrap mt-4" style={{ borderBottom: `1px solid ${P.line}` }}>
          <TabBtn id="dashboard">Dashboard</TabBtn>
          <TabBtn id="log">Daily log</TabBtn>
          <TabBtn id="approvals" badge={pendingReview.length + pendingOps.length + pendingHr.length}>Approvals</TabBtn>
          <TabBtn id="dcm">DCM</TabBtn>
          <TabBtn id="settings">Settings</TabBtn>
          <span className="flex-1" />
          <div className="hidden md:block py-2">
            <BtnPrimary onClick={() => { setTab("log"); setShowForm(true); }}>+ Log absence</BtnPrimary>
          </div>
        </div>

        <div className="mt-4">
          {empty && !(tab === "log" && showForm) && tab !== "settings" && tab !== "dcm" ? (
            <div className="p-8 text-center" style={{ background: P.card, border: `1px dashed ${P.line}`, borderRadius: 12 }}>
              <div className="ao-disp font-bold uppercase tracking-wide" style={{ fontSize: 18, color: P.ink }}>No absences logged yet</div>
              <div className="mt-2 mx-auto" style={{ fontSize: 13.5, color: P.sub, maxWidth: 470 }}>
                Log the first case: the matrix prescribes the action, a TL or direct manager escalates or dismisses it with a comment, and the case is routed through OPS and HR confirmation.
              </div>
              <div className="flex gap-3 justify-center flex-wrap mt-5">
                <BtnPrimary onClick={() => { setTab("log"); setShowForm(true); }}>Log first absence</BtnPrimary>
                <BtnGhost onClick={loadSamples}>Load sample data</BtnGhost>
              </div>
            </div>
          ) : null}

          {tab === "dashboard" && !empty && <Dashboard entries={scoped} accounts={acc === "All" ? data.accounts : [acc]} escalations={escalations} />}

          {tab === "log" && (
            <div className="grid gap-4">
              {showForm ? (
                <LogForm data={data} defaultAccount={acc} onAdd={addEntry} onCancel={() => setShowForm(false)} />
              ) : (
                !empty && (
                  <div className="md:hidden">
                    <BtnPrimary onClick={() => setShowForm(true)}>+ Log absence</BtnPrimary>
                  </div>
                )
              )}
              {!empty && (
                <div className="flex items-center gap-2 flex-wrap">
                  {[["all", "All"], ["review", "Pending review"], ["open", "Open only"]].map(([f, lbl]) => (
                    <button key={f} onClick={() => setLogFilter(f)}
                      className="ao-disp uppercase tracking-wide font-semibold"
                      style={{ fontSize: 11, padding: "3px 10px", borderRadius: 999, cursor: "pointer", border: `1px solid ${logFilter === f ? P.petrol : P.line}`, color: logFilter === f ? "#fff" : P.sub, background: logFilter === f ? P.petrol : "transparent" }}>
                      {lbl}
                    </button>
                  ))}
                  <select
                    value={assigneeFilter}
                    onChange={(e) => setAssigneeFilter(e.target.value)}
                    style={{ fontSize: 12, color: P.inkSoft, border: `1px solid ${P.line}`, borderRadius: 999, padding: "3px 8px", background: "#FBFCFB" }}
                  >
                    <option>All</option>
                    <option>Unassigned</option>
                    {data.tls.map((t) => <option key={t}>{t}</option>)}
                  </select>
                  <TInput placeholder="Search agent / ID…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ width: 170, fontSize: 12.5, padding: "4px 10px", borderRadius: 999 }} />
                  <span className="ao-mono" style={{ fontSize: 11, color: P.sub }}>{visibleLog.length} in view</span>
                </div>
              )}
              <div className="grid gap-2">
                {visibleLog.map((e) => <EntryCard key={e.id} e={e} tls={data.tls} onPatch={patchEntry} onDelete={deleteEntry} />)}
              </div>
            </div>
          )}

          {tab === "approvals" && !empty && (
            <div className="grid gap-5">
              <div>
                <div className="ao-disp font-bold uppercase tracking-wide mb-2" style={{ fontSize: 14, color: P.ink }}>
                  Pending manager review <span className="ao-mono" style={{ color: P.petrol }}>({pendingReview.length})</span>
                </div>
                {pendingReview.length === 0 && <div style={{ fontSize: 13, color: P.sub }}>Clear — every case has been reviewed.</div>}
                <div className="grid gap-2">{pendingReview.map((e) => <EntryCard key={e.id} e={e} tls={data.tls} onPatch={patchEntry} onDelete={deleteEntry} />)}</div>
              </div>
              <div>
                <div className="ao-disp font-bold uppercase tracking-wide mb-2" style={{ fontSize: 14, color: P.ink }}>
                  Awaiting OPS confirmation <span className="ao-mono" style={{ color: P.amber }}>({pendingOps.length})</span>
                </div>
                {pendingOps.length === 0 && <div style={{ fontSize: 13, color: P.sub }}>Clear — nothing waiting on OPS.</div>}
                <div className="grid gap-2">{pendingOps.map((e) => <EntryCard key={e.id} e={e} tls={data.tls} onPatch={patchEntry} onDelete={deleteEntry} />)}</div>
              </div>
              <div>
                <div className="ao-disp font-bold uppercase tracking-wide mb-2" style={{ fontSize: 14, color: P.ink }}>
                  Awaiting HR confirmation <span className="ao-mono" style={{ color: P.brick }}>({pendingHr.length})</span>
                </div>
                {pendingHr.length === 0 && <div style={{ fontSize: 13, color: P.sub }}>Clear — nothing waiting on HR.</div>}
                <div className="grid gap-2">{pendingHr.map((e) => <EntryCard key={e.id} e={e} tls={data.tls} onPatch={patchEntry} onDelete={deleteEntry} />)}</div>
              </div>
            </div>
          )}

          {tab === "dcm" && <DcmEditor dcm={data.dcm} onChange={(d) => update((prev) => ({ ...prev, dcm: d }))} />}

          {tab === "settings" && <Settings data={data} update={update} onReset={resetAll} onExport={exportCsv} />}
        </div>
      </div>
    </div>
  );
}
