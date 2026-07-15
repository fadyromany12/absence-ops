/* POST /api/users/change-password — any signed-in user sets their own
   password (this is the forced first-login flow). */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, guarded, GuardError } from "@/lib/api-guard";
import { hashPassword, DEFAULT_PASSWORD, MIN_PASSWORD } from "@/lib/passwords";

export const POST = guarded(async (req: Request) => {
  const actor = await requireRole(null); // any authenticated role
  const body = await req.json().catch(() => ({}));
  const password = String(body.password || "");

  if (password.length < MIN_PASSWORD) throw new GuardError(400, `At least ${MIN_PASSWORD} characters.`);
  if (password === DEFAULT_PASSWORD) throw new GuardError(400, "Pick something other than the default password.");

  await prisma.user.update({
    where: { id: actor.id },
    data: { passHash: hashPassword(password), mustChange: false },
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id, actorName: actor.name, actorRole: actor.role,
      action: "USER_PASSWORD_CHANGED",
      summary: `${actor.name} changed their password.`,
    },
  });

  return NextResponse.json({ ok: true });
});
