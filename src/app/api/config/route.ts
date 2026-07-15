/* PUT /api/config — the accounts and team-lead lists. SuperAdmin only. */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, guarded, GuardError } from "@/lib/api-guard";

export const PUT = guarded(async (req: Request) => {
  const actor = await requireRole("admin");
  const body = await req.json().catch(() => ({}));
  const accounts: string[] = Array.isArray(body.accounts) ? body.accounts.map(String) : [];
  const tls: string[] = Array.isArray(body.tls) ? body.tls.map(String) : [];
  if (!accounts.length) throw new GuardError(400, "At least one account is required.");

  await prisma.appConfig.upsert({
    where: { id: 1 },
    create: { id: 1, accounts, tls },
    update: { accounts, tls },
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: "CONFIG_UPDATED",
      summary: `Config updated — ${accounts.length} accounts, ${tls.length} TLs.`,
    },
  });

  return NextResponse.json({ accounts, tls });
});
