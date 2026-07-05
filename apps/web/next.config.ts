import type { NextConfig } from "next";
import path from "path";
import fs from "fs";

// Load monorepo root .env.local manually to populate process.env in the monorepo context
const rootEnvPath = path.resolve(__dirname, "../../.env.local");
if (fs.existsSync(rootEnvPath)) {
  const content = fs.readFileSync(rootEnvPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const firstEquals = trimmed.indexOf("=");
    if (firstEquals === -1) continue;
    const key = trimmed.slice(0, firstEquals).trim();
    const value = trimmed.slice(firstEquals + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key) {
      process.env[key] = value;
    }
  }
}

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname, "../../"),
  },
};

export default nextConfig;
