import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { parseEnvKeys, parseExampleEntries, syncEnv } from "./sync-env-lib.ts";

const EXAMPLE = [
  "# header",
  "# ==========",
  "",
  "# Supabase URL",
  "SUPABASE_URL=https://placeholder",
  "",
  "# R2 bucket",
  "# second comment line",
  "MEDIA_STORAGE_BUCKET=media-downloads",
  "R2_ACCESS_KEY_ID=",
  "# COMMENTED_OUT=1",
  "",
].join("\n");

test("parseExampleEntries keeps leading comments and skips commented keys", () => {
  const entries = parseExampleEntries(EXAMPLE);
  assert.deepEqual(
    entries.map((entry) => entry.key),
    ["SUPABASE_URL", "MEDIA_STORAGE_BUCKET", "R2_ACCESS_KEY_ID"]
  );
  assert.deepEqual(entries[1].comments, ["# R2 bucket", "# second comment line"]);
  assert.deepEqual(entries[2].comments, []);
});

test("parseEnvKeys ignores comments, blanks, and handles export", () => {
  const keys = parseEnvKeys("# A=1\n\nB=2\nexport C=3\nnot a var\n");
  assert.deepEqual([...keys].sort(), ["B", "C"]);
});

test("syncEnv appends only missing keys and never touches existing values", () => {
  const target = "SUPABASE_URL=real-secret-value\nMEDIA_STORAGE_BUCKET=custom\nEXTRA=1";
  const result = syncEnv(EXAMPLE, target, "2026-01-01");
  assert.deepEqual(result.added, ["R2_ACCESS_KEY_ID"]);
  assert.deepEqual(result.unknown, ["EXTRA"]);
  assert.ok(result.content.startsWith(target + "\n"));
  assert.ok(result.content.includes("real-secret-value"));
  assert.ok(result.content.includes("Added by pnpm env:sync on 2026-01-01"));
  assert.ok(result.content.trimEnd().endsWith("R2_ACCESS_KEY_ID="));
});

test("syncEnv is a no-op when nothing is missing and preserves CRLF", () => {
  const complete = "SUPABASE_URL=a\r\nMEDIA_STORAGE_BUCKET=b\r\nR2_ACCESS_KEY_ID=c\r\n";
  assert.equal(syncEnv(EXAMPLE, complete, "d").content, complete);

  const partial = "SUPABASE_URL=a\r\n";
  const result = syncEnv(EXAMPLE, partial, "d");
  assert.ok(!/[^\r]\n/.test(result.content), "must not introduce bare LF");
});

test("CLI creates, updates, and checks a target without printing values", () => {
  const dir = mkdtempSync(join(tmpdir(), "media-loader-sync-env-"));
  const script = fileURLToPath(new URL("./sync-env.ts", import.meta.url));
  const example = join(dir, "example");
  const target = join(dir, "target");
  writeFileSync(example, EXAMPLE);
  const run = (...args: string[]) =>
    spawnSync(
      process.execPath,
      ["--experimental-strip-types", script, "--example", example, "--target", target, ...args],
      { encoding: "utf8" }
    );
  try {
    assert.equal(run("--check").status, 1); // target missing

    assert.equal(run().status, 0); // created from template
    assert.equal(readFileSync(target, "utf8"), EXAMPLE);

    writeFileSync(target, "SUPABASE_URL=top-secret-value\n");
    const dry = run("--dry-run");
    assert.equal(dry.status, 0);
    assert.ok(!dry.stdout.includes("top-secret-value"));
    assert.equal(readFileSync(target, "utf8"), "SUPABASE_URL=top-secret-value\n");

    assert.equal(run("--check").status, 1); // missing keys, no write
    const applied = run();
    assert.equal(applied.status, 0);
    assert.ok(!applied.stdout.includes("top-secret-value"));
    assert.ok(readFileSync(target, "utf8").includes("SUPABASE_URL=top-secret-value"));
    assert.equal(run("--check").status, 0); // now complete
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
