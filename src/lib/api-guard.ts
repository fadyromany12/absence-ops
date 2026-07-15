/* One-liner authorization for route handlers: resolve the session, check the
   RBAC permission, hand back a typed actor — or throw a Response the handler
   returns as-is. */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { can } from "./auth.js";

export type Actor = { id: string; name: string; email: string; role: string; empId: string | null };

export class GuardError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function requireRole(perm: string | null): Promise<Actor> {
  const session = await auth();
  const u = session?.user;
  if (!u?.id) throw new GuardError(401, "Not signed in.");
  if (perm && !can({ role: u.role }, perm)) throw new GuardError(403, `Your role (${u.role}) can't do this.`);
  return { id: u.id, name: u.name ?? "", email: u.email ?? "", role: u.role, empId: u.empId ?? null };
}

/** Wraps a handler so GuardError (and anything else) becomes a JSON response. */
export function guarded(handler: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    try {
      return await handler(req);
    } catch (err) {
      if (err instanceof GuardError) return NextResponse.json({ error: err.message }, { status: err.status });
      console.error(err);
      return NextResponse.json({ error: "Internal error." }, { status: 500 });
    }
  };
}
