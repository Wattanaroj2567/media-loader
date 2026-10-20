"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  Film,
  Globe2,
  Heart,
  Play,
  ShieldAlert,
  UserRound,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { LoadingIndicator } from "@/components/loading-indicator";
import { Skeleton } from "@/components/ui/skeleton";
import { MediaUrlInput } from "@/components/media-url-input";
import { useToast } from "@/components/toast";
import { ApiError, apiClient, type MediaAnalysis } from "@/lib/api-client";
import { registerPendingDownload } from "@/lib/download-coordinator";
import { consumeRequestedMediaAnalysis } from "@/lib/analyzer-session";
import {
  formatCardTitle,
  formatLikes,
  formatReactions,
  formatViews,
  getAudioSourceFormats,
  groupFormats,
  type MediaFormat,
} from "@/lib/media-presenters.ts";
import { useT } from "@/lib/i18n/context";
import { validateUrl } from "@/lib/url-validation";

type AnalyzerState = "idle" | "analyzing" | "ready" | "blocked" | "error";
type FormatTab = "video" | "audio" | "gif";

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds < 0) return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  }
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function formatBytes(bytes?: number | null) {
  if (!bytes || bytes <= 0) return null;
  const mb = bytes / (1000 * 1000);
  if (mb >= 1000) return `${(mb / 1000).toFixed(2)} GB`;
  return `${mb.toFixed(1)} MB`;
}

function getAudioQualityLabel(
  bitrate: number,
  t: (key: string, vars?: Record<string, string | number>, fallback?: string) => string
) {
  if (bitrate >= 256) {
    return t("download.audioStudio", {}, "คุณภาพระดับสตูดิโอ");
  }
  if (bitrate >= 160) {
    return t("download.audioHigh", {}, "คุณภาพสูง");
  }
  if (bitrate >= 120) {
    return t("download.audioStandard", {}, "คุณภาพมาตรฐาน");
  }
  return t("download.audioLow", {}, "คุณภาพประหยัด");
}

function estimateFilesize(
  format: MediaFormat,
  durationSeconds?: number | null
): string | null {
  if (format.filesize && format.filesize > 0) {
    return formatBytes(format.filesize);
  }

  // Calculate estimated filesize from bitrate & duration
  if (format.bitrate && format.bitrate > 0 && durationSeconds && durationSeconds > 0) {
    const approxBytes = (format.bitrate * 1000 * durationSeconds) / 8;
    return `~${formatBytes(approxBytes)}`;
  }

  // Estimate from resolution bitrate tier & duration for Reels / Shorts
  if (durationSeconds && durationSeconds > 0) {
    const res = Math.min(format.width || 0, format.height || 0) || format.height || 0;
    let estBitrateKbps = 0;
    if (res >= 4320) estBitrateKbps = 25000;
    else if (res >= 2160) estBitrateKbps = 12000;
    else if (res >= 1440) estBitrateKbps = 6000;
    else if (res >= 1080) estBitrateKbps = 3200;
    else if (res >= 720) estBitrateKbps = 1600;
    else if (res >= 480) estBitrateKbps = 800;
    else if (res > 0) estBitrateKbps = 400;

    if (estBitrateKbps > 0) {
      const approxBytes = (estBitrateKbps * 1000 * durationSeconds) / 8;
      return `~${formatBytes(approxBytes)}`;
    }
  }

  return null;
}

function formatCardMeta(
  format: MediaFormat,
  durationSeconds: number | null | undefined,
  t: (key: string, vars?: Record<string, string | number>, fallback?: string) => string
) {
  const sizeLabel = estimateFilesize(format, durationSeconds);
  const pieces = [
    format.type === "video" && format.fps && format.fps > 0
      ? `${format.fps} ${t("download.fps")}`
      : null,
    format.type === "audio" && format.bitrate
      ? getAudioQualityLabel(format.bitrate, t)
      : null,
    sizeLabel,
    !sizeLabel && format.type === "video"
      ? t("download.videoFormat", {}, "สตรีมมิ่ง HD")
      : null,
    !sizeLabel && format.type === "audio"
      ? t("download.audioFormat", {}, "ไฟล์เสียง MP3")
      : null,
  ].filter(Boolean);
  return pieces.join(" · ");
}

function safeDownloadFilename(title: string, extension: string) {
  return `${title || "media"}.${extension}`.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_");
}

function AnalyzerSkeleton() {
  const { t } = useT();
  return (
    <div className="mt-5 space-y-3">
      <LoadingIndicator
        label={t("download.analyzing", {}, "กำลังวิเคราะห์...")}
        className="text-sm text-primary"
      />
      <div className="grid gap-4 rounded-2xl border border-border bg-bg-surface/55 p-4 sm:grid-cols-[240px_1fr]">
        <Skeleton
          className="aspect-video w-full rounded-[1.25rem] bg-bg-base/80"
          style={{ "--skeleton-delay": "0s" } as CSSProperties}
        />
        <div className="space-y-3 py-1">
          <Skeleton
            className="h-5 w-3/4 rounded-lg bg-bg-base/80"
            style={{ "--skeleton-delay": "0.12s" } as CSSProperties}
          />
          <Skeleton
            className="h-4 w-1/2 rounded-lg bg-bg-base/60"
            style={{ "--skeleton-delay": "0.24s" } as CSSProperties}
          />
          <Skeleton
            className="h-4 w-2/3 rounded-lg bg-bg-base/60"
            style={{ "--skeleton-delay": "0.36s" } as CSSProperties}
          />
        </div>
      </div>
      <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-3 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton
            key={i}
            className="h-16 rounded-2xl bg-bg-surface/80 border border-border/40"
            style={{ "--skeleton-delay": `${i * 0.12}s` } as CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}

function FormatCard({
  format,
  durationSeconds,
  selected,
  onSelect,
  isBest = false,
  isGif = false,
}: {
  format: MediaFormat;
  durationSeconds?: number | null;
  selected: boolean;
  onSelect: () => void;
  isBest?: boolean;
  isGif?: boolean;
}) {
  const { t } = useT();
  const meta = isGif
    ? estimateFilesize(format, durationSeconds) || "GIF · ภาพเคลื่อนไหว"
    : formatCardMeta(format, durationSeconds, t) ||
      (format.type === "video"
        ? t("download.videoFormat", {}, "สตรีมมิ่ง HD")
        : t("download.audioFormat", {}, "ไฟล์เสียง MP3"));
  const title = isGif ? "Original GIF" : formatCardTitle(format);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative flex items-center justify-between gap-2.5 rounded-2xl border p-3 text-left transition-all duration-150 cursor-pointer ${
        selected
          ? "border-primary bg-primary/12 text-primary ring-1 ring-primary/40"
          : "border-border/80 bg-bg-base/50 text-text hover:border-primary/30 hover:bg-bg-surface"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="line-clamp-2 wrap-break-word whitespace-normal text-xs font-semibold leading-tight text-text group-hover:text-primary transition-colors">
            {title}
          </p>
          {isBest && (
            <span className="shrink-0 rounded-full border border-primary/30 bg-primary/15 px-1.5 py-0.2 text-[9px] font-bold text-text">
              BEST
            </span>
          )}
        </div>
        <p className="mt-1 line-clamp-2 text-[11px] leading-tight text-text-muted">
          {meta}
        </p>
      </div>
      <div
        className={`grid size-5 shrink-0 place-items-center rounded-full border transition-all ${
          selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border/60 bg-transparent text-transparent group-hover:border-primary/40"
        }`}
      >
        <CheckCircle2 className="size-3.5" />
      </div>
    </button>
  );
}

function tryConvertThaiLayout(text: string): string {
  if (!text || !/[\u0e00-\u0e7f]/.test(text)) {
    return text;
  }
  const map: Record<string, string> = {
    ๅ: "1",
    ภ: "2",
    ถ: "3",
    "ุ": "4",
    "ึ": "5",
    ค: "6",
    ต: "7",
    จ: "8",
    ข: "9",
    ช: "0",
    ๆ: "q",
    ไ: "w",
    ำ: "e",
    พ: "r",
    ะ: "t",
    "ั": "y",
    "ี": "u",
    ร: "i",
    น: "o",
    ย: "p",
    บ: "[",
    ล: "]",
    ฃ: "\\",
    ฟ: "a",
    ห: "s",
    ก: "d",
    ด: "f",
    เ: "g",
    "้": "h",
    "่": "j",
    า: "k",
    ส: "l",
    ว: ";",
    ง: "'",
    ผ: "z",
    ป: "x",
    แ: "c",
    อ: "v",
    "ิ": "b",
    "ื": "n",
    ท: "m",
    ม: ",",
    ใ: ".",
    ฝ: "/",
    "+": "!",
    "๑": "@",
    "๒": "#",
    "๓": "$",
    "๔": "%",
    "ู": "^",
    "฿": "&",
    "๕": "*",
    "๖": "(",
    "๗": ")",
    "๘": "_",
    "๙": "+",
    "๐": "Q",
    '"': "W",
    ฎ: "E",
    ฑ: "R",
    ธ: "T",
    "ํ": "Y",
    "๊": "U",
    ณ: "I",
    ฯ: "O",
    ญ: "P",
    ฐ: "{",
    ฤ: "A",
    ฆ: "S",
    ฏ: "D",
    โ: "F",
    ฌ: "G",
    "็": "H",
    "๋": "J",
    ษ: "K",
    ศ: "L",
    ซ: ":",
  };
  return text
    .split("")
    .map((char) => map[char] || char)
    .join("");
}

function getYouTubeEmbedUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (
      parsed.hostname.includes("youtube.com") ||
      parsed.hostname.includes("youtu.be")
    ) {
      let videoId: string | null = null;
      if (parsed.hostname.includes("youtu.be")) {
        videoId = parsed.pathname.slice(1);
      } else if (parsed.pathname.startsWith("/shorts/")) {
        videoId = parsed.pathname.split("/")[2];
      } else if (parsed.pathname.startsWith("/embed/")) {
        videoId = parsed.pathname.split("/")[2];
      } else {
        videoId = parsed.searchParams.get("v");
      }
      if (videoId) {
        return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function MediaAnalyzer() {
  const { t, locale } = useT();
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [analyzedUrl, setAnalyzedUrl] = useState("");
  const [state, setState] = useState<AnalyzerState>("idle");
  const [analysis, setAnalysis] = useState<MediaAnalysis | null>(null);
  const [selectedFormatId, setSelectedFormatId] = useState("");
  const [activeTab, setActiveTab] = useState<FormatTab>("video");
  const [errorMessage, setErrorMessage] = useState("");
  const [queueing, setQueueing] = useState(false);
  const [justQueued, setJustQueued] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxTab, setLightboxTab] = useState<"video" | "image">("video");
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [requestedAnalysisUrl, setRequestedAnalysisUrl] = useState("");

  const [isLoaded, setIsLoaded] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const queuedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const embedUrl = useMemo(() => getYouTubeEmbedUrl(analyzedUrl), [analyzedUrl]);

  // Handle ESC key to close Lightbox Modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowLightbox(false);
      }
    };
    if (showLightbox) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showLightbox]);

  // Clean up pending abort controller on unmount
  // Clean up pending abort controller and timers on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (queuedTimerRef.current) {
        clearTimeout(queuedTimerRef.current);
      }
    };
  }, []);

  // Sync state to sessionStorage to persist data when switching tabs/routes
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const requestedUrl = consumeRequestedMediaAnalysis();
      if (requestedUrl) {
        setUrl(requestedUrl);
        setRequestedAnalysisUrl(requestedUrl);
        return;
      }

      const savedUrl = sessionStorage.getItem("media_loader_analyzer_url");
      const savedAnalyzedUrl = sessionStorage.getItem(
        "media_loader_analyzer_analyzed_url"
      );
      const savedState = sessionStorage.getItem("media_loader_analyzer_state");
      const savedAnalysis = sessionStorage.getItem("media_loader_analyzer_analysis");
      const savedSelectedFormatId = sessionStorage.getItem(
        "media_loader_analyzer_selected_format_id"
      );
      const savedActiveTab = sessionStorage.getItem("media_loader_analyzer_active_tab");

      if (savedUrl) setUrl(savedUrl);
      if (savedAnalyzedUrl) setAnalyzedUrl(savedAnalyzedUrl);
      if (savedState) setState(savedState as AnalyzerState);
      if (savedAnalysis) setAnalysis(JSON.parse(savedAnalysis));
      if (savedSelectedFormatId) setSelectedFormatId(savedSelectedFormatId);
      if (savedActiveTab) setActiveTab(savedActiveTab as FormatTab);
    } catch (e) {
      console.warn("Failed to load media analyzer session state", e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (typeof window === "undefined") return;
    try {
      if (url) sessionStorage.setItem("media_loader_analyzer_url", url);
      else sessionStorage.removeItem("media_loader_analyzer_url");

      if (analyzedUrl)
        sessionStorage.setItem("media_loader_analyzer_analyzed_url", analyzedUrl);
      else sessionStorage.removeItem("media_loader_analyzer_analyzed_url");

      sessionStorage.setItem("media_loader_analyzer_state", state);

      if (analysis)
        sessionStorage.setItem(
          "media_loader_analyzer_analysis",
          JSON.stringify(analysis)
        );
      else sessionStorage.removeItem("media_loader_analyzer_analysis");

      if (selectedFormatId)
        sessionStorage.setItem(
          "media_loader_analyzer_selected_format_id",
          selectedFormatId
        );
      else sessionStorage.removeItem("media_loader_analyzer_selected_format_id");

      sessionStorage.setItem("media_loader_analyzer_active_tab", activeTab);
    } catch (e) {
      console.warn("Failed to save media analyzer session state", e);
    }
  }, [isLoaded, url, analyzedUrl, state, analysis, selectedFormatId, activeTab]);

  const media = analysis?.media;
  const sourceDomain = media?.source_domain;

  const isDomainRedundant = useMemo(() => {
    if (!sourceDomain || !media?.platform) return true;
    const p = media.platform.toLowerCase();
    const d = sourceDomain.toLowerCase();
    return d.includes(p) || p.includes(d.split(".")[0]);
  }, [sourceDomain, media?.platform]);

  const groupedFormats = useMemo(
    () => groupFormats(analysis?.formats ?? []),
    [analysis?.formats]
  );

  const audioSourceFormats = useMemo(
    () => getAudioSourceFormats(analysis?.formats ?? []),
    [analysis?.formats]
  );

  const selectedFormat = useMemo(
    () =>
      [...groupedFormats.video, ...groupedFormats.audio].find(
        (f) => f.format_id === selectedFormatId
      ) || null,
    [groupedFormats, selectedFormatId]
  );

  const visibleFormats =
    activeTab === "audio" ? audioSourceFormats : groupedFormats.video;
  const isGiphy = useMemo(() => {
    return (
      media?.platform?.toLowerCase() === "giphy" ||
      Boolean(sourceDomain?.toLowerCase().includes("giphy")) ||
      analyzedUrl.toLowerCase().includes("giphy.com")
    );
  }, [media?.platform, sourceDomain, analyzedUrl]);

  const availableTabs: readonly FormatTab[] = useMemo(() => {
    if (isGiphy) return ["gif"];
    if (media?.is_animated_gif) return ["gif", "video"];
    return ["video", "audio"];
  }, [isGiphy, media?.is_animated_gif]);

  const handleSelectFormat = useCallback((formatId: string) => {
    setSelectedFormatId(formatId);
    setJustQueued(false);
    if (queuedTimerRef.current) {
      clearTimeout(queuedTimerRef.current);
      queuedTimerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    // Cancel any pending analysis request
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

    if (queuedTimerRef.current) {
      clearTimeout(queuedTimerRef.current);
      queuedTimerRef.current = null;
    }
    setJustQueued(false);

    setUrl("");
    setState("idle");
    setAnalysis(null);
    setAnalyzedUrl("");
    setSelectedFormatId("");
    setActiveTab("video");
    setErrorMessage("");
    setShowLightbox(false);

    if (typeof window !== "undefined") {
      sessionStorage.removeItem("media_loader_analyzer_url");
      sessionStorage.removeItem("media_loader_analyzer_analyzed_url");
      sessionStorage.removeItem("media_loader_analyzer_state");
      sessionStorage.removeItem("media_loader_analyzer_analysis");
      sessionStorage.removeItem("media_loader_analyzer_selected_format_id");
      sessionStorage.removeItem("media_loader_analyzer_active_tab");
    }
  }, []);

  const analyze = useCallback(
    async (targetUrl?: string) => {
      const inputUrl = targetUrl !== undefined ? targetUrl : url;
      const convertedUrl = tryConvertThaiLayout(inputUrl);
      const validation = validateUrl(convertedUrl);
      if (!validation.valid) {
        setState("error");
        setErrorMessage(validation.error || t("download.failedDesc"));
        return;
      }

      // Cancel any previous requests
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setState("analyzing");
      setAnalysis(null);
      setAnalyzedUrl(validation.url);
      setSelectedFormatId("");
      setErrorMessage("");

      try {
        const result = await apiClient.analyzeMedia(validation.url, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;

        if (result) {
          setAnalysis(result);
          const hasFormats = result.formats && result.formats.length > 0;
          if (result.policy.decision === "blocked") {
            setState("blocked");
          } else if (!hasFormats) {
            setState("error");
            setErrorMessage(t("download.noFormats"));
          } else {
            setState("ready");
            toast(
              "success",
              t("download.policyPassed", {}, "ตรวจสอบสิทธิ์การดาวน์โหลดผ่านแล้ว")
            );
            const grouped = groupFormats(result.formats);
            const firstVideo = grouped.video[0];
            const firstAudio = grouped.audio[0];
            const isGiphyMedia =
              result.media?.platform?.toLowerCase() === "giphy" ||
              Boolean(result.media?.source_domain?.toLowerCase().includes("giphy")) ||
              validation.url.toLowerCase().includes("giphy.com");

            if (isGiphyMedia || result.media?.is_animated_gif) {
              setActiveTab("gif");
              if (firstVideo) {
                setSelectedFormatId(firstVideo.format_id);
              }
            } else if (firstVideo) {
              setActiveTab("video");
              setSelectedFormatId(firstVideo.format_id);
            } else if (firstAudio) {
              setActiveTab("audio");
              setSelectedFormatId(firstAudio.format_id);
            }
          }
        } else {
          setState("error");
          setErrorMessage(t("download.failedDesc"));
        }
      } catch (err: unknown) {
        const isAbort =
          controller.signal.aborted ||
          (err instanceof Error && err.name === "AbortError");
        if (isAbort) {
          // Suppress error reporting if the user aborted the request
          return;
        }
        console.warn("[Media Analysis Error]:", err);
        setState("error");
        const message = t(
          "download.failedDesc",
          {},
          "ไม่สามารถวิเคราะห์ข้อมูลสื่อจากลิงก์นี้ได้ โปรดตรวจสอบความถูกต้องของ URL หรือลองใหม่อีกครั้ง"
        );
        setErrorMessage(message);
        toast("error", t("download.failed"), message);
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    [url, toast, t]
  );

  useEffect(() => {
    if (!isLoaded || !requestedAnalysisUrl) return;
    setRequestedAnalysisUrl("");
    void analyze(requestedAnalysisUrl);
  }, [analyze, isLoaded, requestedAnalysisUrl]);

  const startDownload = useCallback(async () => {
    if (!analyzedUrl || !selectedFormat || !media) return;

    const outputFormat =
      activeTab === "audio"
        ? "mp3"
        : activeTab === "gif" && media.is_animated_gif
          ? "gif"
          : "mp4";
    const filename = safeDownloadFilename(media.title, outputFormat);
    setQueueing(true);
    try {
      const job = await apiClient.createJob({
        url: analyzedUrl,
        selected_format_id: selectedFormat.format_id,
        output_format: outputFormat,
        rights_confirmed: true,
      });
      if (job) {
        registerPendingDownload(job.job_id, filename, null);
        setJustQueued(true);
        if (queuedTimerRef.current) {
          clearTimeout(queuedTimerRef.current);
        }
        queuedTimerRef.current = setTimeout(() => {
          setJustQueued(false);
          queuedTimerRef.current = null;
        }, 2500);
        toast("success", t("download.queued"), t("download.queuedDesc"));

        const optimisticJob = {
          id: job.job_id,
          original_url: analyzedUrl,
          source_domain: media.source_domain,
          platform: media.platform,
          title: media.title,
          uploader: media.uploader,
          duration_seconds: media.duration_seconds,
          thumbnail_url: media.thumbnail_url,
          status: job.status || "QUEUED",
          progress: 0,
          selected_format: selectedFormat.quality_label || selectedFormat.format_id,
          selected_quality: selectedFormat.quality_label,
          output_format: outputFormat,
          created_at: new Date().toISOString(),
        };

        window.dispatchEvent(
          new CustomEvent("media-loader:jobs-changed", {
            detail: { job: optimisticJob },
          })
        );

        // The queue renders below the analyzer, so bring it into view once
        // the optimistic job has been painted.
        window.requestAnimationFrame(() => {
          window.setTimeout(() => {
            const target =
              document.getElementById("download-queue-anchor") ||
              document.getElementById("download-queue");
            if (!target) return;
            const reduceMotion =
              typeof window.matchMedia === "function" &&
              window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            target.scrollIntoView({
              behavior: reduceMotion ? "auto" : "smooth",
              block: "start",
            });
          }, 120);
        });
      } else {
        toast("error", t("download.queueFailed"), t("download.queueFailedDesc"));
      }
    } catch (err) {
      console.warn("[Start Download Error]:", err);
      if (
        err instanceof ApiError &&
        (err.code === "TOO_MANY_REQUESTS" || err.status === 429)
      ) {
        toast(
          "error",
          t("download.rateLimited"),
          t("download.rateLimitedDesc", {
            seconds: err.retryAfterSeconds ?? 60,
          })
        );
      } else {
        const message =
          err instanceof Error && err.message.trim()
            ? err.message
            : t("download.queueFailedDesc");
        toast("error", t("download.queueFailed"), message);
      }
    } finally {
      setQueueing(false);
    }
  }, [activeTab, analyzedUrl, media, selectedFormat, t, toast]);

  return (
    <div className="w-full">
      <MediaUrlInput
        value={url}
        onChange={setUrl}
        onClear={reset}
        onSubmit={() => void analyze()}
        analyzing={state === "analyzing"}
        onPaste={(text) => {
          const converted = tryConvertThaiLayout(text);
          setUrl(converted);
          void analyze(converted);
        }}
      />

      {/* ── Analyzing skeleton ── */}
      {state === "analyzing" && <AnalyzerSkeleton />}

      {/* ── Error ── */}
      {state === "error" && (
        <div className="flex gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-rose-500 dark:text-rose-400" />
          <div>
            <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">
              {t("download.failed")}
            </p>
            <p className="mt-1 text-xs leading-5 text-rose-700/80 dark:text-rose-300/70">
              {errorMessage || t("download.failedDesc")}
            </p>
          </div>
        </div>
      )}

      {/* ── Blocked ── */}
      {state === "blocked" && analysis?.policy && (
        <div className="flex gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-rose-500 dark:text-rose-400" />
          <div>
            <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">
              {t("download.blocked")}
            </p>
            <p className="mt-1 text-xs leading-5 text-rose-700/80 dark:text-rose-300/70">
              {analysis.policy.reason}
            </p>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {/* ── Results (Clean, borderless inner sections to eliminate nested frames) ── */}
      {state === "ready" && analysis && media && (
        <div className="space-y-6">
          {/* Media Info Section */}
          <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[200px_1fr] sm:gap-4 lg:gap-6 xl:grid-cols-[240px_1fr]">
            {/* Clean Thumbnail Card -> Click to open Fullscreen Viewer */}
            {media.thumbnail_url ? (
              <button
                type="button"
                onClick={() => {
                  setLightboxTab(embedUrl ? "video" : "image");
                  setShowLightbox(true);
                }}
                title={t("download.viewMedia", {}, "คลิกเพื่อรับชมมีเดียแบบเต็มจอ")}
                aria-label={t(
                  "download.viewMedia",
                  {},
                  "คลิกเพื่อรับชมมีเดียแบบเต็มจอ"
                )}
                className="group block aspect-video w-full overflow-hidden rounded-xl border border-border/80 bg-bg-surface text-left transition-all duration-200 hover:border-primary/50 active:scale-[0.99] sm:rounded-[1.25rem] cursor-pointer"
              >
                {/* The analyzed thumbnail is the dashboard's LCP image. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={media.thumbnail_url}
                  alt=""
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="h-full w-full object-cover object-center transition-transform duration-200 group-hover:scale-[1.01]"
                />
              </button>
            ) : (
              <div className="grid aspect-video place-items-center rounded-xl border border-border bg-bg-surface/50 sm:rounded-[1.25rem]">
                <Film className="size-8 text-text-dim" />
              </div>
            )}

            {/* Info */}
            <div className="flex flex-col justify-center min-w-0 py-0.5">
              <h2 className="line-clamp-3 text-base font-semibold leading-snug tracking-tight text-text sm:text-lg lg:text-xl">
                {media.title}
              </h2>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:mt-3 sm:gap-x-4 sm:gap-y-2">
                {media.uploader && (
                  <span className="flex items-center gap-1.5 text-xs text-text-muted sm:text-sm">
                    <UserRound className="size-3.5 shrink-0 text-text-dim" />
                    {media.uploader}
                  </span>
                )}
                {sourceDomain && !isDomainRedundant && (
                  <span className="flex items-center gap-1.5 text-xs text-text-muted sm:text-sm">
                    <Globe2 className="size-3.5 shrink-0 text-text-dim" />
                    {sourceDomain}
                  </span>
                )}
                {formatDuration(media.duration_seconds) && (
                  <span className="flex items-center gap-1.5 text-xs text-text-muted sm:text-sm">
                    <Clock3 className="size-3.5 shrink-0 text-text-dim" />
                    {formatDuration(media.duration_seconds)}
                  </span>
                )}
                {formatViews(media.view_count, locale) && (
                  <span className="flex items-center gap-1.5 text-xs text-text-muted sm:text-sm">
                    <Eye className="size-3.5 shrink-0 text-text-dim" />
                    {formatViews(media.view_count, locale)}
                  </span>
                )}
                {(formatLikes(media.like_count, locale) ??
                  formatReactions(media.reaction_count, locale)) && (
                  <span className="flex items-center gap-1.5 text-xs text-text-muted sm:text-sm">
                    <Heart className="size-3.5 shrink-0 text-text-dim" />
                    {formatLikes(media.like_count, locale) ??
                      formatReactions(media.reaction_count, locale)}
                  </span>
                )}
                {media.platform && (
                  <span className="rounded-lg bg-bg-surface border border-border/80 px-2 py-0.5 text-[11px] font-medium text-text-muted">
                    {media.platform}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Format Selector Section (Seamless border-t divider, 100% full-width grid) */}
          <div className="border-t border-border/70 pt-5">
            {/* Video / Audio tab Header */}
            <div className="mb-3.5 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                {t("download.quality")}
              </p>
              <div className="flex gap-1 rounded-xl border border-border/80 bg-bg-base/60 p-1">
                {availableTabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab);
                      const formats =
                        tab === "audio" ? audioSourceFormats : groupedFormats.video;
                      handleSelectFormat(formats[0]?.format_id || "");
                    }}
                    disabled={
                      (tab === "audio" ? audioSourceFormats : groupedFormats.video)
                        .length === 0
                    }
                    className={`min-h-9 rounded-lg px-3.5 py-1 text-xs font-semibold transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30 ${
                      activeTab === tab
                        ? "bg-primary text-primary-foreground"
                        : "text-text-muted hover:text-text"
                    }`}
                  >
                    {tab === "video"
                      ? `${t("download.video")} (MP4)`
                      : tab === "audio"
                        ? `${t("download.audio")} (MP3)`
                        : "GIF"}
                  </button>
                ))}
              </div>
            </div>

            {/* 100% Full-Width Format Grid (Balanced 4-col layout for 8 quality options) */}
            {visibleFormats.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-dim">
                {t("download.noFormats")}
              </p>
            ) : (
              <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
                {visibleFormats.map((format, index) => (
                  <FormatCard
                    key={`${format.type}-${format.format_id}`}
                    format={format}
                    durationSeconds={media.duration_seconds}
                    selected={selectedFormatId === format.format_id}
                    onSelect={() => handleSelectFormat(format.format_id)}
                    isBest={index === 0}
                    isGif={activeTab === "gif"}
                  />
                ))}
              </div>
            )}

            {/* Download Action Footer */}
            <div className="mt-5 flex justify-end">
              <div className="flex w-full flex-col items-stretch sm:w-auto sm:items-end">
                <Button
                  type="button"
                  onClick={() => void startDownload()}
                  disabled={!selectedFormat || queueing}
                  className={`h-11 w-full rounded-lg px-8 text-xs font-semibold sm:w-50 cursor-pointer transition-all ${
                    justQueued
                      ? "border-emerald-500/40 bg-emerald-600/90 hover:bg-emerald-600 text-white"
                      : ""
                  }`}
                >
                  {queueing ? (
                    <LoadingIndicator label={t("download.preparing")} />
                  ) : justQueued ? (
                    <>
                      <CheckCircle2 className="size-4 text-white" />
                      {t("download.queued", {}, "เพิ่มเข้าคิวแล้ว")}
                    </>
                  ) : (
                    <>
                      <Download className="size-4" />
                      {t("download.confirmAndDownload")}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Unified Media Viewer Lightbox Overlay ── */}
      {showLightbox &&
        media?.thumbnail_url &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            onClick={() => setShowLightbox(false)}
            className="fixed inset-0 z-9999 flex h-full w-full items-center justify-center bg-black/85 p-3 sm:p-6 transition-all duration-200 animate-fade-in-up backdrop-blur-md"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              data-testid="media-viewer-lightbox"
              className="ui-panel relative flex flex-col max-h-[92vh] w-full max-w-4xl items-center justify-center overflow-hidden rounded-3xl border border-border/80 bg-bg-surface p-3 shadow-2xl sm:p-5"
            >
              {/* Header Action Bar */}
              <div className="mb-3 grid w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2.5 gap-y-2.5 border-b border-border/60 px-1 pb-3 sm:flex sm:items-center sm:justify-between">
                {embedUrl ? (
                  <div className="col-start-1 row-start-1 flex min-w-0 gap-1 rounded-xl border border-border/80 bg-bg-base/70 p-1 sm:order-1">
                    <button
                      type="button"
                      onClick={() => {
                        setLightboxTab("video");
                        setIsVideoLoading(true);
                      }}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                        lightboxTab === "video"
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-text-muted hover:text-text"
                      }`}
                    >
                      <Play className="size-3.5 fill-current" />
                      <span>{t("download.playPreview", {}, "เล่นตัวอย่าง")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLightboxTab("image")}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                        lightboxTab === "image"
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-text-muted hover:text-text"
                      }`}
                    >
                      <Film className="size-3.5" />
                      <span>{t("download.thumbnailPreview", {}, "รูปภาพหน้าปก")}</span>
                    </button>
                  </div>
                ) : (
                  <span className="col-start-1 row-start-1 min-w-0 truncate text-xs font-semibold text-text-muted sm:order-1">
                    {t("download.thumbnailPreview", {}, "รูปภาพหน้าปก")}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setShowLightbox(false)}
                  data-testid="media-viewer-close"
                  aria-label={t("common.close", {}, "ปิด")}
                  className="col-start-2 row-start-1 grid size-11 shrink-0 place-items-center rounded-full border border-border/70 bg-bg-base/70 text-text shadow-sm transition-colors hover:bg-bg-surface active:scale-95 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary cursor-pointer sm:order-3 sm:size-9 sm:rounded-lg sm:border-transparent sm:bg-transparent sm:text-text-muted sm:shadow-none"
                >
                  <X className="size-5 sm:size-4" />
                </button>

                {lightboxTab === "image" && (
                  <div className="col-span-2 flex justify-end sm:order-2 sm:ml-auto sm:col-span-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      data-testid="media-viewer-download"
                      onClick={async () => {
                        try {
                          const res = await fetch(media.thumbnail_url!);
                          const blob = await res.blob();
                          const blobUrl = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = blobUrl;
                          a.download = safeDownloadFilename(media.title, "jpg");
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(blobUrl);
                        } catch {
                          if (media.thumbnail_url)
                            window.open(media.thumbnail_url, "_blank");
                        }
                      }}
                      className="h-9 gap-1.5 rounded-xl px-3 text-xs font-semibold cursor-pointer"
                    >
                      <Download className="size-3.5 text-primary" />
                      <span>{t("download.saveImage", {}, "ดาวน์โหลดรูป")}</span>
                    </Button>
                  </div>
                )}
              </div>

              {/* Main Content Area */}
              <div className="flex w-full flex-1 items-center justify-center overflow-hidden">
                {lightboxTab === "video" && embedUrl ? (
                  <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border/80 bg-black shadow-lg">
                    {isVideoLoading && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/90 text-white backdrop-blur-xs transition-opacity duration-300">
                        <LoadingIndicator
                          label={t(
                            "download.connectingVideo",
                            {},
                            "กำลังเชื่อมต่อวิดีโอตัวอย่าง..."
                          )}
                          className="text-xs font-medium text-primary"
                        />
                      </div>
                    )}
                    <iframe
                      src={embedUrl}
                      title={media.title}
                      onLoad={() => setIsVideoLoading(false)}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="h-full w-full border-0"
                    />
                  </div>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={media.thumbnail_url}
                    alt={media.title}
                    className="block max-h-[75vh] max-w-full rounded-2xl object-contain shadow-md"
                  />
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
