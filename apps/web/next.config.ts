import type { NextConfig } from "next";
import path from "path";
import fs from "fs";
import os from "os";

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
    // Only fill missing values — explicit environment variables (e.g. from
    // the e2e mock harness) must win over the .env.local file.
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

// Dynamically resolve local network IPv4 addresses to allow local network devices
// or dynamic hosts to connect to Next.js dev resources without CORS block warnings.
const devOrigins = ["localhost", "127.0.0.1"];
try {
  const interfaces = os.networkInterfaces();
  for (const devName in interfaces) {
    const iface = interfaces[devName];
    if (iface) {
      for (const alias of iface) {
        if (alias.family === "IPv4" && !alias.internal) {
          devOrigins.push(alias.address);
          // Also add with port variations if needed, though Next.js generally checks the hostname/IP.
          devOrigins.push(`${alias.address}:3000`);
        }
      }
    }
  }
} catch {
  // Silent fallback
}

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname, "../../"),
  },
  allowedDevOrigins: devOrigins,
  // Allow e2e tests to run an isolated dev instance with its own build dir
  // (defaults to ".next" so normal builds are unaffected).
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
