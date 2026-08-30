import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: path.join(__dirname, "e2e"),
  testMatch: "app-shell-prefetch.spec.ts",
  workers: 1,
  retries: 0,
  reporter: "list",
  use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3200" },
  webServer: [
    {
      command: "node e2e/support/mock-supabase-server.mjs",
      url: "http://localhost:9999/auth/v1/health",
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      command: "node e2e/support/start-mock-production.mjs",
      url: "http://localhost:3200",
      reuseExistingServer: true,
      timeout: 180000,
    },
  ],
});
