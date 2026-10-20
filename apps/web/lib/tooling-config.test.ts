import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

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
