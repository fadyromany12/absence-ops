/* The agent route group: only the Agent role gets past this layout. Staff
   roles are bounced to their workspace, the signed-out to login, and unset
   default passwords to the change screen. */

import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { UserRound } from "lucide-react";
import { GlassBadge } from "@/components/glass";
import SignOutButton from "@/components/portal/SignOutButton";

export default async function AgentPortalLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.mustChange) redirect("/change-password");
  if (session.user.role !== "Agent") redirect("/workspace");

  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl px-4 pb-16">
      <header className="flex flex-wrap items-center gap-3 py-6">
        <div className="relative h-8 w-8 rounded-lg bg-emerald-500/80 shadow-[0_0_24px_rgba(16,185,129,0.5)]">
          <div className="absolute right-1 top-1 h-1.5 w-1.5 rounded-sm bg-amber-400" />
        </div>
        <div className="min-w-0">
          <div className="text-lg font-bold uppercase tracking-[0.18em] text-slate-100" style={{ fontFamily: "Barlow Semi Condensed" }}>
            Absence Ops
          </div>
          <div className="text-[11px] text-slate-400">Agent self-service portal</div>
        </div>
        <span className="flex-1" />
        <GlassBadge tone="emerald">
          <UserRound size={11} />
          {session.user.name}
        </GlassBadge>
        <SignOutButton />
      </header>
      {children}
    </div>
  );
}
