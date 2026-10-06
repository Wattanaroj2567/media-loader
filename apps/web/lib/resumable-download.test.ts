import assert from "node:assert/strict";
import test from "node:test";

import { ResumableDownload, type VisibilitySource } from "./resumable-download.ts";

const PAYLOAD = Uint8Array.from({ length: 1000 }, (_, index) => index % 251);

/** A response whose body yields `chunks` and then fails if `failAfter` is set. */
function bodyResponse(
  bytes: Uint8Array,
  init: { status?: number; headers?: Record<string, string>; failAfter?: number }
) {
  const chunkSize = 100;
  let offset = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (init.failAfter !== undefined && offset >= init.failAfter) {
        controller.error(new TypeError("Load failed"));
        return;
      }
      if (offset >= bytes.length) {
        controller.close();
        return;
      }
      controller.enqueue(bytes.slice(offset, offset + chunkSize));
      offset += chunkSize;
    },
  });
  return new Response(stream, { status: init.status ?? 200, headers: init.headers });
}

function fullResponse(failAfter?: number) {
  return bodyResponse(PAYLOAD, {
    headers: {
      "Content-Length": String(PAYLOAD.length),
      "Content-Disposition": 'attachment; filename="clip.mp4"',
    },
    failAfter,
  });
}

function rangeResponse(start: number) {
  return bodyResponse(PAYLOAD.slice(start), {
    status: 206,
    headers: {
      "Content-Length": String(PAYLOAD.length - start),
      "Content-Range": `bytes ${start}-${PAYLOAD.length - 1}/${PAYLOAD.length}`,
    },
  });
}

function fakeVisibility(initiallyHidden = false) {
  let hidden = initiallyHidden;
  const listeners = new Set<(hidden: boolean) => void>();
  const source: VisibilitySource = {
    isHidden: () => hidden,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return {
    source,
    set(next: boolean) {
      hidden = next;
      listeners.forEach((listener) => listener(next));
    },
  };
}

async function bytesOf(download: ResumableDownload) {
  return new Uint8Array(await download.toBlob("video/mp4").arrayBuffer());
}

test("downloads the whole file and reports progress", async () => {
  const progress: [number, number | null][] = [];
  const download = new ResumableDownload({
    open: async () => fullResponse(),
    onProgress: ({ received, total }) => progress.push([received, total]),
    visibility: fakeVisibility().source,
  });

  assert.equal(await download.run(), "complete");
  assert.deepEqual(await bytesOf(download), PAYLOAD);
  assert.deepEqual(progress.at(-1), [1000, 1000]);
  assert.equal(download.contentDisposition, 'attachment; filename="clip.mp4"');
});

test("pauses instead of failing when the page was hidden during the transfer", async () => {
  const visibility = fakeVisibility();
  const download = new ResumableDownload({
    open: async () => {
      // iOS suspends the tab, then reports the broken transfer after it resumes.
      visibility.set(true);
      visibility.set(false);
      return fullResponse(400);
    },
    visibility: visibility.source,
  });

  assert.equal(await download.run(), "paused");
  assert.equal(download.received, 400);
});

test("resumes from the received offset with a Range request", async () => {
  const visibility = fakeVisibility();
  const offsets: number[] = [];
  let attempt = 0;
  const download = new ResumableDownload({
    open: async (offset) => {
      offsets.push(offset);
      attempt += 1;
      if (attempt === 1) {
        visibility.set(true);
        return fullResponse(600);
      }
      return rangeResponse(offset);
    },
    visibility: visibility.source,
  });

  assert.equal(await download.run(), "paused");
  visibility.set(false);
  assert.equal(await download.run(), "complete");
  assert.deepEqual(offsets, [0, 600]);
  assert.deepEqual(await bytesOf(download), PAYLOAD);
});

test("restarts cleanly when the server ignores the Range header", async () => {
  const visibility = fakeVisibility();
  let attempt = 0;
  const download = new ResumableDownload({
    open: async () => {
      attempt += 1;
      if (attempt === 1) {
        visibility.set(true);
        return fullResponse(300);
      }
      return fullResponse();
    },
    visibility: visibility.source,
  });

  await download.run();
  visibility.set(false);
  assert.equal(await download.run(), "complete");
  assert.deepEqual(await bytesOf(download), PAYLOAD);
});

test("retries a visible network drop from the same offset", async () => {
  const offsets: number[] = [];
  const download = new ResumableDownload({
    open: async (offset) => {
      offsets.push(offset);
      return offsets.length === 1 ? fullResponse(500) : rangeResponse(offset);
    },
    visibility: fakeVisibility().source,
    retryDelayMs: 0,
  });

  assert.equal(await download.run(), "complete");
  assert.deepEqual(offsets, [0, 500]);
  assert.deepEqual(await bytesOf(download), PAYLOAD);
});

test("gives up after repeated visible network failures", async () => {
  const download = new ResumableDownload({
    open: async () => fullResponse(0),
    visibility: fakeVisibility().source,
    retryDelayMs: 0,
    maxVisibleRetries: 2,
  });

  await assert.rejects(download.run(), TypeError);
});

test("does not retry HTTP errors such as an expired file", async () => {
  let calls = 0;
  const download = new ResumableDownload({
    open: async () => {
      calls += 1;
      return new Response(JSON.stringify({ error: { message: "gone" } }), { status: 410 });
    },
    visibility: fakeVisibility().source,
    retryDelayMs: 0,
  });

  await assert.rejects(download.run());
  assert.equal(calls, 1);
});

test("abort stops the transfer without reporting a pause", async () => {
  const download = new ResumableDownload({
    open: async (_offset, signal) =>
      new Promise<Response>((_resolve, reject) => {
        signal.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError"))
        );
      }),
    visibility: fakeVisibility().source,
  });

  const running = download.run();
  download.abort();
  await assert.rejects(running, { name: "AbortError" });
});
