/* Tab E — agent compliance profiles.

   The ledger keeps no separate agent registry: agents are whoever appears in a
   case, keyed by email. A display name is derived from the address rather than
   stored, so it can never drift out of sync with the cases themselves. */

import { useMemo, useState } from "react";
import { Search, UserRound, CalendarClock, Scale, ShieldAlert, CircleSlash } from "lucide-react";
import { Card, Pill, Muted, TInput, TSelect, Label } from "./ui/index.jsx";
import { P, accColor, sevColor, STATUS_COLOR } from "../lib/tokens.js";
import { fmtMin, fmtDate, fmtDateLong, fmtStamp, days, plural } from "../lib/format.js";
import { addDays } from "../lib/dates.js";
import { RESET_DAYS, PER_MONTH_CAP, EMERGENCY_QUOTA } from "../lib/constants.js";
import { statusOf } from "../lib/engine.js";
import { listAgents, agentSummary, agentTimeline } from "../lib/agents.js";

/** "nour.said@demo.konecta" -> "Nour Said" */
export const nameFromEmail = (email) =>
  String(email || "")
    .split("@")[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");

export default function AgentProfiles({ entries, accounts }) {
  const [q, setQ] = useState("");
  const [account, setAccount] = useState("All");
  const [warnFilter, setWarnFilter] = useState("All");
  const [selected, setSelected] = useState(null);

  const agents = useMemo(() => listAgents(entries), [entries]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return agents
      .map((a) => ({ ...a, name: nameFromEmail(a.email), summary: agentSummary(entries, a.email) }))
      .filter((a) => {
        if (account !== "All" && a.account !== account) return false;
        if (warnFilter === "Active warnings" && a.summary.activeWarnings.length === 0) return false;
        if (warnFilter === "Clear" && a.summary.activeWarnings.length > 0) return false;
        if (!needle) return true;
        return (
          a.email.toLowerCase().includes(needle) ||
          a.name.toLowerCase().includes(needle) ||
          (a.empId || "").toLowerCase().includes(needle)
        );
      });
  }, [agents, entries, q, account, warnFilter]);

  const active = useMemo(() => {
    const pick = rows.find((r) => r.email === selected) || rows[0];
    return pick || null;
  }, [rows, selected]);

  if (agents.length === 0) return <Muted>No agents yet — log a case and they will appear here.</Muted>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
      {/* ── Search + roster ── */}
      <div className="grid gap-3">
        <Card>
          <div
            className="flex items-center gap-2"
            style={{ border: `1px solid ${P.line}`, background: "#FBFCFB", borderRadius: 6, padding: "8px 10px" }}
          >
            <Search size={14} color={P.sub} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, employee ID or email…"
              style={{ border: "none", background: "transparent", outline: "none", fontSize: 14, color: P.ink, flex: 1, minWidth: 0 }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3">
            <div>
              <Label>Campaign</Label>
              <TSelect value={account} onChange={(e) => setAccount(e.target.value)} style={{ marginTop: 4, fontSize: 13, padding: "6px 8px" }}>
                <option>All</option>
                {accounts.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </TSelect>
            </div>
            <div>
              <Label>Warning status</Label>
              <TSelect value={warnFilter} onChange={(e) => setWarnFilter(e.target.value)} style={{ marginTop: 4, fontSize: 13, padding: "6px 8px" }}>
                <option>All</option>
                <option>Active warnings</option>
                <option>Clear</option>
              </TSelect>
            </div>
          </div>

          <div className="ao-mono mt-2" style={{ fontSize: 11, color: P.sub }}>
            {rows.length} of {agents.length} agents
          </div>
        </Card>

        <div className="grid gap-2" style={{ maxHeight: 560, overflowY: "auto" }}>
          {rows.length === 0 && <Muted>No agents match those filters.</Muted>}
          {rows.map((a) => {
            const on = active && a.email === active.email;
            const warns = a.summary.activeWarnings.length;
            return (
              <button
                key={a.email}
                onClick={() => setSelected(a.email)}
                className="text-left p-3 flex"
                style={{
                  background: on ? P.ink : P.card,
                  border: `1px solid ${on ? P.ink : P.line}`,
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                <div className="min-w-0 flex-1">
                  <div className="ao-disp font-bold uppercase tracking-wide truncate" style={{ fontSize: 13.5, color: on ? "#F2F6F5" : P.ink }}>
                    {a.name}
                  </div>
                  <div className="ao-mono truncate" style={{ fontSize: 11, color: on ? "#8FA6A9" : P.sub }}>
                    {a.empId || "—"} · {a.email}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1" style={{ fontSize: 11, color: on ? "#C9D6D4" : P.sub }}>
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: accColor(a.account) }} />
                      {a.account}
                    </span>
                    <span className="ao-mono" style={{ fontSize: 11, color: on ? "#C9D6D4" : P.sub }}>
                      {plural(a.summary.logged, "case")}
                    </span>
                    {warns > 0 && (
                      <Pill color={P.brick} filled>
                        {warns} active
                      </Pill>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Profile ── */}
      <div className="lg:col-span-2 grid gap-3">{active && <Profile agent={active} entries={entries} />}</div>
    </div>
  );
}

function Profile({ agent, entries }) {
  const s = agent.summary;
  const timeline = useMemo(() => agentTimeline(entries, agent.email, RESET_DAYS), [entries, agent.email]);
  const capHit = s.monthDeduction >= PER_MONTH_CAP;

  return (
    <>
      {/* Header */}
      <div className="flex" style={{ background: P.ink, borderRadius: 10, overflow: "hidden" }}>
        <div style={{ width: 6, background: accColor(agent.account), flexShrink: 0 }} />
        <div className="p-4 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <UserRound size={16} color="#8FB6B3" />
            <span className="ao-disp font-bold uppercase" style={{ fontSize: 19, letterSpacing: 1, color: "#F2F6F5" }}>
              {agent.name}
            </span>
            <span className="flex-1" />
            <Pill color="#8FB6B3">{agent.account}</Pill>
          </div>
          <div className="ao-mono mt-1" style={{ fontSize: 12, color: "#8FA6A9" }}>
            {agent.empId || "no employee ID"} · {agent.email} · TL {agent.tl || "—"}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
            <HeadStat label="Cases (90d)" value={timeline.filter((e) => e.stage !== "dismissed").length} />
            <HeadStat label="Hours lost" value={fmtMin(s.hoursLost)} tone="#E8A79C" />
            <HeadStat label="Deducted this month" value={`${s.monthDeduction}/${PER_MONTH_CAP}`} tone={capHit ? "#F0D6A8" : "#F2F6F5"} />
            <HeadStat label="Emergency used" value={`${s.emergency.used}/${EMERGENCY_QUOTA}`} tone={s.emergency.used >= EMERGENCY_QUOTA ? "#E8A79C" : "#F2F6F5"} />
          </div>
        </div>
      </div>

      {/* Active warnings */}
      <Card title="Active warning stages" right={<Pill color={s.activeWarnings.length ? P.brick : P.green}>{s.activeWarnings.length ? `${s.activeWarnings.length} live` : "Clear"}</Pill>}>
        {s.activeWarnings.length === 0 ? (
          <Muted>No active warnings — every chain has passed its {RESET_DAYS}-day reset.</Muted>
        ) : (
          <div className="grid gap-2">
            {s.activeWarnings.map((w) => (
              <div key={w.violation} className="flex items-center gap-2 p-2" style={{ background: P.mist, borderRadius: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: sevColor(w.severity), flexShrink: 0 }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate" style={{ fontSize: 13, color: P.ink }}>
                    {w.violation}
                  </div>
                  <div style={{ fontSize: 11.5, color: P.sub }}>{w.action}</div>
                </div>
                <Pill color={sevColor(w.severity)} filled>
                  №{w.occ}
                </Pill>
                <div style={{ textAlign: "right", minWidth: 106 }}>
                  <div className="ao-mono" style={{ fontSize: 11.5, color: P.inkSoft }}>
                    resets {fmtDate(w.resetOn)}
                  </div>
                  <div className="ao-mono" style={{ fontSize: 10.5, color: w.daysLeft <= 14 ? P.green : P.sub }}>
                    {w.daysLeft} days left
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {capHit && (
          <div className="mt-3 flex items-start gap-2 p-2" style={{ background: "#FBF6F0", border: `1px solid ${P.amber}55`, borderRadius: 6 }}>
            <Scale size={13} color={P.amber} style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 12, color: P.inkSoft }}>
              Monthly deduction cap reached — {days(s.monthDeduction)} taken. Further deductions this month are not
              collectable under the labour law.
            </span>
          </div>
        )}
      </Card>

      {/* Timeline */}
      <Card title={`${RESET_DAYS}-day case timeline`} right={<Pill color={P.sub}>{plural(timeline.length, "entry", "entries")}</Pill>}>
        {timeline.length === 0 ? (
          <Muted>No cases in the last {RESET_DAYS} days.</Muted>
        ) : (
          <div style={{ position: "relative", paddingLeft: 18 }}>
            <div style={{ position: "absolute", left: 5, top: 6, bottom: 6, width: 2, background: P.mist }} />
            <div className="grid gap-3">
              {timeline.map((e) => (
                <TimelineRow key={e.id} e={e} />
              ))}
            </div>
          </div>
        )}
      </Card>
    </>
  );
}

function TimelineRow({ e }) {
  const st = statusOf(e);
  const dismissed = e.stage === "dismissed";
  const dot = dismissed ? "#B9C4C2" : e.severity ? sevColor(e.severity) : P.green;
  const review = (e.activity || []).find((a) => a.type === "escalated" || a.type === "dismissed");

  return (
    <div style={{ position: "relative", opacity: dismissed ? 0.65 : 1 }}>
      <span
        style={{
          position: "absolute",
          left: -17,
          top: 5,
          width: 10,
          height: 10,
          borderRadius: 999,
          background: dot,
          border: `2px solid ${P.card}`,
          boxShadow: `0 0 0 1.5px ${dot}`,
        }}
      />
      <div className="flex items-center gap-2 flex-wrap">
        <span className="ao-mono font-semibold" style={{ fontSize: 12, color: P.ink }}>
          {fmtDateLong(e.date)}
        </span>
        <Pill color={dismissed ? "#8A9598" : dot} filled={!dismissed}>
          {e.violation}
          {e.occurrence ? ` · №${e.occurrence}` : ""}
        </Pill>
        <Pill color={STATUS_COLOR[st]}>{st}</Pill>
        {e.missingMin > 0 && (
          <span className="ao-mono" style={{ fontSize: 11.5, color: P.brick }}>
            −{fmtMin(e.missingMin)}
          </span>
        )}
      </div>

      <div style={{ fontSize: 12.5, color: P.inkSoft, marginTop: 2 }}>
        {dismissed ? (
          <span className="inline-flex items-center gap-1" style={{ color: P.sub }}>
            <CircleSlash size={11} /> Dismissed — excluded from occurrence counts and deductions
          </span>
        ) : (
          <>
            <b>{e.action}</b>
            {(e.deductionApplied || 0) > 0 && (
              <span style={{ color: P.sub }}> · {days(e.deductionApplied)} deducted</span>
            )}
            {(e.deductionDays || 0) > (e.deductionApplied || 0) && (
              <span style={{ color: P.amber }}> · capped from {days(e.deductionDays)}</span>
            )}
          </>
        )}
      </div>

      {!dismissed && e.stage === "active" && e.disciplinary && (
        <div className="ao-mono inline-flex items-center gap-1" style={{ fontSize: 11, color: P.sub, marginTop: 2 }}>
          <CalendarClock size={10} />
          resets {fmtDate(addDays(e.date, RESET_DAYS))}
        </div>
      )}

      {review && (
        <div className="mt-1 p-2" style={{ background: P.mist, borderRadius: 6, fontSize: 12, color: P.inkSoft }}>
          <b>{review.by}</b>: {review.text}
          <div className="ao-mono mt-0.5" style={{ fontSize: 10.5, color: P.sub }}>
            {fmtStamp(review.at)}
          </div>
        </div>
      )}

      {e.severity === "Serious" || e.severity === "Zero Tolerance" ? (
        <div className="inline-flex items-center gap-1 mt-1" style={{ fontSize: 11, color: P.brick }}>
          <ShieldAlert size={11} /> Investigation rights applied — 3–5 working day response window
        </div>
      ) : null}
    </div>
  );
}

function HeadStat({ label, value, tone }) {
  return (
    <div className="p-2" style={{ background: "#1D3640", borderRadius: 6 }}>
      <div className="ao-mono font-semibold" style={{ fontSize: 16, color: tone || "#F2F6F5", lineHeight: 1.2 }}>
        {value}
      </div>
      <div className="ao-disp uppercase tracking-wider font-semibold" style={{ fontSize: 9.5, color: "#8FA6A9" }}>
        {label}
      </div>
    </div>
  );
}
