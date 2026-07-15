/* POST /api/entries/samples — inject the demo ledger on top of existing data
   (SuperAdmin). The full factory reset lives at /api/admin/reset. */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, guarded } from "@/lib/api-guard";
import { loadEntries, syncEntries, writeAudit } from "@/lib/db";
import { buildSamples } from "@/lib/samples.js";

export const POST = guarded(async () => {
  const actor = await requireRole("admin");

  const [config, dcm] = await Promise.all([
    prisma.appConfig.findUnique({ where: { id: 1 } }),
    prisma.dcmRule.findMany({ orderBy: { sort: "asc" } }),
  ]);
  const tls = (config?.tls as string[]) ?? [];

  const before = await loadEntries();
  const samples = buildSamples(tls, dcm);
  const entries = await syncEntries(before, [...samples, ...before]);

  await writeAudit({
    actor,
    action: "CASE_CREATED",
    summary: `Loaded ${samples.length} sample cases.`,
    meta: { sample: true, count: samples.length },
  });

  return NextResponse.json({ entries });
});
