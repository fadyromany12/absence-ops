/* The agent route group: only the Agent role gets past this layout. Staff
   roles are bounced to their workspace, the signed-out to login, and unset
   default passwords to the change screen. */

import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { UserRound } from "lucide-react";
import { GlassBadge } from "@/components/glass";
import SignOutButton from "@/components/portal/SignOutButton";
import Logo from "@/components/Logo";

export default async function AgentPortalLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.mustChange) redirect("/change-password");
  if (session.user.role !== "Agent") redirect("/workspace");

  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl px-4 pb-16">
      <header className="flex flex-wrap items-center gap-3 py-6">
        <Logo size={32} subtitle="Agent self-service portal" />
        <span className="flex-1" />
        <GlassBadge tone="violet">
          <UserRound size={11} />
          {session.user.name}
        </GlassBadge>
        <SignOutButton />
      </header>
      {children}
    </div>
  );
}
