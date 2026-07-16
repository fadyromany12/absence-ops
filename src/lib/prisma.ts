/* Prisma client singleton.

   Cached on globalThis in every environment, for two different reasons:
   in dev, hot-reload re-evaluates modules and would leak a pool per reload;
   on serverless, a warm container reuses module scope, and a fresh pool per
   invocation would exhaust the database's connection limit under load.

   The pool is deliberately tiny. Each serverless instance only ever serves one
   request at a time, so a handful of sockets per instance is plenty — and with
   dozens of instances alive, a large per-instance pool is how you take a
   Postgres down. Point DATABASE_URL at a pooled (pgbouncer) endpoint in
   production and this stays comfortable. */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const connectionString = process.env.DATABASE_URL;

function createClient() {
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set — the app cannot reach its database.");
  }
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString,
      max: process.env.VERCEL ? 3 : 10,
      // Hosted Postgres (Neon, Supabase, RDS) terminates idle clients; recycle
      // before they do, so a warm lambda never picks up a dead socket.
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    }),
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

globalForPrisma.prisma = prisma;
