/* PATCH /api/users/:id — change role or reset password (SuperAdmin).
   DELETE — remove a user; the last SuperAdmin and your own account are
   protected. Audit rows keep actorName even after user deletion (SetNull). */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, guarded, GuardError } from "@/lib/api-guard";
import { hashPassword, DEFAULT_PASSWORD } from "@/lib/passwords";
import { publicUser } from "@/lib/users-public";
import { ROLES } from "@/lib/auth.js";

const idFrom = (req: Request) => req.url.split("/").pop()!;

async function allUsers() {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  return users.map(publicUser);
}

async function guardLastSuperAdmin(targetId: string) {
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw new GuardError(404, "User not found.");
  if (target.role === "SuperAdmin") {
    const supers = await prisma.user.count({ where: { role: "SuperAdmin" } });
    if (supers <= 1) throw new GuardError(409, `${target.name} is the only Super Admin — promote someone else first.`);
  }
  return target;
}

export const PATCH = guarded(async (req: Request) => {
  const actor = await requireRole("admin");
  const id = idFrom(req);
  const body = await req.json().catch(() => ({}));

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw new GuardError(404, "User not found.");

  if (body.reset === true) {
    await prisma.user.update({
      where: { id },
      data: { passHash: hashPassword(DEFAULT_PASSWORD), mustChange: true },
    });
    await prisma.auditLog.create({
      data: {
        actorId: actor.id, actorName: actor.name, actorRole: actor.role,
        action: "USER_UPDATED",
        summary: `Reset ${target.name}'s password to the default.`,
      },
    });
    return NextResponse.json({ users: await allUsers() });
  }

  if (body.role) {
    const role = String(body.role);
    if (!ROLES.includes(role)) throw new GuardError(400, "Unknown role.");
    if (target.role === "SuperAdmin" && role !== "SuperAdmin") await guardLastSuperAdmin(id);
    if (role === "Agent" && !target.empId) {
      throw new GuardError(400, `${target.name} needs an employee ID before becoming an Agent — set one via empId.`);
    }
    await prisma.user.update({ where: { id }, data: { role: role as never } });
    await prisma.auditLog.create({
      data: {
        actorId: actor.id, actorName: actor.name, actorRole: actor.role,
        action: "USER_UPDATED",
        summary: `Changed ${target.name}'s role: ${target.role} → ${role}.`,
      },
    });
    return NextResponse.json({ users: await allUsers() });
  }

  if (body.empId !== undefined) {
    const empId = String(body.empId).trim().toUpperCase() || null;
    await prisma.user.update({ where: { id }, data: { empId } });
    await prisma.auditLog.create({
      data: {
        actorId: actor.id, actorName: actor.name, actorRole: actor.role,
        action: "USER_UPDATED",
        summary: `Set ${target.name}'s employee ID to ${empId || "(none)"}.`,
      },
    });
    return NextResponse.json({ users: await allUsers() });
  }

  throw new GuardError(400, "Nothing to update — send reset, role or empId.");
});

export const DELETE = guarded(async (req: Request) => {
  const actor = await requireRole("admin");
  const id = idFrom(req);
  if (id === actor.id) throw new GuardError(409, "You can't delete the account you're signed in with.");
  const target = await guardLastSuperAdmin(id);

  await prisma.user.delete({ where: { id } });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id, actorName: actor.name, actorRole: actor.role,
      action: "USER_DELETED",
      summary: `Deleted ${target.role} account ${target.name} <${target.email}>.`,
    },
  });

  return NextResponse.json({ users: await allUsers() });
});
