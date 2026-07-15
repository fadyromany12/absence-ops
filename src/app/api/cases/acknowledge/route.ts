/* POST /api/cases/acknowledge — the digital signature.

   An Agent confirms they have read and understood a finalized disciplinary
   action. The stamp is write-once: a case that already carries
   agentAcknowledgedAt can never be re-signed, and the paired AuditLog row is
   the immutable system-of-record for the event. Both writes happen in one
   transaction — a signature without its audit trail must be impossible. */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, guarded, GuardError } from "@/lib/api-guard";

export const POST = guarded(async (req: Request) => {
  const actor = await requireRole("acknowledge"); // Agent only

  const body = await req.json().catch(() => ({}));
  const caseId = String(body.caseId || "");
  const signature = String(body.signature || "").trim().replace(/\s+/g, " ");
  const accepted = body.accepted === true;

  if (!caseId) throw new GuardError(400, "caseId is required.");
  if (!accepted) throw new GuardError(400, "You must confirm you have read and understood the Disciplinary Matrix.");
  if (signature.length < 5 || !signature.includes(" ")) {
    throw new GuardError(400, "Type your full legal name (first and last) to sign.");
  }

  const row = await prisma.case.findUnique({ where: { id: caseId } });
  if (!row) throw new GuardError(404, "Case not found.");

  // Ownership: the case must belong to the signed-in agent by employee ID or
  // email. Never let one agent sign another's warning.
  const me = await prisma.user.findUnique({ where: { id: actor.id } });
  if (!me) throw new GuardError(401, "Not signed in.");
  const owns =
    (row.empId && me.empId && row.empId.toLowerCase() === me.empId.toLowerCase()) ||
    (row.email && row.email.toLowerCase() === me.email.toLowerCase());
  if (!owns) throw new GuardError(403, "This case does not belong to you.");

  if (!row.requiresAcknowledgement) throw new GuardError(409, "This case does not require acknowledgement.");
  if (row.agentAcknowledgedAt) throw new GuardError(409, "This case has already been acknowledged.");

  const now = new Date();
  const activity = Array.isArray(row.activity) ? row.activity : [];

  const [updated] = await prisma.$transaction([
    prisma.case.update({
      where: { id: caseId },
      data: {
        agentAcknowledgedAt: now,
        agentSignature: signature,
        activity: [
          ...activity,
          {
            at: now.getTime(),
            by: me.name,
            type: "acknowledged",
            text: `Digitally acknowledged — signed “${signature}”.`,
          },
        ],
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: me.id,
        actorName: me.name,
        actorRole: me.role,
        action: "CASE_ACKNOWLEDGED",
        caseId,
        summary: `${me.name} digitally acknowledged “${row.action}” for ${row.violation} (${row.date}).`,
        meta: {
          signature,
          violation: row.violation,
          actionPrescribed: row.action,
          occurrence: row.occurrence,
          caseDate: row.date,
          statement: "I have read and understood the Disciplinary Matrix",
        },
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    caseId: updated.id,
    agentAcknowledgedAt: updated.agentAcknowledgedAt,
  });
});
