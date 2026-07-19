import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env.local from the monorepo root directory
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

let databaseUrl = process.env.DATABASE_URL || "";
if (databaseUrl.startsWith("DATABASE_URL=")) {
  databaseUrl = databaseUrl.substring("DATABASE_URL=".length);
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle/migrations", // Store Drizzle migrations locally within apps/web
  dialect: "postgresql",
  schemaFilter: ["public"], // Only introspect and sync the public schema
  dbCredentials: {
    url: databaseUrl,
  },
});
