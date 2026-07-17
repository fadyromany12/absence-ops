/* GET /api/audit — read the immutable system log, newest first.
   SuperAdmin and HR Business Partner only. Read-only by design: there is no
   update or delete surface for audit rows anywhere in the API. */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, guarded } from "@/lib/api-guard";

export const GET = guarded(async (req: Request) => {
  await requireRole("audit");

  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 300, 1), 1000);

  const rows = await prisma.auditLog.findMany({
    orderBy: { at: "desc" },
    take: limit,
    select: { id: true, at: true, actorName: true, actorRole: true, action: true, caseId: true, summary: true },
  });

  return NextResponse.json({
    audit: rows.map((r) => ({ ...r, at: r.at.getTime() })),
  });
});
