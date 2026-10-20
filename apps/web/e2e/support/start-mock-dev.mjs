// Starts an isolated Next.js dev server for e2e tests.
// Points Supabase at the local mock server and uses a separate build dir so
// it never collides with the developer's own running dev server on :3000.
import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Turbopack's persistent cache embeds env values, so a previous run that
// pointed at the real Supabase URL would poison this instance. Always start
// from a clean cache.
rmSync(path.resolve(__dirname, "../../.next-mock"), {
  recursive: true,
  force: true,
});

const PORT = process.env.MOCK_WEB_PORT || "3100";
const MOCK_SUPABASE = `http://localhost:${process.env.MOCK_SUPABASE_PORT || 9999}`;

const pnpmCmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const child = spawn(
  pnpmCmd,
  ["exec", "next", "dev", "--port", PORT, "--hostname", "localhost"],
  {
    stdio: "inherit",
    // On Windows, spawning .cmd wrappers requires a shell.
    shell: process.platform === "win32",
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: MOCK_SUPABASE,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "mock-anon-key",
      // Keep test requests off any API URL configured by the developer.
      NEXT_PUBLIC_FASTAPI_BASE_URL: "http://127.0.0.1:18999",
      NEXT_DIST_DIR: ".next-mock",
    },
  }
);

child.on("exit", (code) => process.exit(code ?? 0));
