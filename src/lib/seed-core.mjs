/* Shared seeding core — used by `prisma db seed` and by the SuperAdmin
   factory-reset endpoint, so both produce byte-identical baselines. */

import bcrypt from "bcryptjs";
import { DEFAULT_DCM } from "./dcm.js";
import { DEFAULT_ACCOUNTS, DEFAULT_TLS } from "./constants.js";
import { DEFAULT_PASSWORD } from "./auth.js";
import { buildSamples } from "./samples.js";
import { settleDeductions } from "./deductions.js";
import { statusOf } from "./engine.js";

export const SEED_USERS = [
  { name: "Fady Bekhet", email: "fady.bekhet@konecta.com", role: "SuperAdmin" },
  { name: "Salma Elhadad", email: "salma.elhadad@konecta.com", role: "WFM" },
  { name: "Ibrahim Kamel", email: "ibrahim.kamel@konecta.com", role: "ProjectManager" },
  { name: "Mohamed Rashad", email: "mohamed.rashad@konecta.com", role: "OperationsLead" },
  { name: "Abdallah Ismail", email: "abdallah.ismail@konecta.com", role: "HRBusinessPartner" },
  // Agent logins map to their case history via empId/email.
  { name: "Nour Said", email: "nour.said@demo.konecta", role: "Agent", empId: "EG0412" },
  { name: "Karim Adel", email: "karim.adel@demo.konecta", role: "Agent", empId: "EG0388" },
  { name: "Dina Samy", email: "dina.samy@demo.konecta", role: "Agent", empId: "EG0533" },
];

function toRow(e) {
  const { createdAt, resetOn, ...rest } = e;
  return {
    ...rest,
    lob: e.lob || "",
    agentName: e.agentName || "",
    executorName: e.executorName || "",
    tardyMin: e.tardyMin || 0,
    earlyMin: e.earlyMin || 0,
    compMin: e.compMin || 0,
    occurrence: e.occurrence ?? null,
    severity: e.severity ?? null,
    activity: e.activity || [],
    hrRef: e.hrRef || "",
    createdAt: new Date(createdAt || Date.now()),
  };
}

/** Wipes every app table and reseeds. Returns a summary for logging. */
export async function seedAll(prisma, { actorName = "system", actorRole = "SuperAdmin" } = {}) {
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.case.deleteMany(),
    prisma.dcmRule.deleteMany(),
    prisma.appConfig.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const passHash = bcrypt.hashSync(DEFAULT_PASSWORD, 10);
  await prisma.user.createMany({ data: SEED_USERS.map((u) => ({ ...u, passHash, mustChange: true })) });
  await prisma.dcmRule.createMany({ data: DEFAULT_DCM.map((r, i) => ({ ...r, sort: i })) });
  await prisma.appConfig.create({ data: { id: 1, accounts: DEFAULT_ACCOUNTS, tls: DEFAULT_TLS } });

  const entries = settleDeductions(buildSamples(DEFAULT_TLS, DEFAULT_DCM));
  const rows = entries.map((e) => ({
    ...toRow(e),
    // Closed disciplinary cases owe the agent a digital acknowledgement.
    requiresAcknowledgement: e.disciplinary && statusOf(e) === "Closed",
  }));
  await prisma.case.createMany({ data: rows });

  const summary = `Database seeded: ${SEED_USERS.length} users, ${DEFAULT_DCM.length} DCM rules, ${rows.length} cases.`;
  await prisma.auditLog.create({
    data: { actorName, actorRole, action: "FACTORY_RESET", summary },
  });

  return { users: SEED_USERS.length, cases: rows.length, pendingAcks: rows.filter((r) => r.requiresAcknowledgement).length, summary };
}
