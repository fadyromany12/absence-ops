/* `npx prisma db seed` entry point — the logic lives in src/lib/seed-core.mjs,
   shared with the SuperAdmin factory-reset endpoint. */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { seedAll } from "../src/lib/seed-core.mjs";
import { DEFAULT_PASSWORD } from "../src/lib/auth.js";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

seedAll(prisma)
  .then((r) => {
    console.log(`${r.summary} (${r.pendingAcks} cases pending acknowledgement)`);
    console.log(`Every account signs in with ${DEFAULT_PASSWORD} and must change it.`);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
