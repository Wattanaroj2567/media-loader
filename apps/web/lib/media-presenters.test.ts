import assert from "node:assert/strict";
import test from "node:test";

import {
  getDownloadFilename,
  groupFormats,
  isActiveStatus,
  isTerminalStatus,
} from "./media-presenters.ts";

test("groupFormats keeps the backend real quality order", () => {
  const grouped = groupFormats([
    {
      format_id: "v2160",
      type: "video",
      extension: "mp4",
      quality_label: "2160p · 60 FPS",
      height: 2160,
      fps: 60,
      bitrate: 12000,
      filesize: 100,
    },
    {
      format_id: "a160",
      type: "audio",
      extension: "webm",
      quality_label: "160 kbps · OPUS",
      height: null,
      fps: null,
      bitrate: 160,
      filesize: 10,
    },
  ]);

  assert.deepEqual(grouped.video.map((format) => format.quality_label), [
    "2160p · 60 FPS",
  ]);
  assert.deepEqual(grouped.audio.map((format) => format.quality_label), [
    "160 kbps · OPUS",
  ]);
});

test("job status helpers separate queue from history", () => {
  assert.equal(isActiveStatus("QUEUED"), true);
  assert.equal(isActiveStatus("CONVERTING"), true);
  assert.equal(isActiveStatus("COMPLETED"), false);
  assert.equal(isTerminalStatus("COMPLETED"), true);
  assert.equal(isTerminalStatus("CANCELLED"), true);
  assert.equal(isTerminalStatus("DOWNLOADING"), false);
});

test("download filename prefers content-disposition and stays filesystem safe", () => {
  assert.equal(
    getDownloadFilename(
      'attachment; filename="A clip: 1080p.mp4"',
      "fallback.mp4",
    ),
    "A clip_ 1080p.mp4",
  );
  assert.equal(getDownloadFilename(null, "fallback.mp4"), "fallback.mp4");
});
