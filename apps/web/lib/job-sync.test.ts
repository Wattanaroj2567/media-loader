import assert from "node:assert/strict";
import test from "node:test";

import type { Job } from "./api-client.ts";
import { mergePolledJobs, queueDisplayStatus } from "./job-sync.ts";

function job(overrides: Partial<Job> & Pick<Job, "id" | "status">): Job {
  return {
    original_url: "https://example.com/clip",
    progress: 0,
    selected_format: "mp4-720p",
    output_format: "mp4",
    created_at: "2026-09-18T12:00:00Z",
    updated_at: "2026-09-18T12:00:00Z",
    ...overrides,
  };
}

test("queueDisplayStatus keeps a fresh queue label until resume has progress", () => {
  assert.equal(queueDisplayStatus("QUEUED", 0), "QUEUED");
  assert.equal(queueDisplayStatus("QUEUED", 45), "RESUMING");
  assert.equal(queueDisplayStatus("QUEUED", 0, true), "RESUMING");
  assert.equal(queueDisplayStatus("PAUSED", 45), "PAUSED");
});

test("mergePolledJobs keeps a newer paused job over a stale queued snapshot", () => {
  const paused = job({
    id: "job-1",
    status: "PAUSED",
    progress: 45,
    updated_at: "2026-09-18T12:00:05Z",
  });
  const staleQueued = job({
    id: "job-1",
    status: "QUEUED",
    progress: 45,
    updated_at: "2026-09-18T12:00:00Z",
  });

  assert.deepEqual(mergePolledJobs([paused], [staleQueued]), [paused]);
});

test("mergePolledJobs keeps paused when timestamps tie with an older working status", () => {
  const paused = job({
    id: "job-1",
    status: "PAUSED",
    progress: 12,
  });
  const downloading = job({
    id: "job-1",
    status: "DOWNLOADING",
    progress: 12,
  });

  assert.deepEqual(mergePolledJobs([paused], [downloading]), [paused]);
});

test("mergePolledJobs accepts a newer worker status after resume", () => {
  const queued = job({
    id: "job-1",
    status: "QUEUED",
    progress: 45,
    updated_at: "2026-09-18T12:00:05Z",
  });
  const downloading = job({
    id: "job-1",
    status: "DOWNLOADING",
    progress: 48,
    updated_at: "2026-09-18T12:00:08Z",
  });

  assert.deepEqual(mergePolledJobs([queued], [downloading]), [downloading]);
});
