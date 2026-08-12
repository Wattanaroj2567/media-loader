import assert from "node:assert/strict";
import test from "node:test";

import { ApiClient, jobFileDownloadUrl } from "./api-client.ts";

test("browser download URL safely targets the same-origin streaming route", () => {
  assert.equal(
    jobFileDownloadUrl("job/with spaces"),
    "/api/files/download/job%2Fwith%20spaces",
  );
});

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

test("ApiClient sends the confirmed rights flag and selected format", async () => {
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

test("ApiClient streams a completed job into the preselected destination", async () => {
  let request: { url: string; init?: RequestInit } | undefined;
  const chunks: Uint8Array[] = [];
  const client = new ApiClient(
    "http://api.test",
    async () => "access-token",
    async (url, init) => {
      request = { url: String(url), init };
      return new Response("finished media", { status: 200 });
    },
  );

  const result = await client.downloadJobFile("job-1", "clip.mp4", {
    async createWritable() {
      return new WritableStream<Uint8Array>({
        write(chunk) {
          chunks.push(chunk);
        },
      });
    },
  });

  assert.equal(result, "picker");
  assert.equal(request?.url, "http://api.test/files/download/job-1");
  assert.equal(
    new Headers(request?.init?.headers).get("Authorization"),
    "Bearer access-token",
  );
  assert.equal(new TextDecoder().decode(Buffer.concat(chunks)), "finished media");
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

test("ApiClient gives a user-friendly message when history deletion cannot reach the API", async () => {
  const client = new ApiClient(
    "http://api.test",
    async () => "token",
    async () => {
      throw new TypeError("Failed to fetch");
    },
  );

  await assert.rejects(
    () => client.deleteJob("job-1"),
    /ไม่สามารถดำเนินการได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง/,
  );
});

test("ApiClient does not misreport a session read failure as an API network error", async () => {
  let fetchCalled = false;
  const client = new ApiClient(
    "http://api.test",
    async () => {
      throw new TypeError("HMR removed the session module");
    },
    async () => {
      fetchCalled = true;
      return new Response();
    },
  );

  await assert.rejects(
    () => client.deleteJob("job-1"),
    /ไม่สามารถตรวจสอบการเข้าสู่ระบบได้ กรุณาโหลดหน้าใหม่แล้วลองอีกครั้ง/,
  );
  assert.equal(fetchCalled, false);
});
