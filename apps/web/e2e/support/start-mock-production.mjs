import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "../..");
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: "http://localhost:9999",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "mock-anon-key",
  NEXT_DIST_DIR: ".next-mock",
};

rmSync(path.join(webRoot, ".next-mock"), { recursive: true, force: true });

const build = spawn(npmCmd, ["run", "build"], {
  cwd: webRoot,
  env,
  shell: process.platform === "win32",
  stdio: "inherit",
});

build.on("exit", (code) => {
  if (code !== 0) process.exit(code ?? 1);
  const server = spawn(
    npmCmd,
    ["run", "start", "--", "--port", "3200", "--hostname", "localhost"],
    { cwd: webRoot, env, shell: process.platform === "win32", stdio: "inherit" },
  );
  server.on("exit", (serverCode) => process.exit(serverCode ?? 0));
});
