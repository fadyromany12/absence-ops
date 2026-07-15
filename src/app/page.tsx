/* Role router: agents to their portal, staff to the workspace, everyone else
   to the login screen. */

import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.mustChange) redirect("/change-password");
  redirect(session.user.role === "Agent" ? "/agent-portal" : "/workspace");
}
