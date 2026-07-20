/* NextAuth v5 — credentials provider over the Prisma user table, JWT sessions.
   The token carries id / role / empId / mustChange so layouts and API routes
   can authorize without a DB round-trip; sensitive checks still re-read the DB. */

import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/passwords";
import { loginLimiter } from "@/lib/rate-limit.js";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      empId: string | null;
      mustChange: boolean;
    } & DefaultSession["user"];
  }
  interface User {
    role?: string;
    empId?: string | null;
    mustChange?: boolean;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (creds) => {
        const email = String(creds?.email || "").trim().toLowerCase();
        const password = String(creds?.password || "");
        if (!email || !password) return null;

        // Throttle before touching the DB — a locked-out identifier costs no
        // bcrypt work and no query. Keyed by email; a success clears the count.
        if (loginLimiter.status(email).blocked) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.active || !verifyPassword(password, user.passHash)) {
          loginLimiter.fail(email);
          return null;
        }
        loginLimiter.succeed(email);
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          empId: user.empId,
          mustChange: user.mustChange,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.uid = user.id;
        token.role = user.role;
        token.empId = user.empId ?? null;
        token.mustChange = user.mustChange ?? false;
      }
      // Client calls update() after the forced password change so the session
      // reflects it without a re-login.
      if (trigger === "update" && session?.mustChange === false) token.mustChange = false;
      return token;
    },
    session({ session, token }) {
      session.user.id = token.uid as string;
      session.user.role = token.role as string;
      session.user.empId = (token.empId as string | null) ?? null;
      session.user.mustChange = Boolean(token.mustChange);
      return session;
    },
  },
});
