export const ACTIVE_STATUSES = new Set([
  "PENDING",
  "ANALYZING",
  "READY",
  "QUEUED",
  "DOWNLOADING",
  "CONVERTING",
  "UPLOADING",
  "PAUSED",
]);

export const TERMINAL_STATUSES = new Set([
  "COMPLETED",
  "FAILED",
  "BLOCKED",
  "CANCELLED",
]);

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

export function isActiveStatus(status: string) {
  return ACTIVE_STATUSES.has(status);
}

export function isTerminalStatus(status: string) {
  return TERMINAL_STATUSES.has(status);
}

function sanitizeFilename(filename: string) {
  return filename.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_");
}

export function getDownloadFilename(
  contentDisposition: string | null,
  fallback: string,
) {
  const utf8Match = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i);
  const quotedMatch = contentDisposition?.match(/filename="([^"]+)"/i);
  const plainMatch = contentDisposition?.match(/filename=([^;]+)/i);
  const candidate = utf8Match?.[1]
    ? decodeURIComponent(utf8Match[1])
    : quotedMatch?.[1] || plainMatch?.[1]?.trim() || fallback;
  return sanitizeFilename(candidate);
}
