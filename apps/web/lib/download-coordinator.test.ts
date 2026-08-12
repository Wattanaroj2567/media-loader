import assert from "node:assert/strict";
import test from "node:test";

import {
  beginDownloadDelivery,
  finishDownloadDelivery,
  forgetPendingDownload,
  getPendingDownload,
  registerPendingDownload,
} from "./download-coordinator.ts";

test("a pending file can be claimed by only one delivery poll", () => {
  const jobId = "delivery-race-job";
  registerPendingDownload(jobId, "clip.mp4", null);

  assert.equal(beginDownloadDelivery(jobId), true);
  assert.equal(beginDownloadDelivery(jobId), false);
  assert.equal(getPendingDownload(jobId)?.filename, "clip.mp4");

  finishDownloadDelivery(jobId, true);
  assert.equal(getPendingDownload(jobId), null);
  forgetPendingDownload(jobId);
});

test("a failed delivery releases its claim for a controlled retry", () => {
  const jobId = "delivery-retry-job";
  registerPendingDownload(jobId, "clip.mp4", null);

  assert.equal(beginDownloadDelivery(jobId), true);
  finishDownloadDelivery(jobId, false);
  assert.equal(beginDownloadDelivery(jobId), true);

  forgetPendingDownload(jobId);
});
