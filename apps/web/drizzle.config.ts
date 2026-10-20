import { defineConfig } from "drizzle-kit";
// Config imports must stay free of environment-file reads for static tooling.
// Database commands explicitly load their environment before importing this file.

let databaseUrl = process.env.DATABASE_URL || "";
if (databaseUrl.startsWith("DATABASE_URL=")) {
  databaseUrl = databaseUrl.substring("DATABASE_URL=".length);
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  schemaFilter: ["public"],
  ...(databaseUrl ? { dbCredentials: { url: databaseUrl } } : {}),
});
