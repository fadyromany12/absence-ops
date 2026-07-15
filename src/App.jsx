import { useMemo, useState } from "react";
import {
  LayoutDashboard,
  ClipboardPlus,
  Inbox,
  CheckCheck,
  Users,
  Table2,
  Settings2,
  Clock3,
  Scale,
  TriangleAlert,
  Plus,
  CircleCheck,
  CircleAlert,
} from "lucide-react";

import { useLocalStorage } from "./hooks/useLocalStorage.js";
import { P, accColor } from "./lib/tokens.js";
import { STORAGE_KEY, DEFAULTS } from "./lib/constants.js";
import { normalize } from "./lib/storage.js";
import { settleDeductions } from "./lib/deductions.js";
import { todayStr, daysAgo, monthOf } from "./lib/dates.js";
import { fmtMin } from "./lib/format.js";
import { statusOf, computeEscalations, countsForDiscipline } from "./lib/engine.js";
import { buildSamples } from "./lib/samples.js";
import { downloadCsv } from "./lib/csv.js";

import { TInput, BtnPrimary, BtnGhost, SectionTitle, Muted } from "./components/ui/index.jsx";
import LogForm from "./components/LogForm.jsx";
import EntryCard from "./components/EntryCard.jsx";
import Dashboard from "./components/Dashboard.jsx";
import AgentProfiles from "./components/AgentProfiles.jsx";
import DcmEditor from "./components/DcmEditor.jsx";
import SettingsView from "./components/SettingsView.jsx";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "log", label: "Daily log", icon: ClipboardPlus },
  { id: "triage", label: "Triage gate", icon: Inbox, badge: "review" },
  { id: "approvals", label: "Approvals", icon: CheckCheck, badge: "approvals" },
  { id: "agents", label: "Agents", icon: Users },
  { id: "dcm", label: "DCM matrix", icon: Table2 },
  { id: "settings", label: "Settings", icon: Settings2 },
];

export default function App() {
  const { value: data, update, clear, loaded, saveState } = useLocalStorage(STORAGE_KEY, DEFAULTS, normalize);

  const [tab, setTab] = useState("dashboard");
  const [acc, setAcc] = useState("All");
  const [range, setRange] = useState("all"); // all | 30 | month
  const [showForm, setShowForm] = useState(false);
  const [logFilter, setLogFilter] = useState("all"); // all | review | open
  const [assigneeFilter, setAssigneeFilter] = useState("All");
  const [query, setQuery] = useState("");

  /* ── Derived views ─────────────────────────────────────────────────────── */

  const scoped = useMemo(() => {
    const inRange = (e) => {
      if (range === "30") return daysAgo(e.date) <= 30;
      if (range === "month") return monthOf(e.date) === monthOf(todayStr());
      return true;
    };
    return data.entries.filter((e) => (acc === "All" || e.account === acc) && inRange(e));
  }, [data.entries, acc, range]);

  // Escalation flags ignore the date range — a 60-day threshold can't be judged
  // through a 30-day window.
  const escalations = useMemo(
    () => computeEscalations(data.entries.filter((e) => acc === "All" || e.account === acc)),
    [data.entries, acc]
  );

  const live = useMemo(() => scoped.filter((e) => e.stage !== "dismissed"), [scoped]);
  const pendingReview = useMemo(() => scoped.filter((e) => e.stage === "review"), [scoped]);
  const pendingOps = useMemo(
    () => scoped.filter((e) => e.stage === "active" && e.notified && !e.opsConfirmed),
    [scoped]
  );
  const pendingHr = useMemo(
    () => scoped.filter((e) => e.stage === "active" && e.hrNeeded && !e.hrConfirmed && e.opsConfirmed),
    [scoped]
  );

  // Hours were lost whether or not a manager has ruled, so triage-stage cases
  // count. Deductions are only scheduled once a case is escalated.
  const hoursLost = live.reduce((s, e) => s + (e.missingMin || 0), 0);
  const deductionPool = scoped.filter(countsForDiscipline).reduce((s, e) => s + (e.deductionApplied || 0), 0);
  const activeEscalations = pendingOps.length + pendingHr.length;

  /* ── Mutations ─────────────────────────────────────────────────────────── */
  // Every write re-settles the ledger: monthly deduction headroom is shared
  // between cases, so one edit can change what a neighbour may collect.

  const addEntry = (entry) => update((d) => ({ ...d, entries: settleDeductions([entry, ...d.entries]) }));
  const patchEntry = (entry) =>
    update((d) => ({ ...d, entries: settleDeductions(d.entries.map((x) => (x.id === entry.id ? entry : x))) }));
  const deleteEntry = (id) => update((d) => ({ ...d, entries: settleDeductions(d.entries.filter((x) => x.id !== id)) }));
  const loadSamples = () =>
    update((d) => ({ ...d, entries: settleDeductions([...buildSamples(d.tls, d.dcm), ...d.entries]) }));

  const resetAll = () => {
    if (!window.confirm("This erases every logged entry and restores defaults. Continue?")) return;
    clear();
    setTab("dashboard");
  };

  /* ── Chrome ────────────────────────────────────────────────────────────── */

  if (!loaded) {
    return (
      <div className="ao-body flex items-center justify-center" style={{ minHeight: "100vh", background: P.paper, color: P.sub }}>
        <div className="ao-mono" style={{ fontSize: 13 }}>
          Loading tracker…
        </div>
      </div>
    );
  }

  const empty = data.entries.length === 0;
  const q = query.trim().toLowerCase();
  const visibleLog = scoped.filter((e) => {
    if (logFilter === "review" && e.stage !== "review") return false;
    if (logFilter === "open") {
      const s = statusOf(e);
      if (s === "Closed" || s === "Dismissed") return false;
    }
    if (assigneeFilter !== "All") {
      if (assigneeFilter === "Unassigned" ? (e.assignee || "") !== "" : e.assignee !== assigneeFilter) return false;
    }
    if (q && !(e.email || "").toLowerCase().includes(q) && !(e.empId || "").toLowerCase().includes(q)) return false;
    return true;
  });

  const badges = { review: pendingReview.length, approvals: pendingOps.length + pendingHr.length };
  const showEmpty = empty && !(tab === "log" && showForm) && !["settings", "dcm"].includes(tab);

  return (
    <div className="ao-body" style={{ minHeight: "100vh", background: P.paper, color: P.ink }}>
      {/* ── Header band ── */}
      <header style={{ background: P.ink }}>
        <div className="mx-auto px-4 py-4" style={{ maxWidth: 1320 }}>
          <div className="flex items-center gap-3 flex-wrap">
            <div style={{ width: 30, height: 30, background: P.petrol, borderRadius: 6, position: "relative", flexShrink: 0 }}>
              <div style={{ position: "absolute", right: 3, top: 3, width: 8, height: 8, background: P.amber, borderRadius: 2 }} />
            </div>
            <div className="min-w-0">
              <div className="ao-disp font-bold uppercase" style={{ fontSize: 19, letterSpacing: 2, color: "#F2F6F5", lineHeight: 1 }}>
                Absence Ops
              </div>
              <div style={{ fontSize: 11.5, color: "#8FA6A9" }}>
                Daily leave &amp; absence management · Konecta GDC · DCM v1.0
              </div>
            </div>
            <span className="flex-1" />
            <SaveBadge state={saveState} />
          </div>

          <div className="flex items-center gap-2 flex-wrap mt-3">
            {["All", ...data.accounts].map((a) => (
              <button
                key={a}
                onClick={() => setAcc(a)}
                className="ao-disp uppercase tracking-wide font-semibold transition"
                style={{
                  fontSize: 12,
                  padding: "5px 12px",
                  borderRadius: 999,
                  cursor: "pointer",
                  color: acc === a ? P.ink : "#C9D6D4",
                  background: acc === a ? "#F2F6F5" : "transparent",
                  border: `1px solid ${acc === a ? "#F2F6F5" : "#3A545C"}`,
                }}
              >
                {a !== "All" && (
                  <span style={{ width: 7, height: 7, borderRadius: 999, background: accColor(a), display: "inline-block", marginRight: 6 }} />
                )}
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
      </header>

      <div className="mx-auto px-4 pb-16 flex gap-5 items-start" style={{ maxWidth: 1320 }}>
        {/* ── Sidebar ── */}
        <nav className="hidden md:block py-4" style={{ width: 190, flexShrink: 0, position: "sticky", top: 0 }}>
          <div className="grid gap-1">
            {NAV.map((n) => (
              <NavItem key={n.id} item={n} active={tab === n.id} badge={badges[n.badge] || 0} onClick={() => setTab(n.id)} />
            ))}
          </div>
          <div className="mt-4">
            <BtnPrimary
              icon={Plus}
              onClick={() => {
                setTab("log");
                setShowForm(true);
              }}
            >
              Log absence
            </BtnPrimary>
          </div>
        </nav>

        {/* ── Main ── */}
        <main className="flex-1 min-w-0 pb-4">
          {/* Mobile nav */}
          <div className="md:hidden flex gap-2 overflow-x-auto mt-4 pb-1">
            {NAV.map((n) => (
              <NavChip key={n.id} item={n} active={tab === n.id} badge={badges[n.badge] || 0} onClick={() => setTab(n.id)} />
            ))}
          </div>

          {/* KPI scorecard */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            <KPI label="Total hours lost" value={fmtMin(hoursLost)} icon={Clock3} tone={hoursLost ? P.brick : P.green} />
            <KPI
              label="Pending triage review"
              value={pendingReview.length}
              icon={Inbox}
              tone={pendingReview.length ? P.petrol : P.green}
              onClick={() => setTab("triage")}
            />
            <KPI
              label="Active escalations"
              value={activeEscalations}
              icon={TriangleAlert}
              tone={activeEscalations ? P.amber : P.green}
              onClick={() => setTab("approvals")}
            />
            <KPI label="Deduction pool" value={`${deductionPool}d`} icon={Scale} tone={deductionPool ? P.ink : P.green} />
          </div>

          <div className="mt-4">
            {showEmpty ? (
              <EmptyState
                onLog={() => {
                  setTab("log");
                  setShowForm(true);
                }}
                onSamples={loadSamples}
              />
            ) : null}

            {tab === "dashboard" && !empty && (
              <Dashboard entries={scoped} accounts={acc === "All" ? data.accounts : [acc]} escalations={escalations} />
            )}

            {tab === "log" && (
              <div className="grid gap-4">
                {showForm ? (
                  <LogForm data={data} defaultAccount={acc} onAdd={addEntry} onCancel={() => setShowForm(false)} />
                ) : (
                  !empty && (
                    <div>
                      <BtnPrimary icon={Plus} onClick={() => setShowForm(true)}>
                        Log absence
                      </BtnPrimary>
                    </div>
                  )
                )}

                {!empty && (
                  <>
                    <div className="flex items-center gap-2 flex-wrap">
                      {[
                        ["all", "All"],
                        ["review", "Pending review"],
                        ["open", "Open only"],
                      ].map(([f, lbl]) => (
                        <button
                          key={f}
                          onClick={() => setLogFilter(f)}
                          className="ao-disp uppercase tracking-wide font-semibold"
                          style={{
                            fontSize: 11,
                            padding: "3px 10px",
                            borderRadius: 999,
                            cursor: "pointer",
                            border: `1px solid ${logFilter === f ? P.petrol : P.line}`,
                            color: logFilter === f ? "#fff" : P.sub,
                            background: logFilter === f ? P.petrol : "transparent",
                          }}
                        >
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
                        {data.tls.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                      <TInput
                        placeholder="Search agent / ID…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        style={{ width: 170, fontSize: 12.5, padding: "4px 10px", borderRadius: 999 }}
                      />
                      <span className="ao-mono" style={{ fontSize: 11, color: P.sub }}>
                        {visibleLog.length} in view
                      </span>
                    </div>

                    <div className="grid gap-2">
                      {visibleLog.length === 0 && <Muted>Nothing matches these filters.</Muted>}
                      {visibleLog.map((e) => (
                        <EntryCard key={e.id} e={e} tls={data.tls} onPatch={patchEntry} onDelete={deleteEntry} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {tab === "triage" && !empty && (
              <div>
                <SectionTitle count={pendingReview.length}>Pending manager review</SectionTitle>
                <div className="mb-3">
                  <Muted>
                    Nothing here is punitive yet. Assign a manager, write at least 15 characters of context, then
                    escalate into the OPS queue or dismiss and archive.
                  </Muted>
                </div>
                {pendingReview.length === 0 ? (
                  <div className="p-6 text-center" style={{ background: P.card, border: `1px dashed ${P.line}`, borderRadius: 10 }}>
                    <CircleCheck size={22} color={P.green} style={{ margin: "0 auto" }} />
                    <div className="ao-disp font-bold uppercase tracking-wide mt-2" style={{ fontSize: 14, color: P.ink }}>
                      Inbox clear
                    </div>
                    <Muted>Every logged case has been reviewed.</Muted>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {pendingReview.map((e) => (
                      <EntryCard key={e.id} e={e} tls={data.tls} onPatch={patchEntry} onDelete={deleteEntry} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === "approvals" && !empty && (
              <div className="grid gap-5">
                <Queue
                  title="OPS review queue"
                  hint="Escalated cases awaiting operational manager sign-off."
                  rows={pendingOps}
                  tone={P.amber}
                  tls={data.tls}
                  onPatch={patchEntry}
                  onDelete={deleteEntry}
                />
                <Queue
                  title="HR execution queue"
                  hint="OPS-approved cases awaiting HR: wage deductions, warning letters and investigations. Completing one requires an HR case reference."
                  rows={pendingHr}
                  tone={P.brick}
                  tls={data.tls}
                  onPatch={patchEntry}
                  onDelete={deleteEntry}
                />
              </div>
            )}

            {tab === "agents" && !empty && <AgentProfiles entries={data.entries} accounts={data.accounts} />}

            {tab === "dcm" && <DcmEditor dcm={data.dcm} onChange={(d) => update((prev) => ({ ...prev, dcm: d }))} />}

            {tab === "settings" && (
              <SettingsView
                data={data}
                update={update}
                onReset={resetAll}
                onExport={() => downloadCsv(data.entries)}
                onLoadSamples={loadSamples}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ── Chrome pieces ───────────────────────────────────────────────────────── */

function NavItem({ item, active, badge, onClick }) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className="ao-disp uppercase tracking-wide font-semibold flex items-center gap-2 transition"
      style={{
        fontSize: 12.5,
        padding: "9px 12px",
        borderRadius: 8,
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        border: `1px solid ${active ? P.line : "transparent"}`,
        background: active ? P.card : "transparent",
        color: active ? P.ink : P.sub,
      }}
    >
      <Icon size={15} color={active ? P.petrol : P.sub} />
      <span className="flex-1">{item.label}</span>
      {badge > 0 && (
        <span className="ao-mono" style={{ fontSize: 10.5, background: P.brick, color: "#fff", borderRadius: 999, padding: "1px 6px" }}>
          {badge}
        </span>
      )}
    </button>
  );
}

function NavChip({ item, active, badge, onClick }) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className="ao-disp uppercase tracking-wide font-semibold flex items-center gap-1.5"
      style={{
        fontSize: 11.5,
        padding: "6px 10px",
        borderRadius: 999,
        cursor: "pointer",
        whiteSpace: "nowrap",
        border: `1px solid ${active ? P.petrol : P.line}`,
        background: active ? P.petrol : P.card,
        color: active ? "#fff" : P.sub,
      }}
    >
      <Icon size={12} />
      {item.label}
      {badge > 0 && (
        <span className="ao-mono" style={{ fontSize: 10, background: active ? "#fff" : P.brick, color: active ? P.petrol : "#fff", borderRadius: 999, padding: "0 5px" }}>
          {badge}
        </span>
      )}
    </button>
  );
}

function KPI({ label, value, icon: Icon, tone, onClick }) {
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === "Enter" || e.key === " ") && onClick() : undefined}
      className="p-3"
      style={{ background: P.card, border: `1px solid ${P.line}`, borderRadius: 10, cursor: onClick ? "pointer" : "default" }}
    >
      <div className="flex items-center gap-2">
        <Icon size={13} color={tone || P.sub} />
        <div className="ao-mono font-semibold" style={{ fontSize: 22, color: tone || P.ink, lineHeight: 1 }}>
          {value}
        </div>
      </div>
      <div className="ao-disp uppercase tracking-wider font-semibold mt-1" style={{ fontSize: 10.5, color: P.sub }}>
        {label}
      </div>
    </div>
  );
}

function SaveBadge({ state }) {
  const err = state === "error";
  return (
    <div className="flex items-center gap-2" title={err ? "Changes cannot be written to this browser's storage" : "Saved to this browser"}>
      {err ? <CircleAlert size={12} color={P.brick} /> : <span style={{ width: 8, height: 8, borderRadius: 999, background: P.green, display: "inline-block" }} />}
      <span className="ao-mono" style={{ fontSize: 11, color: err ? "#E8A79C" : "#8FA6A9" }}>
        {err ? "Storage unavailable" : "Saved"}
      </span>
    </div>
  );
}

function Queue({ title, hint, rows, tone, tls, onPatch, onDelete }) {
  return (
    <div>
      <SectionTitle count={rows.length} tone={tone}>
        {title}
      </SectionTitle>
      <div className="mb-3">
        <Muted>{hint}</Muted>
      </div>
      {rows.length === 0 ? (
        <div className="p-5 text-center" style={{ background: P.card, border: `1px dashed ${P.line}`, borderRadius: 10 }}>
          <CircleCheck size={18} color={P.green} style={{ margin: "0 auto" }} />
          <Muted>Clear — nothing waiting here.</Muted>
        </div>
      ) : (
        <div className="grid gap-2">
          {rows.map((e) => (
            <EntryCard key={e.id} e={e} tls={tls} onPatch={onPatch} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ onLog, onSamples }) {
  return (
    <div className="p-8 text-center" style={{ background: P.card, border: `1px dashed ${P.line}`, borderRadius: 12 }}>
      <div className="ao-disp font-bold uppercase tracking-wide" style={{ fontSize: 18, color: P.ink }}>
        No absences logged yet
      </div>
      <div className="mt-2 mx-auto" style={{ fontSize: 13.5, color: P.sub, maxWidth: 470 }}>
        Log the first case: the matrix prescribes the action, a TL or direct manager escalates or dismisses it with a
        comment, and the case is routed through OPS and HR confirmation.
      </div>
      <div className="flex gap-3 justify-center flex-wrap mt-5">
        <BtnPrimary onClick={onLog} icon={Plus}>
          Log first absence
        </BtnPrimary>
        <BtnGhost onClick={onSamples}>Load sample data</BtnGhost>
      </div>
    </div>
  );
}
