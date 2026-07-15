/* POST /api/entries — log cases: a single manual entry or an RTA batch.
   The server is authoritative: verdicts land as sent (they were computed by
   the same shared engine), but the whole ledger re-settles its deduction caps
   before anything is stored. */

import { NextResponse } from "next/server";
import { requireRole, guarded, GuardError } from "@/lib/api-guard";
import { loadEntries, syncEntries, writeAudit, type Entry } from "@/lib/db";

export const POST = guarded(async (req: Request) => {
  const body = await req.json().catch(() => ({}));
  const incoming: Entry[] = Array.isArray(body.entries) ? body.entries : body.entry ? [body.entry] : [];
  const fromRta = body.source === "rta";
  const actor = await requireRole(fromRta ? "upload" : "log");

  if (!incoming.length) throw new GuardError(400, "No entries supplied.");
  for (const e of incoming) {
    if (!e.id || !e.date || !e.violation || !e.account) {
      throw new GuardError(400, "Each entry needs id, date, account and violation.");
    }
  }

  const before = await loadEntries();
  const ids = new Set(before.map((e) => e.id));
  const fresh = incoming.filter((e) => !ids.has(e.id));
  const entries = await syncEntries(before, [...fresh, ...before]);

  await writeAudit({
    actor,
    action: fromRta ? "RTA_IMPORTED" : "CASE_CREATED",
    summary: fromRta
      ? `RTA import committed ${fresh.length} case(s).`
      : `Logged ${fresh.map((e) => `${e.violation} (${e.date})`).join(", ")}.`,
    caseId: fresh.length === 1 ? fresh[0].id : null,
    meta: { count: fresh.length },
  });

  return NextResponse.json({ entries });
});
