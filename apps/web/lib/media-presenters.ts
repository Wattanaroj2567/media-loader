const ACTIVE_STATUSES = new Set([
  "PENDING",
  "ANALYZING",
  "READY",
  "QUEUED",
  "DOWNLOADING",
  "CONVERTING",
  "UPLOADING",
  "PAUSED",
]);

const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED", "BLOCKED", "CANCELLED"]);

export interface MediaFormat {
  format_id: string;
  type: "video" | "audio";
  extension: string;
  quality_label: string;
  width?: number | null;
  height?: number | null;
  fps?: number | null;
  bitrate?: number | null;
  video_codec?: string | null;
  audio_codec?: string | null;
  filesize?: number | null;
  has_video?: boolean;
  has_audio?: boolean;
}

export function groupFormats(formats: MediaFormat[]) {
  return {
    video: formats.filter((format) => format.type === "video"),
    audio: formats.filter((format) => format.type === "audio"),
  };
}

export function getAudioSourceFormats(formats: MediaFormat[]) {
  const grouped = groupFormats(formats);
  if (grouped.audio.length) return grouped.audio;

  const videoWithAudio = grouped.video.find((format) => format.has_audio);
  if (!videoWithAudio) return [];

  return [
    {
      ...videoWithAudio,
      type: "audio" as const,
      quality_label: "เสียงจากวิดีโอ (คุณภาพตามต้นทาง)",
      width: null,
      height: null,
      fps: null,
      bitrate: null,
      filesize: null,
    },
  ];
}

export function isActiveStatus(status: string) {
  return ACTIVE_STATUSES.has(status);
}

export function isTerminalStatus(status: string) {
  return TERMINAL_STATUSES.has(status);
}

export function formatMediaDuration(seconds?: number | null) {
  if (!seconds || seconds < 0) return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  }
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function formatCalendarDate(
  iso: string | null | undefined,
  locale: "en" | "th"
) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function sanitizeFilename(filename: string) {
  return filename.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_");
}

export function getDownloadFilename(
  contentDisposition: string | null,
  fallback: string
) {
  const utf8Match = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i);
  const quotedMatch = contentDisposition?.match(/filename="([^"]+)"/i);
  const plainMatch = contentDisposition?.match(/filename=([^;]+)/i);
  const candidate = utf8Match?.[1]
    ? decodeURIComponent(utf8Match[1])
    : quotedMatch?.[1] || plainMatch?.[1]?.trim() || fallback;
  return sanitizeFilename(candidate);
}

export function formatCardTitle(format: MediaFormat) {
  if (format.type === "video") {
    // For vertical videos (Reels/Shorts where height > width), use width as the resolution (e.g., 1080x1920 -> 1080p)
    const effectiveRes =
      format.width && format.height && format.height > format.width
        ? format.width
        : format.height;

    if (effectiveRes) {
      if (effectiveRes >= 4320) return `${effectiveRes}p (8K)`;
      if (effectiveRes >= 2880) return `${effectiveRes}p (5K)`;
      if (effectiveRes >= 2160) return `${effectiveRes}p (4K)`;
      if (effectiveRes >= 1440) return `${effectiveRes}p (2K)`;
      return `${effectiveRes}p`;
    }

    if (format.quality_label) {
      const cleanLabel = format.quality_label.replace(/(\d+p)\d+$/i, "$1");
      return cleanLabel;
    }
  }

  if (format.type === "audio" && format.bitrate) {
    return `${Math.round(format.bitrate)} kbps`;
  }

  return format.quality_label || format.format_id;
}

export function formatViews(views?: number | null, locale?: string) {
  if (views === undefined || views === null || views < 0) return null;
  const exactCount = views.toLocaleString(locale === "th" ? "th-TH" : "en-US");
  return locale === "th" ? `${exactCount} วิว` : `${exactCount} views`;
}

export function formatLikes(likes?: number | null, locale?: string) {
  if (likes === undefined || likes === null || likes < 0) return null;
  const exactCount = likes.toLocaleString(locale === "th" ? "th-TH" : "en-US");
  return locale === "th" ? `${exactCount} ไลก์` : `${exactCount} likes`;
}

export function formatReactions(reactions?: number | null, locale?: string) {
  if (reactions === undefined || reactions === null || reactions < 0) return null;
  const exactCount = reactions.toLocaleString(locale === "th" ? "th-TH" : "en-US");
  return locale === "th" ? `${exactCount} ปฏิกิริยา` : `${exactCount} reactions`;
}
