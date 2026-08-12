"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardPaste,
  Clock3,
  Download,
  Eye,
  Film,
  Globe2,
  Heart,
  Info,
  Play,
  Search,
  ShieldAlert,
  UserRound,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { LoadingIndicator } from "@/components/loading-indicator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/toast";
import { apiClient, type MediaAnalysis } from "@/lib/api-client";
import { registerPendingDownload } from "@/lib/download-coordinator";
import { consumeRequestedMediaAnalysis } from "@/lib/analyzer-session";
import { groupFormats, type MediaFormat } from "@/lib/media-presenters.ts";
import { useT } from "@/lib/i18n/context";
import { validateUrl } from "@/lib/url-validation";

type AnalyzerState = "idle" | "analyzing" | "ready" | "blocked" | "error";
type FormatTab = "video" | "audio";

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

function formatViews(views?: number | null, locale?: string) {
  if (views === undefined || views === null || views < 0) return null;
  if (locale === "th") {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)} ล้านวิว`;
    if (views >= 10000) return `${(views / 10000).toFixed(1)} หมื่นวิว`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)} พันวิว`;
    return `${views.toLocaleString()} วิว`;
  } else {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M views`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K views`;
    return `${views.toLocaleString()} views`;
  }
}

function formatLikes(likes?: number | null, locale?: string) {
  if (likes === undefined || likes === null || likes < 0) return null;
  const compact = (value: number) => value.toFixed(1).replace(/\.0$/, "");

  if (locale === "th") {
    if (likes >= 1000000000) return `${compact(likes / 1000000000)} พันล้านไลก์`;
    if (likes >= 1000000) return `${compact(likes / 1000000)} ล้านไลก์`;
    if (likes >= 100000) return `${compact(likes / 100000)} แสนไลก์`;
    if (likes >= 10000) return `${compact(likes / 10000)} หมื่นไลก์`;
    if (likes >= 1000) return `${compact(likes / 1000)} พันไลก์`;
    return `${likes.toLocaleString()} ไลก์`;
  }

  if (likes >= 1000000000) return `${compact(likes / 1000000000)}B likes`;
  if (likes >= 1000000) return `${compact(likes / 1000000)}M likes`;
  if (likes >= 1000) return `${compact(likes / 1000)}K likes`;
  return `${likes.toLocaleString()} likes`;
}



function formatCardTitle(format: MediaFormat) {
  if (format.type === "video") {
    // For vertical videos (Reels/Shorts where height > width), use width as the resolution (e.g., 1080x1920 -> 1080p)
    const effectiveRes = (format.width && format.height && format.height > format.width)
      ? format.width
      : format.height;

    if (effectiveRes) {
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

function getAudioQualityLabel(
  bitrate: number,
  t: (key: string, vars?: Record<string, string | number>, fallback?: string) => string,
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

function estimateFilesize(format: MediaFormat, durationSeconds?: number | null): string | null {
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
    if (res >= 2160) estBitrateKbps = 12000;
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
  t: (key: string, vars?: Record<string, string | number>, fallback?: string) => string,
) {
  const sizeLabel = estimateFilesize(format, durationSeconds);
  const pieces = [
    format.type === "video" && format.fps && format.fps > 30
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
  return `${title || "media"}.${extension}`.replace(
    /[<>:"/\\|?*\u0000-\u001F]/g,
    "_",
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AnalyzerSkeleton() {
  const { t } = useT();
  return (
    <div className="mt-5 space-y-3">
      <LoadingIndicator
        label={t("download.analyzing", {}, "กำลังวิเคราะห์...")}
        className="text-sm text-primary"
      />
      <div className="grid gap-4 rounded-2xl border border-border bg-bg-surface/55 p-4 sm:grid-cols-[240px_1fr]">
        <Skeleton className="aspect-video w-full rounded-xl bg-bg-base/80" />
        <div className="space-y-3 py-1">
          <Skeleton className="h-5 w-3/4 rounded-lg bg-bg-base/80" />
          <Skeleton className="h-4 w-1/2 rounded-lg bg-bg-base/60" />
          <Skeleton className="h-4 w-2/3 rounded-lg bg-bg-base/60" />
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-xl bg-bg-surface/80 border border-border/40" />
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
}: {
  format: MediaFormat;
  durationSeconds?: number | null;
  selected: boolean;
  onSelect: () => void;
}) {
  const { t } = useT();
  const meta = formatCardMeta(format, durationSeconds, t) || (format.type === "video" ? t("download.videoFormat", {}, "สตรีมมิ่ง HD") : t("download.audioFormat", {}, "ไฟล์เสียง MP3"));

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-colors duration-150 cursor-pointer ${
        selected
          ? "border-primary bg-primary/10 text-primary font-semibold"
          : "border-border bg-bg-base/40 text-text hover:border-border-hover hover:bg-bg-surface"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold leading-tight text-text">
          {formatCardTitle(format)}
        </p>
        <p className="mt-0.5 line-clamp-3 text-[11px] leading-tight text-text-muted">{meta}</p>
      </div>
      {selected && <CheckCircle2 className="size-3.5 shrink-0 text-primary" />}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function tryConvertThaiLayout(text: string): string {
  if (!text || !/[\u0e00-\u0e7f]/.test(text)) {
    return text;
  }
  const map: Record<string, string> = {
    // Normal keys (unshifted)
    'ๅ': '1', 'ภ': '2', 'ถ': '3', 'ุ': '4', 'ึ': '5', 'ค': '6', 'ต': '7', 'จ': '8', 'ข': '9', 'ช': '0',
    'ๆ': 'q', 'ไ': 'w', 'ำ': 'e', 'พ': 'r', 'ะ': 't', 'ั': 'y', 'ี': 'u', 'ร': 'i', 'น': 'o', 'ย': 'p', 'บ': '[', 'ล': ']', 'ฃ': '\\',
    'ฟ': 'a', 'ห': 's', 'ก': 'd', 'ด': 'f', 'เ': 'g', '้': 'h', '่': 'j', 'า': 'k', 'ส': 'l', 'ว': ';', 'ง': '\'',
    'ผ': 'z', 'ป': 'x', 'แ': 'c', 'อ': 'v', 'ิ': 'b', 'ื': 'n', 'ท': 'm', 'ม': ',', 'ใ': '.', 'ฝ': '/',
    // Shifted keys
    '+': '!', '๑': '@', '๒': '#', '๓': '$', '๔': '%', 'ู': '^', '฿': '&', '๕': '*', '๖': '(', '๗': ')', '๘': '_', '๙': '+',
    '๐': 'Q', '"': 'W', 'ฎ': 'E', 'ฑ': 'R', 'ธ': 'T', 'ํ': 'Y', '๊': 'U', 'ณ': 'I', 'ฯ': 'O', 'ญ': 'P', 'ฐ': '{',
    'ฤ': 'A', 'ฆ': 'S', 'ฏ': 'D', 'โ': 'F', 'ฌ': 'G', '็': 'H', '๋': 'J', 'ษ': 'K', 'ศ': 'L', 'ซ': ':'
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
    if (parsed.hostname.includes("youtube.com") || parsed.hostname.includes("youtu.be")) {
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
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxTab, setLightboxTab] = useState<"video" | "image">("video");
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [requestedAnalysisUrl, setRequestedAnalysisUrl] = useState("");

  const [isLoaded, setIsLoaded] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

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
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
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
      const savedAnalyzedUrl = sessionStorage.getItem("media_loader_analyzer_analyzed_url");
      const savedState = sessionStorage.getItem("media_loader_analyzer_state");
      const savedAnalysis = sessionStorage.getItem("media_loader_analyzer_analysis");
      const savedSelectedFormatId = sessionStorage.getItem("media_loader_analyzer_selected_format_id");
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

      if (analyzedUrl) sessionStorage.setItem("media_loader_analyzer_analyzed_url", analyzedUrl);
      else sessionStorage.removeItem("media_loader_analyzer_analyzed_url");

      sessionStorage.setItem("media_loader_analyzer_state", state);

      if (analysis) sessionStorage.setItem("media_loader_analyzer_analysis", JSON.stringify(analysis));
      else sessionStorage.removeItem("media_loader_analyzer_analysis");

      if (selectedFormatId) sessionStorage.setItem("media_loader_analyzer_selected_format_id", selectedFormatId);
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
    [analysis?.formats],
  );

  const selectedFormat = useMemo(
    () =>
      [...groupedFormats.video, ...groupedFormats.audio].find(
        (f) => f.format_id === selectedFormatId,
      ) || null,
    [groupedFormats, selectedFormatId],
  );

  const visibleFormats = groupedFormats[activeTab] || [];

  const reset = useCallback(() => {
    // Cancel any pending analysis request
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

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

  const analyze = useCallback(async (targetUrl?: string) => {
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
      const result = await apiClient.analyzeMedia(validation.url, { signal: controller.signal });
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
          toast("success", t("download.policyPassed", {}, "ตรวจสอบสิทธิ์การดาวน์โหลดผ่านแล้ว"));
          const grouped = groupFormats(result.formats);
          const firstVideo = grouped.video[0];
          const firstAudio = grouped.audio[0];
          if (firstVideo) {
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
      const message =
        err instanceof Error && err.message
          ? err.message
          : t("download.failedDesc");
      setErrorMessage(message);
      toast("error", t("download.failed"), message);
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [url, toast, t]);

  useEffect(() => {
    if (!isLoaded || !requestedAnalysisUrl) return;
    setRequestedAnalysisUrl("");
    void analyze(requestedAnalysisUrl);
  }, [analyze, isLoaded, requestedAnalysisUrl]);

  const startDownload = useCallback(async () => {
    if (!analyzedUrl || !selectedFormat || !media) return;

    const outputFormat = selectedFormat.type === "audio" ? "mp3" : "mp4";
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
        window.dispatchEvent(new CustomEvent("media-loader:jobs-changed"));
        toast("success", t("download.started"), t("download.startedDesc"));
      } else {
        toast("error", t("download.failed"), t("download.failedDesc"));
      }
    } catch (err) {
      console.warn("[Start Download Error]:", err);
      toast("error", t("download.failed"), t("error.genericDesc"));
    } finally {
      setQueueing(false);
    }
  }, [analyzedUrl, media, selectedFormat, t, toast]);

  return (
    <div className="w-full">
      {/* ── Search bar hero ── */}
      <div className="mb-5">
        <p className="ui-kicker mb-3">
          {t("download.placeholderLabel", {}, "วางลิงก์วิดีโอหรือเสียง")}
        </p>
        <div className="group flex min-h-16 gap-2 rounded-2xl border border-border bg-bg-surface/60 p-2 shadow-xs transition-all duration-200 focus-within:border-primary/60 focus-within:bg-bg-elevated focus-within:ring-3 focus-within:ring-primary/15">
          <span className="grid size-11 shrink-0 place-items-center self-center rounded-xl bg-primary/12 text-primary">
            <Search className="size-5" />
          </span>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                void analyze();
              }
            }}
            placeholder="https://..."
            className="min-w-0 flex-1 bg-transparent py-2 text-base font-medium text-text placeholder:font-normal placeholder:text-text-dim outline-none sm:text-lg"
            aria-label={t("download.placeholder")}
          />
          {url ? (
            <button
              type="button"
              onClick={() => {
                setUrl("");
                reset();
              }}
              className="grid min-h-11 min-w-11 place-items-center rounded-xl text-xs text-text-muted transition-colors hover:text-text cursor-pointer"
              aria-label={t("download.clear")}
            >
              <X className="size-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  if (text) {
                    const converted = tryConvertThaiLayout(text);
                    setUrl(converted);
                    if (converted.trim()) {
                      void analyze(converted);
                    }
                  }
                } catch (err) {
                  console.warn("[Paste Action Error]: Clipboard access denied or empty", err);
                }
              }}
              title={t("download.pasteTitle", {}, "คัดลอกลิงก์แล้วกดวาง")}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-primary/35 bg-primary/10 px-3 text-xs font-semibold text-primary transition-all duration-200 hover:border-primary/50 hover:bg-primary/20 active:scale-95 cursor-pointer"
            >
              <ClipboardPaste className="size-3.5 shrink-0" />
              <span>{t("download.paste", {}, "วางลิงก์")}</span>
            </button>
          )}
        </div>
        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-border/70 bg-bg-surface/40 px-3.5 py-2.5 text-[11px] leading-relaxed text-text-muted">
          <Info className="mt-0.5 size-3.5 shrink-0 text-primary" />
          <p className="font-medium">
            {t("download.policyNote")}
          </p>
        </div>
      </div>

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
          <div className="grid gap-4 sm:grid-cols-[200px_1fr] lg:gap-6 xl:grid-cols-[240px_1fr]">
            {/* Clean Thumbnail Card -> Click to open Fullscreen Viewer */}
            {media.thumbnail_url ? (
              <button
                type="button"
                onClick={() => {
                  setLightboxTab(embedUrl ? "video" : "image");
                  setShowLightbox(true);
                }}
                title={t("download.viewMedia", {}, "คลิกเพื่อรับชมมีเดียแบบเต็มจอ")}
                className="group block aspect-video w-full overflow-hidden rounded-2xl border border-border/80 bg-cover bg-center text-left shadow-md transition-all duration-200 hover:border-primary/50 hover:shadow-lg active:scale-[0.99] cursor-pointer"
                style={{ backgroundImage: `url("${media.thumbnail_url}")` }}
              />
            ) : (
              <div className="grid aspect-video place-items-center rounded-2xl border border-border bg-bg-surface/50">
                <Film className="size-8 text-text-dim" />
              </div>
            )}

            {/* Info */}
            <div className="flex flex-col justify-center min-w-0 py-0.5">
              <h2 className="line-clamp-3 text-base font-semibold leading-snug tracking-tight text-text sm:text-lg lg:text-xl">
                {media.title}
              </h2>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
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
                {formatLikes(media.like_count, locale) && (
                  <span className="flex items-center gap-1.5 text-xs text-text-muted sm:text-sm">
                    <Heart className="size-3.5 shrink-0 text-text-dim" />
                    {formatLikes(media.like_count, locale)}
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
              <p className="text-xs font-semibold uppercase tracking-wider text-text-dim">
                {t("download.quality")}
              </p>
              <div className="flex gap-1 rounded-xl border border-border/80 bg-bg-base/60 p-1">
                {(["video", "audio"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab);
                      setSelectedFormatId(groupedFormats[tab][0]?.format_id || "");
                    }}
                    disabled={groupedFormats[tab].length === 0}
                    className={`min-h-9 rounded-lg px-3.5 py-1 text-xs font-semibold transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30 ${
                      activeTab === tab
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-text-muted hover:text-text"
                    }`}
                  >
                    {tab === "video"
                      ? `${t("download.video")} (MP4)`
                      : `${t("download.audio")} (MP3)`}
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
                {visibleFormats.map((format) => (
                  <FormatCard
                    key={`${format.type}-${format.format_id}`}
                    format={format}
                    durationSeconds={media.duration_seconds}
                    selected={selectedFormatId === format.format_id}
                    onSelect={() => setSelectedFormatId(format.format_id)}
                  />
                ))}
              </div>
            )}

            {/* Download Action Footer (Right-aligned, comfortable width on desktop/Windows) */}
            <div className="mt-5 flex justify-end">
              <div className="w-full sm:w-auto">
                <Button
                  type="button"
                  onClick={() => void startDownload()}
                  disabled={!selectedFormat || queueing}
                  aria-describedby="download-consent"
                  className="h-11 w-full rounded-xl px-8 text-xs font-semibold sm:w-auto sm:min-w-[200px] cursor-pointer"
                >
                  {queueing ? (
                    <LoadingIndicator label={t("download.preparing")} />
                  ) : (
                    <>
                      <Download className="size-4" />
                      {t("download.download")}
                    </>
                  )}
                </Button>
                <p id="download-consent" className="mt-1.5 text-center text-[10px] leading-relaxed text-text-dim">
                  {t("download.downloadConsent")}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Unified Media Viewer Lightbox Overlay ── */}
      {showLightbox && media?.thumbnail_url && typeof window !== "undefined" && createPortal(
        <div
          onClick={() => setShowLightbox(false)}
          className="fixed inset-0 z-9999 flex h-full w-full items-center justify-center bg-black/85 p-3 sm:p-6 transition-all duration-200 animate-fade-in-up backdrop-blur-md"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="ui-panel relative flex flex-col max-h-[92vh] w-full max-w-4xl items-center justify-center overflow-hidden rounded-3xl border border-border/80 bg-bg-surface p-3 shadow-2xl sm:p-5"
          >
            {/* Header Action Bar */}
            <div className="mb-3 flex w-full flex-wrap items-center justify-between gap-2.5 border-b border-border/60 pb-3 px-1">
              {embedUrl ? (
                <div className="flex gap-1 rounded-xl border border-border/80 bg-bg-base/70 p-1">
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
                <span className="truncate text-xs font-semibold text-text-muted">
                  {t("download.thumbnailPreview", {}, "รูปภาพหน้าปก")}
                </span>
              )}

              <div className="flex items-center gap-2 ml-auto">
                {lightboxTab === "image" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
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
                        if (media.thumbnail_url) window.open(media.thumbnail_url, "_blank");
                      }
                    }}
                    className="h-9 gap-1.5 rounded-xl px-3 text-xs font-semibold cursor-pointer"
                  >
                    <Download className="size-3.5 text-primary" />
                    <span>{t("download.saveImage", {}, "ดาวน์โหลดรูป")}</span>
                  </Button>
                )}
                <button
                  type="button"
                  onClick={() => setShowLightbox(false)}
                  aria-label={t("common.close", {}, "ปิด")}
                  className="grid size-9 place-items-center rounded-xl border border-border bg-bg-base/80 text-text-muted transition-colors hover:bg-bg-surface hover:text-text cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex w-full flex-1 items-center justify-center overflow-hidden">
              {lightboxTab === "video" && embedUrl ? (
                <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border/80 bg-black shadow-lg">
                  {isVideoLoading && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/90 text-white backdrop-blur-xs transition-opacity duration-300">
                      <LoadingIndicator
                        label={t("download.connectingVideo", {}, "กำลังเชื่อมต่อวิดีโอตัวอย่าง...")}
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
