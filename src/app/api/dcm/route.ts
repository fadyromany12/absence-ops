/* PUT /api/dcm — replace the Disciplinary Consequences Matrix. SuperAdmin only:
   these rows drive every verdict from the next keystroke on. */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, guarded, GuardError } from "@/lib/api-guard";

type RuleIn = {
  id: string;
  name: string;
  severity: string;
  a1?: string; e1?: string; a2?: string; e2?: string; a3?: string; e3?: string;
};

export const PUT = guarded(async (req: Request) => {
  const actor = await requireRole("admin");
  const body = await req.json().catch(() => ({}));
  const rules: RuleIn[] = Array.isArray(body.dcm) ? body.dcm : [];

  if (!rules.length) throw new GuardError(400, "The matrix cannot be emptied.");
  for (const r of rules) {
    if (!r.id || !r.name || !r.severity) throw new GuardError(400, "Every rule needs id, name and severity.");
  }

  await prisma.$transaction([
    prisma.dcmRule.deleteMany(),
    prisma.dcmRule.createMany({
      data: rules.map((r, i) => ({
        id: r.id,
        name: r.name,
        severity: r.severity,
        a1: r.a1 || "", e1: r.e1 || "",
        a2: r.a2 || "", e2: r.e2 || "",
        a3: r.a3 || "", e3: r.e3 || "",
        sort: i,
      })),
    }),
  ]);

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: "DCM_UPDATED",
      summary: `Matrix replaced — ${rules.length} rules.`,
    },
  });

  const dcm = await prisma.dcmRule.findMany({ orderBy: { sort: "asc" } });
  return NextResponse.json({ dcm });
});
