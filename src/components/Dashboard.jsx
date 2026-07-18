/* Tab A — the operations control dashboard.

   Everything here reads live entries only; dismissed cases are filtered out at
   the top so a thrown-out case never inflates hours lost or the deduction pool. */

import { useMemo } from "react";
import { PhoneCall, UserX, CalendarX2, Users, TriangleAlert, Scale } from "lucide-react";
import { Card, Pill, Muted } from "./ui/index.jsx";
import { P, SEV_ORDER, accColor, sevColor } from "../lib/tokens.js";
import { fmtMin, fmtDate, days } from "../lib/format.js";
import { countsForDiscipline } from "../lib/engine.js";
import { todayStr, addDays, daysBetween } from "../lib/dates.js";

const FLAG_ICON = { "3in30": PhoneCall, "5in60": Users, ncns: UserX, emergency: CalendarX2 };

export default function Dashboard({ entries, accounts, escalations }) {
  // Hours lost and case counts include cases still at triage — the hours were
  // lost whether or not a manager has ruled yet. Deductions do not: nothing is
  // scheduled against payroll until the case is escalated.
  const live = useMemo(() => entries.filter((e) => e.stage !== "dismissed"), [entries]);
  const escalated = useMemo(() => entries.filter(countsForDiscipline), [entries]);

  const perAccount = useMemo(
    () =>
      accounts.map((a) => ({
        a,
        count: live.filter((e) => e.account === a).length,
        min: live.filter((e) => e.account === a).reduce((s, e) => s + (e.missingMin || 0), 0),
        ded: escalated.filter((e) => e.account === a).reduce((s, e) => s + (e.deductionApplied || 0), 0),
      })),
    [live, escalated, accounts]
  );
  const maxMin = Math.max(1, ...perAccount.map((p) => p.min));

  // Eight ISO-ish weeks back from today (bucket 0 = the current 7 days).
  const weekly = useMemo(() => {
    const today = todayStr();
    const buckets = Array.from({ length: 8 }, (_, i) => ({
      start: addDays(today, -7 * (8 - i) + 1),
      end: addDays(today, -7 * (7 - i)),
      min: 0,
      count: 0,
    }));
    for (const e of live) {
      const age = daysBetween(e.date, today);
      if (Number.isNaN(age) || age < 0 || age >= 56) continue;
      const idx = 7 - Math.floor(age / 7);
      buckets[idx].min += e.missingMin || 0;
      buckets[idx].count++;
    }
    return buckets;
  }, [live]);

  const perLob = useMemo(() => {
    const m = {};
    for (const e of live) {
      const lob = e.lob || "Unassigned";
      if (!m[lob]) m[lob] = { lob, count: 0, min: 0 };
      m[lob].count++;
      m[lob].min += e.missingMin || 0;
    }
    return Object.values(m).sort((a, b) => b.min - a.min);
  }, [live]);
  const maxLob = Math.max(1, ...perLob.map((p) => p.min));

  const bySeverity = useMemo(() => {
    const m = Object.fromEntries(SEV_ORDER.map((s) => [s, 0]));
    let leave = 0;
    for (const e of live) {
      if (e.severity && m[e.severity] !== undefined) m[e.severity]++;
      else leave++;
    }
    return { tiers: SEV_ORDER.map((s) => ({ name: s, count: m[s], color: sevColor(s) })), leave };
  }, [live]);

  const byViolation = useMemo(() => {
    const m = {};
    for (const e of live) {
      if (!m[e.violation]) m[e.violation] = { count: 0, sev: e.severity };
      m[e.violation].count++;
    }
    return Object.entries(m)
      .map(([name, v]) => ({ name, ...v }))
      .sort((x, y) => y.count - x.count)
      .slice(0, 8);
  }, [live]);
  const maxV = Math.max(1, ...byViolation.map((v) => v.count));

  const offenders = useMemo(() => {
    const m = {};
    for (const e of escalated) {
      if (!e.disciplinary) continue;
      const em = (e.email || "").toLowerCase();
      if (!m[em]) m[em] = { email: e.email, account: e.account, count: 0, ded: 0 };
      m[em].count++;
      m[em].ded += e.deductionApplied || 0;
    }
    return Object.values(m)
      .sort((x, y) => y.count - x.count || y.ded - x.ded)
      .slice(0, 6);
  }, [escalated]);

  return (
    <div className="grid gap-4">
      {/* Escalation flags come first — they are the reason to open this tab */}
      <Card
        title="Live escalation flags"
        right={
          escalations.length > 0 ? (
            <Pill color={P.brick} filled>
              {escalations.length} active
            </Pill>
          ) : (
            <Pill color={P.green}>All clear</Pill>
          )
        }
      >
        {escalations.length === 0 ? (
          <Muted>
            No thresholds breached. Three infractions in 30 days triggers an alignment call; five in 60 days triggers an
            HR intervention plan.
          </Muted>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {escalations.map((x, i) => {
              const Icon = FLAG_ICON[x.kind] || TriangleAlert;
              const c = sevColor(x.level);
              return (
                <div
                  key={i}
                  className="flex items-start gap-2 p-2.5"
                  style={{ background: "rgba(232,165,75,0.10)", border: `1px solid ${c}33`, borderLeft: `4px solid ${c}`, borderRadius: 6 }}
                >
                  <Icon size={15} color={c} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div className="min-w-0">
                    <div className="ao-disp uppercase tracking-wide font-semibold" style={{ fontSize: 12, color: c }}>
                      {x.title}
                    </div>
                    <div className="ao-mono truncate" style={{ fontSize: 12, color: P.ink }}>
                      {x.email} <span style={{ color: P.sub }}>· {x.account}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: P.inkSoft }}>{x.text}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Trend: hours lost per week, last 8 weeks */}
      <Card title="Hours lost — last 8 weeks" right={<Pill color={P.sub}>weekly</Pill>}>
        <TrendBars weekly={weekly} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Hours lost per account */}
        <Card title="Hours lost per account">
          {perAccount.every((p) => p.count === 0) ? (
            <Muted>Nothing logged for these accounts yet.</Muted>
          ) : (
            <div className="grid gap-3">
              {perAccount.map((p) => (
                <div key={p.a}>
                  <div className="flex items-center gap-2">
                    <span style={{ width: 9, height: 9, borderRadius: 2, background: accColor(p.a), flexShrink: 0 }} />
                    <span className="ao-disp font-bold uppercase tracking-wide" style={{ fontSize: 12.5, color: P.ink }}>
                      {p.a}
                    </span>
                    <span className="flex-1" />
                    <span className="ao-mono font-semibold" style={{ fontSize: 13, color: P.brick }}>
                      {fmtMin(p.min)}
                    </span>
                  </div>
                  <div className="mt-1" style={{ background: P.mist, borderRadius: 4, height: 10, overflow: "hidden" }}>
                    <div style={{ width: `${(p.min / maxMin) * 100}%`, height: "100%", background: accColor(p.a) }} />
                  </div>
                  <div className="flex gap-3 mt-1" style={{ fontSize: 11, color: P.sub }}>
                    <span>{p.count} records</span>
                    <span>{days(p.ded)} deducted</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Violation class distribution */}
        <Card title="Violation class distribution">
          <SeverityDonut tiers={bySeverity.tiers} leave={bySeverity.leave} total={live.length} />
        </Card>

        {/* Hours lost per LOB */}
        <Card title="Hours lost per line of business">
          {perLob.length === 0 ? (
            <Muted>No LOB data yet — RTA imports carry it; manual entries can set it on the log form.</Muted>
          ) : (
            <div className="grid gap-3">
              {perLob.map((p) => (
                <div key={p.lob}>
                  <div className="flex items-center gap-2">
                    <span className="ao-disp font-bold uppercase tracking-wide" style={{ fontSize: 12.5, color: p.lob === "Unassigned" ? P.sub : P.ink }}>
                      {p.lob}
                    </span>
                    <span className="flex-1" />
                    <span className="ao-mono font-semibold" style={{ fontSize: 13, color: P.brick }}>
                      {fmtMin(p.min)}
                    </span>
                  </div>
                  <div className="mt-1" style={{ background: P.mist, borderRadius: 4, height: 10, overflow: "hidden" }}>
                    <div style={{ width: `${(p.min / maxLob) * 100}%`, height: "100%", background: p.lob === "Unassigned" ? P.sub : P.petrol }} />
                  </div>
                  <div style={{ fontSize: 11, color: P.sub, marginTop: 2 }}>{p.count} records</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Breakdown by type */}
        <Card title="Breakdown by type">
          {byViolation.length === 0 ? (
            <Muted>Nothing logged yet.</Muted>
          ) : (
            <div className="grid gap-2">
              {byViolation.map((v) => (
                <div key={v.name} className="flex items-center gap-2">
                  <div className="truncate" style={{ width: 150, fontSize: 12.5, color: P.inkSoft, flexShrink: 0 }}>
                    {v.name}
                  </div>
                  <div className="flex-1" style={{ background: P.mist, borderRadius: 4, height: 14 }}>
                    <div
                      style={{
                        width: `${(v.count / maxV) * 100}%`,
                        height: "100%",
                        borderRadius: 4,
                        background: v.sev ? sevColor(v.sev) : P.petrol,
                      }}
                    />
                  </div>
                  <div className="ao-mono" style={{ fontSize: 12.5, color: P.ink, width: 28, textAlign: "right" }}>
                    {v.count}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Repeat offenders */}
        <Card title="Repeat cases — top agents">
          {offenders.length === 0 ? (
            <Muted>No disciplinary entries.</Muted>
          ) : (
            <div className="grid gap-2">
              {offenders.map((o) => (
                <div key={o.email} className="flex items-center gap-2">
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: accColor(o.account), flexShrink: 0 }} />
                  <span className="ao-mono truncate flex-1" style={{ fontSize: 12.5, color: P.ink }}>
                    {o.email}
                  </span>
                  {o.ded > 0 && (
                    <span
                      className="ao-mono inline-flex items-center gap-1"
                      style={{ fontSize: 11, color: P.sub }}
                      title="Total deduction days scheduled across all months"
                    >
                      <Scale size={10} />
                      {o.ded}d
                    </span>
                  )}
                  <Pill color={o.count >= 3 ? P.brick : P.amber} filled>
                    {o.count} case{o.count > 1 ? "s" : ""}
                  </Pill>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

/* Eight weeks of lost time as glowing bars — pure SVG, no chart library. */
function TrendBars({ weekly }) {
  const max = Math.max(1, ...weekly.map((w) => w.min));
  const W = 720;
  const H = 150;
  const pad = 8;
  const bw = (W - pad * 2) / weekly.length;

  if (weekly.every((w) => w.count === 0)) {
    return <Muted>No lost time recorded in the last eight weeks.</Muted>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 ${W} ${H + 30}`} style={{ width: "100%", minWidth: 480 }} role="img" aria-label="Hours lost per week, last 8 weeks">
        <defs>
          <linearGradient id="trendbar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34B3A8" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#34B3A8" stopOpacity="0.25" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={pad} x2={W - pad} y1={H - H * f} y2={H - H * f} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
        ))}
        {weekly.map((w, i) => {
          const h = Math.max(w.min > 0 ? 4 : 0, (w.min / max) * (H - 12));
          const x = pad + i * bw + bw * 0.18;
          const isCurrent = i === weekly.length - 1;
          return (
            <g key={w.start}>
              <rect
                x={x}
                y={H - h}
                width={bw * 0.64}
                height={h}
                rx="6"
                fill={isCurrent ? "url(#trendbar)" : "rgba(255,255,255,0.14)"}
                stroke={isCurrent ? "#34B3A8" : "rgba(255,255,255,0.18)"}
                strokeWidth="1"
              >
                <title>{`${fmtDate(w.start)} – ${fmtDate(w.end)}: ${fmtMin(w.min)} lost across ${w.count} case${w.count === 1 ? "" : "s"}`}</title>
              </rect>
              {w.min > 0 && (
                <text x={x + bw * 0.32} y={H - h - 6} textAnchor="middle" className="ao-mono" style={{ fontSize: 11, fill: isCurrent ? "#34B3A8" : "#8B9AA6" }}>
                  {fmtMin(w.min)}
                </text>
              )}
              <text x={x + bw * 0.32} y={H + 18} textAnchor="middle" className="ao-mono" style={{ fontSize: 10, fill: "#8B9AA6" }}>
                {fmtDate(w.end)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* Donut drawn by hand — one <circle> per tier, offset around the ring. */
function SeverityDonut({ tiers, leave, total }) {
  const R = 54;
  const C = 2 * Math.PI * R;
  const rows = [...tiers, { name: "Leave / excused", count: leave, color: P.green }].filter((t) => t.count > 0);
  const sum = rows.reduce((s, t) => s + t.count, 0);

  if (!sum) return <Muted>Nothing logged yet.</Muted>;

  let offset = 0;
  const arcs = rows.map((t) => {
    const len = (t.count / sum) * C;
    const arc = { ...t, len, offset };
    offset += len;
    return arc;
  });

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <svg width="132" height="132" viewBox="0 0 132 132" style={{ flexShrink: 0 }} role="img" aria-label="Violation class distribution">
        <g transform="rotate(-90 66 66)">
          <circle cx="66" cy="66" r={R} fill="none" stroke={P.mist} strokeWidth="16" />
          {arcs.map((a) => (
            <circle
              key={a.name}
              cx="66"
              cy="66"
              r={R}
              fill="none"
              stroke={a.color}
              strokeWidth="16"
              strokeDasharray={`${a.len} ${C - a.len}`}
              strokeDashoffset={-a.offset}
            />
          ))}
        </g>
        <text x="66" y="62" textAnchor="middle" className="ao-mono" style={{ fontSize: 22, fontWeight: 600, fill: P.ink }}>
          {total}
        </text>
        <text x="66" y="78" textAnchor="middle" className="ao-disp" style={{ fontSize: 10, letterSpacing: 1, fill: P.sub }}>
          CASES
        </text>
      </svg>

      <div className="grid gap-1.5 flex-1" style={{ minWidth: 140 }}>
        {arcs.map((a) => (
          <div key={a.name} className="flex items-center gap-2">
            <span style={{ width: 9, height: 9, borderRadius: 2, background: a.color, flexShrink: 0 }} />
            <span className="truncate" style={{ fontSize: 12.5, color: P.inkSoft, flex: 1 }}>
              {a.name}
            </span>
            <span className="ao-mono" style={{ fontSize: 12.5, color: P.ink }}>
              {a.count}
            </span>
            <span className="ao-mono" style={{ fontSize: 11, color: P.sub, width: 34, textAlign: "right" }}>
              {Math.round((a.count / sum) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
