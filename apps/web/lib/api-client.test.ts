import assert from "node:assert/strict";
import test from "node:test";

import { ApiClient } from "./api-client.ts";

test("ApiClient attaches the current Supabase access token", async () => {
  let request: { url: string; init?: RequestInit } | undefined;
  const client = new ApiClient(
    "http://api.test",
    async () => "access-token",
    async (url, init) => {
      request = { url: String(url), init };
      return new Response(
        JSON.stringify({ ok: true, data: { jobs: [], total: 0 } }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  );

  await client.listJobs({ limit: 25 });

  assert.equal(request?.url, "http://api.test/downloads?limit=25&offset=0");
  assert.equal(
    new Headers(request?.init?.headers).get("Authorization"),
    "Bearer access-token",
  );
});

test("ApiClient sends the auto-confirmed rights flag and selected format", async () => {
  let body = "";
  const client = new ApiClient(
    "http://api.test",
    async () => "token",
    async (_url, init) => {
      body = String(init?.body);
      return new Response(
        JSON.stringify({
          ok: true,
          data: { job_id: "job-1", status: "QUEUED" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  );

  await client.createJob({
    url: "https://example.com/watch/1",
    selected_format_id: "137",
    output_format: "mp4",
    rights_confirmed: true,
  });

  assert.deepEqual(JSON.parse(body), {
    url: "https://example.com/watch/1",
    selected_format_id: "137",
    output_format: "mp4",
    rights_confirmed: true,
  });
});

test("ApiClient analyzes before rights confirmation", async () => {
  let body = "";
  const client = new ApiClient(
    "http://api.test",
    async () => "token",
    async (_url, init) => {
      body = String(init?.body);
      return new Response(
        JSON.stringify({
          ok: true,
          data: {
            policy: { decision: "allowed", reason: "Public source" },
            media: { title: "Clip", platform: "Test" },
            formats: [],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  );

  await client.analyzeMedia("https://example.com/watch/1");

  assert.deepEqual(JSON.parse(body), {
    url: "https://example.com/watch/1",
  });
});

test("ApiClient exposes the wrapped API error message", async () => {
  const client = new ApiClient(
    "http://api.test",
    async () => "token",
    async () =>
      new Response(
        JSON.stringify({
          ok: false,
          data: null,
          error: { code: "POLICY_BLOCKED", message: "Blocked by policy" },
        }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      ),
  );

  await assert.rejects(
    () => client.analyzeMedia("https://example.com/watch/1"),
    /Blocked by policy/,
  );
});
