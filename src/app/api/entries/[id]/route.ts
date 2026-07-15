/* PATCH /api/entries/:id — pipeline updates on one case (notify, OPS confirm,
   HR execution, assignee, comments). DELETE — SuperAdmin only.
   Every write re-settles deduction caps and re-checks whether the case just
   became Closed and now owes the agent an acknowledgement. */

import { NextResponse } from "next/server";
import { requireRole, guarded, GuardError } from "@/lib/api-guard";
import { loadEntries, syncEntries, writeAudit, type Entry } from "@/lib/db";

export const PATCH = guarded(async (req: Request) => {
  const actor = await requireRole("caseWrite");
  const id = req.url.split("/").pop()!;
  const entry: Entry = (await req.json().catch(() => ({}))).entry;
  if (!entry || entry.id !== id) throw new GuardError(400, "Body must carry the entry with a matching id.");

  const before = await loadEntries();
  const existing = before.find((e) => e.id === id);
  if (!existing) throw new GuardError(404, "Case not found.");

  // The signature block is written only by the acknowledge endpoint —
  // whatever the client sent for it is discarded.
  const preserved = {
    requiresAcknowledgement: existing.requiresAcknowledgement,
    agentAcknowledgedAt: existing.agentAcknowledgedAt,
    agentSignature: existing.agentSignature,
  };

  const entries = await syncEntries(
    before,
    before.map((e) => (e.id === id ? { ...entry, ...preserved } : e))
  );

  await writeAudit({
    actor,
    action: "CASE_UPDATED",
    summary: `Updated case ${id} (${existing.violation}, ${existing.date}).`,
    caseId: id,
  });

  return NextResponse.json({ entries });
});

export const DELETE = guarded(async (req: Request) => {
  const actor = await requireRole("delete");
  const id = req.url.split("/").pop()!;

  const before = await loadEntries();
  const existing = before.find((e) => e.id === id);
  if (!existing) throw new GuardError(404, "Case not found.");

  const entries = await syncEntries(before, before.filter((e) => e.id !== id));

  await writeAudit({
    actor,
    action: "CASE_DELETED",
    summary: `Deleted case ${id} (${existing.violation} · ${existing.email || existing.empId} · ${existing.date}).`,
    caseId: id,
    meta: { violation: existing.violation, date: existing.date },
  });

  return NextResponse.json({ entries });
});
