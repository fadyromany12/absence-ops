/* POST /api/users — provision a user (SuperAdmin). New accounts get the
   default password and must change it at first login. Never returns hashes. */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, guarded, GuardError } from "@/lib/api-guard";
import { hashPassword, DEFAULT_PASSWORD } from "@/lib/passwords";
import { ROLES } from "@/lib/auth.js";
import { publicUser } from "@/lib/users-public";

export const POST = guarded(async (req: Request) => {
  const actor = await requireRole("admin");
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const role = String(body.role || "");
  const empId = String(body.empId || "").trim().toUpperCase() || null;

  if (!name) throw new GuardError(400, "A name is required.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new GuardError(400, "That doesn't look like an email address.");
  if (!ROLES.includes(role)) throw new GuardError(400, "Unknown role.");
  if (role === "Agent" && !empId) throw new GuardError(400, "Agent accounts need an employee ID to link their case history.");
  if (await prisma.user.findUnique({ where: { email } })) throw new GuardError(409, "A user with that email already exists.");

  const user = await prisma.user.create({
    data: { name, email, role: role as never, empId, passHash: hashPassword(DEFAULT_PASSWORD), mustChange: true },
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id, actorName: actor.name, actorRole: actor.role,
      action: "USER_CREATED",
      summary: `Created ${role} account for ${name} <${email}>.`,
    },
  });

  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({ users: users.map(publicUser) });
});
