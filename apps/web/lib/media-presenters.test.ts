import assert from "node:assert/strict";
import test from "node:test";

import {
  formatCalendarDate,
  formatCardTitle,
  formatLikes,
  formatMediaDuration,
  formatReactions,
  formatViews,
  getAudioSourceFormats,
  getDownloadFilename,
  groupFormats,
  isActiveStatus,
  isTerminalStatus,
} from "./media-presenters.ts";

test("media duration is shown as clip length without date or relative time", () => {
  assert.equal(formatMediaDuration(41), "0:41");
  assert.equal(formatMediaDuration(1009), "16:49");
  assert.equal(formatMediaDuration(3723), "1:02:03");
  assert.equal(formatMediaDuration(null), null);
});

test("history date includes day, month, and year without download time", () => {
  assert.equal(formatCalendarDate("2026-09-21T12:00:00Z", "en"), "Sep 21, 2026");
  assert.equal(formatCalendarDate(undefined, "en"), "");
  assert.equal(formatCalendarDate("not-a-date", "en"), "");
});

test("audio source formats prefer true audio-only formats over video formats with audio", () => {
  const formats = [
    {
      format_id: "video-1080",
      type: "video" as const,
      extension: "mp4",
      quality_label: "1080p",
      has_audio: true,
    },
    {
      format_id: "audio",
      type: "audio" as const,
      extension: "mp3",
      quality_label: "Original audio",
      has_audio: true,
    },
  ];

  assert.deepEqual(
    getAudioSourceFormats(formats).map((format) => format.format_id),
    ["audio"]
  );
});

test("audio source formats do not present video resolution as audio quality", () => {
  const formats = [
    {
      format_id: "video-1080",
      type: "video" as const,
      extension: "mp4",
      quality_label: "1080p",
      filesize: 2_600_000,
      has_audio: true,
    },
  ];

  const [audio] = getAudioSourceFormats(formats);
  assert.equal(audio.type, "audio");
  assert.equal(audio.quality_label, "เสียงจากวิดีโอ (คุณภาพตามต้นทาง)");
  assert.equal(audio.height, null);
  assert.equal(audio.filesize, null);
});

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

  assert.deepEqual(
    grouped.video.map((format) => format.quality_label),
    ["2160p · 60 FPS"]
  );
  assert.deepEqual(
    grouped.audio.map((format) => format.quality_label),
    ["160 kbps · OPUS"]
  );
});

test("job status helpers separate queue from history", () => {
  assert.equal(isActiveStatus("QUEUED"), true);
  assert.equal(isActiveStatus("PAUSED"), true);
  assert.equal(isActiveStatus("CONVERTING"), true);
  assert.equal(isActiveStatus("COMPLETED"), false);
  assert.equal(isTerminalStatus("COMPLETED"), true);
  assert.equal(isTerminalStatus("CANCELLED"), true);
  assert.equal(isTerminalStatus("DOWNLOADING"), false);
});

test("download filename prefers content-disposition and stays filesystem safe", () => {
  assert.equal(
    getDownloadFilename('attachment; filename="A clip: 1080p.mp4"', "fallback.mp4"),
    "A clip_ 1080p.mp4"
  );
  assert.equal(
    getDownloadFilename(
      "attachment; filename*=UTF-8''%E0%B9%81%E0%B8%84%E0%B8%99%20Ft.%20Official.mp4",
      "fallback.mp4"
    ),
    "แคน Ft. Official.mp4"
  );
  assert.equal(getDownloadFilename(null, "fallback.mp4"), "fallback.mp4");
});

test("formatCardTitle formats standard resolutions correctly including 8K, 5K, 4K, 2K", () => {
  assert.equal(
    formatCardTitle({
      format_id: "v4320",
      type: "video",
      extension: "mp4",
      quality_label: "4320p",
      height: 4320,
      width: 7680,
    }),
    "4320p (8K)"
  );
  assert.equal(
    formatCardTitle({
      format_id: "v2880",
      type: "video",
      extension: "mp4",
      quality_label: "2880p",
      height: 2880,
      width: 5120,
    }),
    "2880p (5K)"
  );
  assert.equal(
    formatCardTitle({
      format_id: "v2160",
      type: "video",
      extension: "mp4",
      quality_label: "2160p",
      height: 2160,
      width: 3840,
    }),
    "2160p (4K)"
  );
  assert.equal(
    formatCardTitle({
      format_id: "v1440",
      type: "video",
      extension: "mp4",
      quality_label: "1440p",
      height: 1440,
      width: 2560,
    }),
    "1440p (2K)"
  );
  assert.equal(
    formatCardTitle({
      format_id: "v1080",
      type: "video",
      extension: "mp4",
      quality_label: "1080p",
      height: 1080,
      width: 1920,
    }),
    "1080p"
  );
  // Vertical video (height > width): width is effective resolution
  assert.equal(
    formatCardTitle({
      format_id: "v_vert",
      type: "video",
      extension: "mp4",
      quality_label: "1080p",
      height: 1920,
      width: 1080,
    }),
    "1080p"
  );
  // Audio format: shows bitrate kbps
  assert.equal(
    formatCardTitle({
      format_id: "a128",
      type: "audio",
      extension: "mp3",
      quality_label: "128 kbps",
      bitrate: 128.4,
    }),
    "128 kbps"
  );
});

test("formatViews displays the exact platform count without abbreviation", () => {
  assert.equal(formatViews(1_960_507_594, "th"), "1,960,507,594 วิว");
  assert.equal(formatViews(4_590_000, "th"), "4,590,000 วิว");
  assert.equal(formatViews(450_000, "th"), "450,000 วิว");
  assert.equal(formatViews(25_000, "th"), "25,000 วิว");
  assert.equal(formatViews(1_500, "th"), "1,500 วิว");
  assert.equal(formatViews(850, "th"), "850 วิว");
  assert.equal(formatViews(0, "th"), "0 วิว");
  assert.equal(formatViews(null, "th"), null);
  assert.equal(formatViews(undefined, "th"), null);

  assert.equal(formatViews(1_960_507_594, "en"), "1,960,507,594 views");
  assert.equal(formatViews(51_389_232, "en"), "51,389,232 views");
  assert.equal(formatViews(133_017, "en"), "133,017 views");
  assert.equal(formatViews(4_227, "en"), "4,227 views");
  assert.equal(formatViews(850, "en"), "850 views");
});

test("formatLikes displays the exact platform count without abbreviation", () => {
  assert.equal(formatLikes(29_700_000, "th"), "29,700,000 ไลก์");
  assert.equal(formatLikes(1_289_000_000, "th"), "1,289,000,000 ไลก์");
  assert.equal(formatLikes(450_000, "th"), "450,000 ไลก์");
  assert.equal(formatLikes(850, "th"), "850 ไลก์");

  assert.equal(formatLikes(29_700_000, "en"), "29,700,000 likes");
  assert.equal(formatLikes(1_289_000_000, "en"), "1,289,000,000 likes");
  assert.equal(formatLikes(850, "en"), "850 likes");
});

test("formatReactions displays the exact platform count without calling it likes", () => {
  assert.equal(formatReactions(35_000, "th"), "35,000 ปฏิกิริยา");
  assert.equal(formatReactions(35_000, "en"), "35,000 reactions");
  assert.equal(formatReactions(0, "en"), "0 reactions");
  assert.equal(formatReactions(null, "en"), null);
});
