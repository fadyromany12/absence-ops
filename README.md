# Absence Ops

A BPO workforce & compliance tracker for Konecta GDC accounts (Lenovo, Hertz, Beko): daily absence
logging, RTA bulk imports, a rule-driven Disciplinary Consequences Matrix, multi-tier approvals, and
Egyptian-labor-law-aware deduction capping. Frontend-only — everything persists to the browser's
`localStorage`.

## Quick start

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # rules-engine test suite (node, no framework)
npm run build   # production bundle in dist/
```

Sign in with a demo account (all start on the default password `Welcome@123` and force a change at
first login):

| Email | Role |
| --- | --- |
| fady.bekhet@konecta.com | Super Admin — everything, incl. DCM editor, users, settings |
| salma.elhadad@konecta.com | WFM — RTA bulk upload only |
| ibrahim.kamel@konecta.com | Project Manager — daily log + triage gate |
| mohamed.rashad@konecta.com | Operations Lead — dashboards + OPS approvals |
| abdallah.ismail@konecta.com | HR Business Partner — HR execution queue |

> ⚠ **The authentication is a mock.** Users, salted toy-hashes and the JWT-shaped session token all
> live in `localStorage` of your own browser. It demonstrates the RBAC flows; it secures nothing.
> Never reuse a real password here, and never copy `src/lib/auth.js` into anything with a backend.

## How a case moves

```
RTA import / manual log ──► Pending Review (triage gate) ──► Escalated ──► OPS confirm ──► HR execution ──► Closed
                                   │                                                        (needs HR case ref)
                                   └──► Dismissed (archived; excluded from metrics, occurrences and deductions)
```

- **Verdicts are provisional until escalation.** The occurrence number shown at logging time ignores
  cases still waiting at triage; when a PM escalates (singly or in bulk), each case is re-verdicted
  oldest-first against the ledger as it stands, so two NCNS in one upload chain 1st → 2nd.
- **90-day reset** — warnings expire 90 days after the previous occurrence of the same violation;
  the count is a chain, not a fixed window.
- **Deduction caps** — max 5 days per incident and 5 days per agent per calendar month (Labour Law
  No. 12/2003 as amended by 14/2025). The matrix's figure stays on the letter; payroll gets the
  capped figure; the ledger re-settles whenever history changes.
- **Emergency leave** — 6 days/year, max 2 consecutive/month; excess is reclassified as
  Unauthorised absence and runs through the matrix.
- **Compensable hours** — RTA rows whose lost time is fully compensated are auto-acknowledged and
  never reach triage; partial compensation shrinks the recorded lost time.

## RTA import format

CSV or tab-separated, any of these headers (order-free, fuzzy-matched, including the production
sheet's own `Hours can be compenstaed` typo):

```
LOB, Date, Employee Name, Employee ID, Shift Start, Shift End, Status,
Executor Name, Tardy, Missing Hours, Early Departure, Hours can be compenstaed, Status / Violation
```

Durations accept `H:MM` or decimal hours; dates accept ISO or `DD/MM/YYYY`. A downloadable template
lives on the RTA Upload tab. Excel workbooks must be exported to CSV first.

## Layout

```
src/
  lib/        pure rules: engine (verdicts, 90-day chains, escalation flags, decideCases),
              deductions (labour-law caps + ledger settlement), compensation, rta (parser),
              identity (agents match on empId OR email), auth (mock RBAC), storage (migrations)
  components/ one file per view; ui/ holds the shared primitives
  hooks/      useLocalStorage
test/         engine.test.mjs — run with `npm test`
```

Data migrates forward automatically (`DATA_VERSION` in `src/lib/constants.js`); a hard reset lives
in Settings (Super Admin only).
