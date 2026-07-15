# Absence Ops

Full-stack BPO workforce & compliance for Konecta GDC accounts (Lenovo, Hertz, Beko): daily absence
logging, RTA bulk imports, a rule-driven Disciplinary Consequences Matrix, multi-tier approvals with
Egyptian-labour-law deduction capping, an append-only audit log — and an agent self-service portal
where finalized disciplinary actions are digitally acknowledged and signed.

**Stack:** Next.js (App Router) · PostgreSQL via Prisma 7 · NextAuth v5 (JWT credentials) ·
Tailwind 4 · a pure, framework-free rules engine shared by the server, the client and the tests.

## Quick start

```bash
npm install
cp .env.example .env       # set DATABASE_URL and a generated AUTH_SECRET

npm run db                 # private PostgreSQL 18 cluster in .pgdata (port 5544)*
npm run db:push            # create the schema
npm run db:seed            # roles, the 35-rule DCM, demo ledger

npm run dev                # http://localhost:3000
```

\* `npm run db` uses the binaries of an installed PostgreSQL (default
`C:\Program Files\PostgreSQL\18\bin`, override with `PGBIN`). Any Postgres you already run works
too — just point `DATABASE_URL` at it and skip `npm run db`.

### Demo accounts

Every seeded account signs in with `Welcome@123` and is forced to set its own password on first
login.

| Email | Role | Lands on |
| --- | --- | --- |
| fady.bekhet@konecta.com | Super Admin | workspace (all tabs) |
| salma.elhadad@konecta.com | WFM | workspace (RTA upload only) |
| ibrahim.kamel@konecta.com | Project Manager | workspace (log + triage) |
| mohamed.rashad@konecta.com | Operations Lead | workspace (approvals) |
| abdallah.ismail@konecta.com | HR Business Partner | workspace (HR execution) |
| nour.said@demo.konecta · karim.adel@demo.konecta · dina.samy@demo.konecta | Agent | self-service portal |

## How a case moves

```
RTA import / manual log ─► Pending Review ─► Escalated ─► OPS confirm ─► HR execution ─► Closed
                              (triage gate)                              (HR case ref)      │
                                   │                                                        ▼
                                   └─► Dismissed (archived, no consequences)    requiresAcknowledgement
                                                                                            │
                                                                          agent portal: read, tick the
                                                                          statement, sign full name
                                                                                            │
                                                                          agentAcknowledgedAt stamped +
                                                                          immutable AuditLog row
```

- **Verdicts are provisional until escalation** — `decideCases` re-runs the matrix oldest-first at
  the moment a PM escalates, so two NCNS in one upload chain 1st → 2nd.
- **90-day reset** — warnings expire 90 days after the previous occurrence; the count is a chain,
  not a window.
- **Deduction caps** — 5 days per incident, 5 per agent per calendar month (Labour Law No. 12/2003
  am. 14/2025); the ledger re-settles on every write.
- **Emergency leave** — 6 days/year, max 2 consecutive/month; excess reclassifies to unauthorised
  absence.
- **Compensable hours** — fully-compensated RTA rows auto-acknowledge and never reach triage.
- **Digital acknowledgement** — write-once: a signed case can never be re-signed, ownership is
  enforced by employee ID/email, and the signature lands in the audit log in the same transaction.

## Layout

```
prisma/            schema.prisma (User/Case/DcmRule/AppConfig/AuditLog) + seed
src/auth.ts        NextAuth v5 (credentials, JWT, role/empId/mustChange claims)
src/app/           login, change-password, workspace (staff), agent-portal (Agent role),
                   api/ (entries, decide, dcm, config, users, cases/acknowledge, admin/reset)
src/components/    glass/ (GlassCard, GlassModal, GlassButton, …) · portal/ (AckCenter) ·
                   the staff views (Workspace, TriageGate, RtaUploader, …)
src/lib/           the pure rules engine (engine, deductions, compensation, rta, identity, agents)
                   + prisma/db/api-guard/passwords glue
scripts/devdb.mjs  private dev Postgres controller
test/              engine.test.mjs (73 unit) · e2e.mjs (34 HTTP acceptance, mutates seed data)
```

```bash
npm test           # rules-engine suite — no server or database needed
npm run test:e2e   # full HTTP acceptance — needs the seeded DB + running server
```

> ⚠ **Demo credentials are public by design** while this repo is in development. The auth is real
> (bcrypt + JWT sessions) but the seeded passwords above are documented here, so never deploy this
> seed to anything internet-facing, and never reuse a real password in it.
