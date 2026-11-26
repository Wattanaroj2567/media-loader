import * as fs from "node:fs";
import * as path from "node:path";

import { syncEnv } from "./sync-env-lib.ts";

/**
 * Create or update `.env.local` from `.env.example`.
 *
 * - No `.env.local`: copies `.env.example` (placeholders only).
 * - Existing `.env.local`: appends variables that were added to `.env.example`
 *   since it was created. Existing lines and values are never changed.
 *
 * Only variable NAMES are printed. Secret values are never read into output.
 *
 * Usage:
 *   pnpm env:sync              apply changes
 *   pnpm env:sync --dry-run    show which variables would be added
 *   pnpm env:sync --check      exit 1 if variables are missing (no writes)
 *   --example <file> --target <file>   override paths (used by tests)
 */

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const dryRun = process.argv.includes("--dry-run");
const checkOnly = process.argv.includes("--check");
const examplePath = path.resolve(option("--example") ?? ".env.example");
const targetPath = path.resolve(option("--target") ?? ".env.local");

if (!fs.existsSync(examplePath)) {
  console.error(`Template not found: ${path.basename(examplePath)}`);
  process.exit(2);
}
const exampleText = fs.readFileSync(examplePath, "utf8");
const label = path.basename(targetPath);

console.log("Environment Sync");
console.log("----------------");

if (!fs.existsSync(targetPath)) {
  if (checkOnly || dryRun) {
    console.log(`${label}: missing (would be created from ${path.basename(examplePath)})`);
    process.exit(checkOnly ? 1 : 0);
  }
  fs.writeFileSync(targetPath, exampleText, "utf8");
  console.log(`${label}: created from ${path.basename(examplePath)}`);
  console.log("Fill in the REQUIRED values, then run: pnpm check-env");
  process.exit(0);
}

const targetText = fs.readFileSync(targetPath, "utf8");
const today = new Date().toISOString().slice(0, 10);
const result = syncEnv(exampleText, targetText, today);

if (result.added.length === 0) {
  console.log(`${label}: up to date (no new variables)`);
} else {
  const verb = dryRun || checkOnly ? "would add" : "added";
  console.log(`${label}: ${verb} ${result.added.length} variable(s):`);
  for (const key of result.added) console.log(`  + ${key}`);
  if (!dryRun && !checkOnly) {
    fs.writeFileSync(targetPath, result.content, "utf8");
    console.log("Existing values were not modified. Fill in any new empty values.");
  }
}

if (result.unknown.length > 0) {
  console.log(`Not in ${path.basename(examplePath)} (kept as-is): ${result.unknown.join(", ")}`);
}

console.log("----------------");
console.log("No secret values were printed.");
process.exit(checkOnly && result.added.length > 0 ? 1 : 0);
