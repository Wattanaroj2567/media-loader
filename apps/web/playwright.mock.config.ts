import { defineConfig, devices } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  testDir: path.join(__dirname, "e2e"),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "node e2e/support/mock-supabase-server.mjs",
      url: "http://localhost:9999/auth/v1/health",
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      command: "node e2e/support/start-mock-dev.mjs",
      url: "http://localhost:3100",
      reuseExistingServer: false,
      timeout: 180000,
    },
  ],
});
