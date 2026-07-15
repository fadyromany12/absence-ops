/* POST /api/admin/reset — factory reset (SuperAdmin). Wipes every table and
   reseeds the demo baseline. The one sanctioned exception to AuditLog
   immutability, and it logs itself as the first row of the new history. */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, guarded } from "@/lib/api-guard";
import { seedAll } from "@/lib/seed-core.mjs";

export const POST = guarded(async () => {
  const actor = await requireRole("admin");
  const result = await seedAll(prisma, { actorName: actor.name, actorRole: actor.role });
  // Seeded users carry fresh ids — every existing session is now orphaned and
  // the client must sign in again.
  return NextResponse.json({ ok: true, ...result });
});
