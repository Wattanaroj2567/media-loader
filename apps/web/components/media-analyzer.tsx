"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  Film,
  Globe2,
  Headphones,
  Info,
  Loader2,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/toast";
import { apiClient, type MediaAnalysis } from "@/lib/api-client";
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

function formatCodec(codec?: string | null) {
  if (!codec || codec === "none") return null;
  const c = codec.toLowerCase();
  if (c.startsWith("avc") || c.startsWith("h264")) return "H.264";
  if (c.startsWith("vp09") || c.startsWith("vp9")) return "VP9";
  if (c.startsWith("av01")) return "AV1";
  if (c.startsWith("hev") || c.startsWith("h265") || c.startsWith("hevc")) return "H.265";
  if (c.startsWith("mp4a") || c.startsWith("aac")) return "AAC";
  if (c.startsWith("opus")) return "Opus";
  return null;
}

function formatCardTitle(format: MediaFormat) {
  if (format.quality_label) return format.quality_label;
  if (format.type === "video" && format.height) return `${format.height}p`;
  if (format.type === "audio" && format.bitrate)
    return `${Math.round(format.bitrate)} kbps`;
  return format.format_id;
}

function getAudioQualityLabel(
  bitrate: number,
  t: (key: string, vars?: Record<string, string | number>, fallback?: string) => string,
) {
  if (bitrate >= 120) {
    return t("download.audioHigh", {}, "คุณภาพสูง (ดีที่สุด)");
  }
  return t("download.audioLow", {}, "คุณภาพประหยัด (ต่ำ)");
}

function formatCardMeta(
  format: MediaFormat,
  t: (key: string, vars?: Record<string, string | number>, fallback?: string) => string,
) {
  const pieces = [
    format.type === "audio" ? "MP3" : format.extension?.toUpperCase(),
    format.type === "video" ? formatCodec(format.video_codec) : null,
    format.type === "video" && format.fps
      ? `${format.fps} ${t("download.fps")}`
      : null,
    format.type === "audio" && format.bitrate
      ? getAudioQualityLabel(format.bitrate, t)
      : null,
    format.filesize ? formatBytes(format.filesize) : null,
  ].filter(Boolean);
  return pieces.join(" · ");
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AnalyzerSkeleton() {
  const { t } = useT();
  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center gap-2 text-sm text-primary">
        <Loader2 className="size-4 animate-spin" />
        <span>{t("download.analyzing", {}, "กำลังวิเคราะห์...")}</span>
      </div>
      <div className="grid gap-3 rounded-2xl border border-border bg-bg-surface p-4 shadow-sm sm:grid-cols-[280px_1fr]">
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
  selected,
  onSelect,
}: {
  format: MediaFormat;
  selected: boolean;
  onSelect: () => void;
}) {
  const { t } = useT();
  const Icon = format.type === "audio" ? Headphones : Film;
  const meta = formatCardMeta(format, t) || t("common.unknown");

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
        selected
          ? "border-primary/40 bg-primary/8"
          : "border-border bg-bg-surface/60 hover:border-primary/30 hover:bg-bg-surface shadow-xs"
      }`}
    >
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-lg ${
          selected
            ? "bg-primary/15 text-primary"
            : "bg-bg-surface text-text-dim"
        }`}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text">
          {formatCardTitle(format)}
        </p>
        <p className="mt-0.5 truncate text-xs text-text-muted">{meta}</p>
      </div>
      {selected && <CheckCircle2 className="size-4 shrink-0 text-primary" />}
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

  const [isLoaded, setIsLoaded] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

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
      setErrorMessage(t("download.failedDesc"));
      toast("error", t("download.failed"), t("download.failedDesc"));
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [url, toast, t]);

  const queueJob = useCallback(async () => {
    if (!analyzedUrl || !selectedFormat) return;
    setQueueing(true);
    try {
      const ok = await apiClient.createJob({
        url: analyzedUrl,
        selected_format_id: selectedFormat.format_id,
        output_format: selectedFormat.type === "audio" ? "mp3" : "mp4",
        rights_confirmed: true,
      });
      if (ok) {
        toast("success", t("download.queued"), t("download.queuedDesc"));
        reset();
      } else {
        toast("error", t("download.failed"), t("download.failedDesc"));
      }
    } catch (err) {
      console.warn("[Queue Job Error]:", err);
      toast("error", t("download.failed"), t("error.genericDesc"));
    } finally {
      setQueueing(false);
    }
  }, [analyzedUrl, selectedFormat, toast, t, reset]);

  return (
    <div className="w-full">
      {/* ── Search bar hero ── */}
      <div className="mb-4">
        <p className="mb-3 text-xs font-medium text-text-muted">
          {t("download.placeholderLabel", {}, "วางลิงก์วิดีโอหรือเสียง")}
        </p>
        <div className="flex gap-2 rounded-2xl border border-border bg-bg-surface p-2 focus-within:border-primary/40 focus-within:bg-bg-surface/80 transition-all shadow-xs">
          <Search className="ml-2 size-5 shrink-0 self-center text-text-dim" />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                void analyze();
              } else if (e.ctrlKey && (e.key === "อ" || e.key === "v" || e.key === "V")) {
                if (e.key === "อ") {
                  e.preventDefault();
                  navigator.clipboard.readText().then((text) => {
                    if (text) {
                      const converted = tryConvertThaiLayout(text);
                      setUrl(converted);
                      if (converted.trim()) {
                        void analyze(converted);
                      }
                    }
                  }).catch((err) => {
                    console.warn("Failed to read clipboard:", err);
                  });
                }
              }
            }}
            onPaste={(e) => {
              const pastedText = e.clipboardData.getData("text");
              if (pastedText) {
                e.preventDefault();
                const converted = tryConvertThaiLayout(pastedText);
                setUrl(converted);
                if (converted.trim()) {
                  void analyze(converted);
                }
              }
            }}
            placeholder="https://..."
            disabled={state === "analyzing"}
            className="flex-1 bg-transparent py-2 text-base text-text placeholder:text-text-dim outline-none disabled:opacity-60"
            aria-label={t("download.placeholder")}
          />
          {url && (
            <button
              type="button"
              onClick={() => {
                setUrl("");
                reset();
              }}
              className="rounded-xl px-3 text-xs text-text-muted transition-colors hover:text-text cursor-pointer"
              aria-label={t("download.clear")}
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-border/40 bg-bg-surface/20 px-3.5 py-2.5 text-[11px] leading-relaxed text-text-muted">
          <Info className="size-3.5 shrink-0 text-text-dim mt-0.5" />
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
      {state === "ready" && analysis && media && (
        <div className="space-y-4">
          {/* Policy pass indicator */}
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/15 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-300">
            <ShieldCheck className="size-3.5 shrink-0" />
            <span>{t("download.policyPassed")}</span>
          </div>

          {/* Media card */}
          <div className="grid gap-4 rounded-2xl border border-border bg-bg-surface p-4 shadow-sm sm:grid-cols-[240px_1fr]">
            {/* Thumbnail Button -> Opens Lightbox */}
            {media.thumbnail_url ? (
              <button
                type="button"
                onClick={() => setShowLightbox(true)}
                title={t("download.viewThumbnail", {}, "คลิกเพื่อดูรูปภาพ")}
                className="group aspect-video block overflow-hidden rounded-xl border border-border bg-cover bg-center transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer hover:border-primary/40 hover:opacity-90 text-left w-full"
                style={{ backgroundImage: `url("${media.thumbnail_url}")` }}
              />
            ) : (
              <div className="grid aspect-video place-items-center rounded-xl border border-border bg-bg-surface/50">
                <Film className="size-8 text-text-dim" />
              </div>
            )}

            {/* Info */}
            <div className="flex flex-col justify-center min-w-0 py-1">
              <h2 className="line-clamp-2 text-xl font-bold leading-snug text-text tracking-tight">
                {media.title}
              </h2>

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                {media.uploader && (
                  <span className="flex items-center gap-1.5 text-sm text-text-muted">
                    <UserRound className="size-4 shrink-0 text-text-dim" />
                    {media.uploader}
                  </span>
                )}
                {sourceDomain && !isDomainRedundant && (
                  <span className="flex items-center gap-1.5 text-sm text-text-muted">
                    <Globe2 className="size-4 shrink-0 text-text-dim" />
                    {sourceDomain}
                  </span>
                )}
                {formatDuration(media.duration_seconds) && (
                  <span className="flex items-center gap-1.5 text-sm text-text-muted">
                    <Clock3 className="size-4 shrink-0 text-text-dim" />
                    {formatDuration(media.duration_seconds)}
                  </span>
                )}
                {formatViews(media.view_count, locale) && (
                  <span className="flex items-center gap-1.5 text-sm text-text-muted">
                    <Eye className="size-4 shrink-0 text-text-dim" />
                    {formatViews(media.view_count, locale)}
                  </span>
                )}
                {media.platform && (
                  <span className="rounded-lg bg-bg-surface border border-border px-2.5 py-0.5 text-xs font-medium text-text-muted">
                    {media.platform}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Format selector */}
          <div className="rounded-2xl border border-border bg-bg-surface p-4 shadow-sm">
            {/* Video / Audio tab */}
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-text">
                {t("download.quality")}
              </p>
              <div className="flex gap-1 rounded-xl border border-border bg-bg-base/30 p-1">
                {(["video", "audio"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab);
                      setSelectedFormatId(groupedFormats[tab][0]?.format_id || "");
                    }}
                    disabled={groupedFormats[tab].length === 0}
                    className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
                      activeTab === tab
                        ? "bg-primary text-primary-foreground"
                        : "text-text-muted hover:text-text"
                    }`}
                  >
                    {tab === "video" ? t("download.video") : t("download.audio")}
                  </button>
                ))}
              </div>
            </div>

            {/* Format grid */}
            {visibleFormats.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-dim">
                {t("download.noFormats")}
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {visibleFormats.map((format) => (
                  <FormatCard
                    key={`${format.type}-${format.format_id}`}
                    format={format}
                    selected={selectedFormatId === format.format_id}
                    onSelect={() => setSelectedFormatId(format.format_id)}
                  />
                ))}
              </div>
            )}

            {/* CTA */}
            <div className="mt-4 flex items-center justify-end gap-3 border-t border-border pt-4">
              <Button
                type="button"
                onClick={() => void queueJob()}
                disabled={!selectedFormat || queueing}
                className="h-10 px-6 font-semibold"
              >
                {queueing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                {queueing ? t("download.queueing") : t("download.addToQueue")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Lightbox Modal Overlay (Half-screen Centered Popup) ── */}
      {showLightbox && media?.thumbnail_url && (
        <div
          onClick={() => setShowLightbox(false)}
          className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative rounded-2xl overflow-hidden border border-border bg-popover shadow-2xl flex items-center justify-center max-w-[90vw] max-h-[80vh]"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setShowLightbox(false)}
              className="absolute right-3.5 top-3.5 z-10 grid size-8 place-items-center rounded-full bg-black/60 text-slate-400 hover:text-slate-200 backdrop-blur-sm transition-colors border border-white/5 cursor-pointer"
            >
              <X className="size-4" />
            </button>

            {/* Lightbox thumbnail image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={media.thumbnail_url}
              alt={media.title}
              className="max-w-[90vw] max-h-[80vh] w-auto h-auto object-contain block"
            />
          </div>
        </div>
      )}
    </div>
  );
}
