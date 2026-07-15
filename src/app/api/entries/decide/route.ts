/* POST /api/entries/decide — triage rulings, single or bulk.
   Escalation finalizes the verdict: engine.decideCases re-runs the matrix per
   case oldest-first against the live ledger, so same-batch recurrences chain
   (1st -> 2nd) and the caps settle across the result. */

import { NextResponse } from "next/server";
import { requireRole, guarded, GuardError } from "@/lib/api-guard";
import { loadEntries, syncEntries, writeAudit } from "@/lib/db";
import { decideCases } from "@/lib/engine.js";

export const POST = guarded(async (req: Request) => {
  const actor = await requireRole("triage");
  const body = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
  const stage = body.stage === "active" ? "active" : body.stage === "dismissed" ? "dismissed" : null;
  const assignee = String(body.assignee || "");
  const comment = String(body.comment || "").trim();

  if (!ids.length) throw new GuardError(400, "No case ids supplied.");
  if (!stage) throw new GuardError(400, "stage must be active or dismissed.");
  if (comment.length < 15) throw new GuardError(400, "A review comment of at least 15 characters is required.");
  if (stage === "active" && !assignee) throw new GuardError(400, "Escalation needs an assignee.");

  const before = await loadEntries();
  const known = new Set(before.filter((e) => e.stage === "review").map((e) => e.id));
  const missing = ids.filter((id) => !known.has(id));
  if (missing.length) throw new GuardError(409, `Not pending review: ${missing.join(", ")}.`);

  const dcm = await loadDcm();
  const decided = decideCases(before, ids, stage, { by: actor.name, assignee, comment }, dcm);
  const entries = await syncEntries(before, decided);

  await writeAudit({
    actor,
    action: "CASE_DECIDED",
    summary: `${stage === "active" ? "Escalated" : "Dismissed"} ${ids.length} case(s): ${comment}`,
    caseId: ids.length === 1 ? ids[0] : null,
    meta: { ids, stage, assignee },
  });

  return NextResponse.json({ entries });
});

async function loadDcm() {
  const { prisma } = await import("@/lib/prisma");
  return prisma.dcmRule.findMany({ orderBy: { sort: "asc" } });
}
