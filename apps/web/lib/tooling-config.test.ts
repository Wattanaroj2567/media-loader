import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

test("Vercel configuration allows builds even when project settings would skip them", () => {
  const config: unknown = JSON.parse(
    readFileSync(new URL("../../../vercel.json", import.meta.url), "utf8")
  );
  assert.ok(config && typeof config === "object");
  assert.ok("ignoreCommand" in config);
  assert.equal(config.ignoreCommand, "exit 1");
});

function inspectDrizzleConfig(databaseUrl?: string) {
  const script = `
    import fs from 'node:fs';
    import path from 'node:path';
    import { pathToFileURL } from 'node:url';
    import { createRequire } from 'node:module';
    let environmentReads = 0;
    const readFileSync = fs.readFileSync;
    fs.readFileSync = function(file, ...args) {
      if (typeof file === 'string' && /^\\.env(?:\\.|$)/.test(path.basename(file))) {
        environmentReads++;
        const error = new Error('Environment files are forbidden in this test');
        error.code = 'ENOENT';
        throw error;
      }
      return readFileSync.call(this, file, ...args);
    };
    const require = createRequire(pathToFileURL(path.resolve('drizzle.config.ts')));
    require('tsx/cjs');
    const { default: config } = require('./drizzle.config.ts');
    console.log(JSON.stringify({
      environmentReads,
      schema: config.schema,
      dialect: config.dialect,
      hasCredentials: Boolean(config.dbCredentials),
      matchesDatabaseUrl: config.dbCredentials?.url === process.env.DATABASE_URL,
    }));
  `;
  const env: NodeJS.ProcessEnv = { NODE_ENV: "test" };
  for (const name of ["SystemRoot", "WINDIR", "PATH", "TEMP", "TMP"]) {
    if (process.env[name]) env[name] = process.env[name];
  }
  if (databaseUrl) env.DATABASE_URL = databaseUrl;
  const result = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "--input-type=module", "--eval", script],
    { cwd: fileURLToPath(new URL("../", import.meta.url)), env, encoding: "utf8" }
  );
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout.trim().split("\n").at(-1)!);
}

test("Drizzle config exposes the schema without reading environment files", () => {
  const result = inspectDrizzleConfig();
  assert.equal(result.environmentReads, 0);
  assert.equal(result.schema, "./lib/db/schema.ts");
  assert.equal(result.dialect, "postgresql");
  assert.equal(result.hasCredentials, false);
});

test("Drizzle config uses explicitly supplied database configuration without file reads", () => {
  const result = inspectDrizzleConfig("postgresql://fixture:fixture@localhost/fixture");
  assert.equal(result.environmentReads, 0);
  assert.equal(result.hasCredentials, true);
  assert.equal(result.matchesDatabaseUrl, true);
});

test("Drizzle generates a migration with the patched esbuild loader", () => {
  const scratch = mkdtempSync(join(tmpdir(), "media-loader-drizzle-test-"));
  const env: NodeJS.ProcessEnv = { NODE_ENV: "test" };
  for (const name of ["SystemRoot", "WINDIR", "PATH", "TEMP", "TMP"]) {
    if (process.env[name]) env[name] = process.env[name];
  }
  try {
    const result = spawnSync(
      process.execPath,
      [
        "./node_modules/drizzle-kit/bin.cjs",
        "generate",
        "--dialect",
        "postgresql",
        "--schema",
        "./lib/db/schema.ts",
        "--out",
        scratch,
        "--name",
        "validation",
      ],
      { cwd: fileURLToPath(new URL("../", import.meta.url)), env, encoding: "utf8" }
    );
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.ok(existsSync(join(scratch, "0000_validation.sql")));
  } finally {
    assert.equal(dirname(resolve(scratch)), resolve(tmpdir()));
    assert.ok(basename(scratch).startsWith("media-loader-drizzle-test-"));
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("shadcn's ts-morph globbing works with the patched minimatch", () => {
  const script = `
    const { createRequire } = require('node:module');
    const fromShadcn = createRequire(require.resolve('shadcn'));
    const { Project } = fromShadcn('ts-morph');
    const project = new Project({ useInMemoryFileSystem: true });
    project.createSourceFile('/src/example.ts', 'export const value = 1');
    if (project.getSourceFiles('**/*.ts').length !== 1) process.exit(1);
  `;
  const env: NodeJS.ProcessEnv = { NODE_ENV: "test" };
  for (const name of ["SystemRoot", "WINDIR", "PATH", "TEMP", "TMP"]) {
    if (process.env[name]) env[name] = process.env[name];
  }
  const result = spawnSync(process.execPath, ["--eval", script], {
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    env,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
});
