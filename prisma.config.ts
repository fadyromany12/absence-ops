// Prisma 7 project config — the CLI (migrate, db push, studio) reads the
// connection URL from here; the runtime client gets it via the PrismaPg
// adapter in src/lib/prisma.ts. Both come from .env's DATABASE_URL.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    seed: "node prisma/seed.mjs",
  },
});
