import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

if (existsSync(".env")) {
  process.loadEnvFile();
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // process.env instead of Prisma's env() helper so `prisma generate` also works
    // where DATABASE_URL is not set (for example during a Docker build).
    url: process.env.DATABASE_URL,
  },
});
