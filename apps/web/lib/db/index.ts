import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let connectionString = process.env.DATABASE_URL;

if (connectionString && connectionString.startsWith("DATABASE_URL=")) {
  connectionString = connectionString.substring("DATABASE_URL=".length);
}

if (!connectionString && process.env.NODE_ENV === "production") {
  console.warn("DATABASE_URL is not set. Database queries will fail.");
}

// Global client caching to prevent exhausting connections in development
let client: postgres.Sql;

if (typeof window === "undefined") {
  if (globalThis.postgresClient) {
    client = globalThis.postgresClient;
  } else {
    client = postgres(connectionString || "", { prepare: false });
    if (process.env.NODE_ENV !== "production") {
      globalThis.postgresClient = client;
    }
  }
} else {
  // Fallback for client side if imported (should not run queries directly on client side anyway)
  client = {} as postgres.Sql;
}

export const db = drizzle(client, { schema });

declare global {
  var postgresClient: postgres.Sql | undefined;
}
export * from "./schema";
