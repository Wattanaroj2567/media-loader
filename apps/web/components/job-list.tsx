"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Ban,
  Clock3,
  Download,
  Film,
  Globe2,
  History,
  Loader2,
  Music,
  Pause,
  Play,
  RefreshCw,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/toast";
import { apiClient, type Job } from "@/lib/api-client";
import { isActiveStatus } from "@/lib/media-presenters.ts";
import { useT } from "@/lib/i18n/context";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { requestMediaAnalysis } from "@/lib/analyzer-session";

type JobListMode = "queue" | "history";

const queuedDeletableStatuses = new Set(["PENDING", "READY", "QUEUED"]);

/* ─── Status colours ─────────────────────────────────────────────────── */
const statusDot: Record<string, string> = {
  PENDING:     "bg-slate-500",
  ANALYZING:   "bg-cyan-400",
  READY:       "bg-sky-400",
  QUEUED:      "bg-sky-400",
  DOWNLOADING: "bg-primary animate-pulse",
  CONVERTING:  "bg-amber-400 animate-pulse",
  UPLOADING:   "bg-cyan-400",
  COMPLETED:   "bg-emerald-400",
  FAILED:      "bg-rose-400",
  BLOCKED:     "bg-rose-400",
  CANCELLED:   "bg-slate-600",
};

const statusBadge: Record<string, string> = {
  PENDING:     "border-slate-500/20 bg-slate-500/10 text-slate-500 dark:text-slate-400",
  ANALYZING:   "border-cyan-500/20 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300",
  READY:       "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-300",
  QUEUED:      "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-300",
  DOWNLOADING: "border-primary/25 bg-primary/10 text-primary",
  CONVERTING:  "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  UPLOADING:   "border-cyan-500/20 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300",
  COMPLETED:   "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  FAILED:      "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300",
  BLOCKED:     "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300",
  CANCELLED:   "border-slate-600/20 bg-slate-600/10 text-slate-500",
};

/* ─── Utilities ──────────────────────────────────────────────────────── */
function formatTime(iso?: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const mins = Math.floor((Date.now() - d.getTime()) / 60000);
    if (mins < 1) return "เมื่อสักครู่";
    if (mins < 60) return `${mins}m ที่แล้ว`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ที่แล้ว`;
    return new Intl.DateTimeFormat("th", { day: "numeric", month: "short" }).format(d);
  } catch { return ""; }
}

function outputLabel(job: Job) {
  const parts = [job.output_format?.toUpperCase(), job.selected_quality || job.selected_format];
  if (job.file_size_mb) {
    if (job.file_size_mb >= 1000) {
      parts.push(`${(job.file_size_mb / 1000).toFixed(2)} GB`);
    } else {
      parts.push(`${job.file_size_mb.toFixed(1)} MB`);
    }
  }
  return parts.filter(Boolean).join(" · ");
}

/* ─── Thumbnail ──────────────────────────────────────────────────────── */
function Thumb({ job }: { job: Job }) {
  const isAudio = job.output_format === "mp3" || job.media_type === "audio";
  const Icon = isAudio ? Music : Film;
  return (
    <div
      role={job.thumbnail_url ? "img" : undefined}
      aria-label={job.thumbnail_url ? job.title || "" : undefined}
      className="h-full w-full shrink-0 overflow-hidden rounded-xl border border-white/7 bg-white/3 bg-cover bg-center"
      style={job.thumbnail_url ? { backgroundImage: `url("${job.thumbnail_url}")` } : undefined}
    >
      {!job.thumbnail_url && (
        <div className="flex h-full w-full items-center justify-center">
          <Icon className="size-6 text-slate-700" />
        </div>
      )}
    </div>
  );
}

/* ─── Progress bar ───────────────────────────────────────────────────── */
function ProgressBar({ value, status }: { value?: number | null; status: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value || 0)));
  return (
    <div className="h-1 overflow-hidden rounded-full bg-white/6">
      <div
        className={`h-full rounded-full transition-all duration-700 ${status === "CONVERTING" ? "bg-amber-400" : "bg-primary"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ─── Status chip ────────────────────────────────────────────────────── */
function StatusChip({ status, label }: { status: string; label: string }) {
  const dot = statusDot[status] || "bg-slate-500";
  const badge = statusBadge[status] || statusBadge.PENDING;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium ${badge}`}>
      <span className={`size-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function formatSpeed(bytesPerSec?: number | null): string {
  if (!bytesPerSec || bytesPerSec <= 0) return "";
  if (bytesPerSec >= 1024 * 1024) {
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  }
  if (bytesPerSec >= 1024) {
    return `${(bytesPerSec / 1024).toFixed(0)} KB/s`;
  }
  return `${bytesPerSec} B/s`;
}

function formatETA(etaSeconds: number): string {
  if (etaSeconds < 0 || isNaN(etaSeconds) || !isFinite(etaSeconds)) return "";
  if (etaSeconds < 60) {
    return `${Math.round(etaSeconds)}s`;
  }
  const mins = Math.floor(etaSeconds / 60);
  const secs = Math.round(etaSeconds % 60);
  return `${mins}m ${secs}s`;
}

function getJobETA(job: Job): string {
  if (
    job.status !== "DOWNLOADING" ||
    !job.download_speed ||
    job.download_speed <= 0 ||
    !job.file_size_mb ||
    job.file_size_mb <= 0 ||
    job.progress === undefined ||
    job.progress === null ||
    job.progress >= 100
  ) {
    return "";
  }

  const totalBytes = job.file_size_mb * 1024 * 1024;
  const downloadedBytes = totalBytes * (job.progress / 100);
  const remainingBytes = totalBytes - downloadedBytes;

  if (remainingBytes <= 0) return "";
  const etaSeconds = remainingBytes / job.download_speed;
  return formatETA(etaSeconds);
}

/* ─── Job row card ───────────────────────────────────────────────────── */
function JobCard({ job, mode, busy, busyAction, selectionMode, selected, onToggleSelection, onCancel, onDelete, onDownloadAgain, onPause, onResume }: {
  job: Job; mode: JobListMode; busy: boolean;
  busyAction: "cancel" | "delete" | "pause" | "resume" | null;
  selectionMode: boolean; selected: boolean; onToggleSelection: () => void;
  onCancel: () => void; onDelete: () => void; onDownloadAgain: () => void;
  onPause: () => void; onResume: () => void;
}) {
  const { t } = useT();
  const canCancel     = mode === "queue" && (job.status === "DOWNLOADING" || job.status === "CONVERTING" || job.status === "PAUSED");
  const canPause      = mode === "queue" && (job.status === "DOWNLOADING" || job.status === "CONVERTING");
  const canResume     = mode === "queue" && job.status === "PAUSED";
  const canDeleteQ    = mode === "queue" && queuedDeletableStatuses.has(job.status);
  const canDownloadAgain = mode === "history" && job.status === "COMPLETED" && !selectionMode;
  const title         = job.title || job.output_filename || job.original_url;
  const time          = formatTime(job.completed_at || job.updated_at || job.created_at);
  const label         = outputLabel(job);
  const isDownloading = job.status === "DOWNLOADING" || job.status === "CONVERTING";
  const showProgress  = job.status === "DOWNLOADING" || job.status === "CONVERTING" || job.status === "UPLOADING" || job.status === "PAUSED";

  const isDomainRedundant = job.source_domain && job.platform
    ? job.source_domain.toLowerCase().includes(job.platform.toLowerCase()) ||
      job.platform.toLowerCase().includes(job.source_domain.toLowerCase().split(".")[0])
    : false;

  const clockTime = useMemo(() => {
    const iso = job.created_at;
    if (!iso) return "";
    try {
      const d = new Date(iso);
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    } catch {
      return "";
    }
  }, [job.created_at]);

  return (
    <article className={`flex flex-col gap-3 rounded-2xl border bg-bg-elevated/65 p-3.5 shadow-[inset_0_1px_0_var(--panel-highlight)] transition-[border-color,background-color] duration-200 sm:flex-row sm:items-center ${
      selected
        ? "border-primary/60 bg-primary/5"
        : "border-border hover:border-primary/30 hover:bg-bg-elevated/85"
    }`}>
      <div className="flex flex-col sm:flex-row min-w-0 flex-1 sm:items-center gap-3">
        {selectionMode && (
          <label
            htmlFor={`history-select-${job.id}`}
            className="flex min-h-11 shrink-0 cursor-pointer items-center px-1"
          >
            <Checkbox
              id={`history-select-${job.id}`}
              checked={selected}
              disabled={busy}
              onCheckedChange={onToggleSelection}
              aria-label={t("history.selectItem", { title }, `เลือกรายการ ${title}`)}
            />
          </label>
        )}
        {/* Thumb — full width top on mobile, fixed 96x54 (16:9) on desktop */}
        <div className="w-full shrink-0 overflow-hidden rounded-xl sm:h-13.5 sm:w-24">
          <Thumb job={job} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 py-0.5">
        {/* Title */}
        <p className="line-clamp-1 text-sm font-medium text-text leading-snug">
          {title}
        </p>

        {/* Status + meta */}
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <StatusChip status={job.status} label={t(`status.${job.status}`, {}, job.status)} />
          {job.platform && (
            <span className="text-[11px] text-text-dim">{job.platform}</span>
          )}
          {job.source_domain && !isDomainRedundant && (
            <span className="flex items-center gap-1 text-[11px] text-text-dim">
              <Globe2 className="size-3" />{job.source_domain}
            </span>
          )}
          {label && <span className="text-[11px] text-text-dim">{label}</span>}
          {time && (
            <span className="flex items-center gap-1 text-[11px] text-text-dim">
              <Clock3 className="size-3" />
              {clockTime ? `${clockTime} · ${time}` : time}
            </span>
          )}
        </div>

        {/* Progress */}
        {mode === "queue" && showProgress && (
          <div className="mt-2">
            <div className="mb-1 flex justify-between text-[11px] text-text-muted">
              <span className="font-medium text-text-dim tabular-nums flex items-center gap-1.5">
                {job.status === "DOWNLOADING" && job.download_speed ? (
                  <>
                    <span>{formatSpeed(job.download_speed)}</span>
                    {getJobETA(job) && (
                      <>
                        <span className="text-text-muted/40">·</span>
                        <span>{t("queue.eta", { time: getJobETA(job) })}</span>
                      </>
                    )}
                  </>
                ) : (
                  ""
                )}
              </span>
              <span className={`tabular-nums ${isDownloading ? "text-text-muted" : ""}`}>
                {Math.round(job.progress || 0)}%
              </span>
            </div>
            <ProgressBar value={job.progress} status={job.status} />
          </div>
        )}

        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border/60 pt-2.5 sm:items-start sm:border-t-0 sm:pt-0.5">
        {canDownloadAgain && (
          <Button size="sm" onClick={onDownloadAgain} disabled={busy}
            aria-label={t("history.downloadAgain", {}, "ดาวน์โหลดอีกครั้ง")}
            className="h-11 flex-1 gap-1.5 px-4 text-xs font-medium sm:h-8 sm:flex-none sm:px-3">
            <RefreshCw className="size-3.5" />
            <span>{t("history.downloadAgain", {}, "ดาวน์โหลดอีกครั้ง")}</span>
          </Button>
        )}
        {canResume && (
          <button type="button" onClick={onResume} disabled={busy} title={t("queue.resume", {}, "ดาวน์โหลดต่อ")}
            className="grid size-11 place-items-center rounded-lg border border-border bg-bg-surface/50 text-emerald-600 transition-colors hover:border-emerald-500/20 hover:bg-emerald-500/10 hover:text-emerald-500 sm:size-8 dark:text-emerald-400 dark:hover:text-emerald-300 cursor-pointer">
            {busyAction === "resume" ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
          </button>
        )}
        {canPause && (
          <button type="button" onClick={onPause} disabled={busy} title={t("queue.pause", {}, "หยุดชั่วคราว")}
            className="grid size-11 place-items-center rounded-lg border border-border bg-bg-surface/50 text-text-muted transition-colors hover:border-amber-500/20 hover:bg-amber-500/10 hover:text-amber-600 sm:size-8 dark:hover:text-amber-400 cursor-pointer">
            {busyAction === "pause" ? <Loader2 className="size-3.5 animate-spin" /> : <Pause className="size-3.5" />}
          </button>
        )}
        {canCancel && (
          <button type="button" onClick={onCancel} disabled={busy} title={t("queue.cancel", {}, "ยกเลิก")}
            className="grid size-11 place-items-center rounded-lg border border-border bg-bg-surface/50 text-text-muted transition-colors hover:border-rose-500/20 hover:bg-rose-500/10 hover:text-rose-600 sm:size-8 dark:hover:text-rose-400 cursor-pointer">
            {busyAction === "cancel" ? <Loader2 className="size-3.5 animate-spin" /> : <Ban className="size-3.5" />}
          </button>
        )}
        {canDeleteQ && (
          <button type="button" onClick={onDelete} disabled={busy} title={t("queue.delete", {}, "ลบ")}
            className="grid size-11 place-items-center rounded-lg border border-border text-text-muted transition-colors hover:border-rose-500/20 hover:bg-rose-500/10 hover:text-rose-600 sm:size-8 dark:hover:text-rose-400 cursor-pointer">
            {busyAction === "delete" ? <Loader2 className="size-4.5 animate-spin" /> : <Trash2 className="size-4.5" />}
          </button>
        )}
      </div>
    </article>
  );
}

/* ─── Queue header ───────────────────────────────────────────────────── */
function QueueHeader({ activeCount }: { activeCount: number }) {
  const { t } = useT();
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <h1 className="text-base font-semibold text-text">
          {t("queue.title", {}, "คิวดาวน์โหลด")}
        </h1>
        {activeCount > 0 && (
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
            {activeCount}
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── History header ─────────────────────────────────────────────────── */
function HistoryHeader({
  count,
  selectionMode,
  selectedCount,
  allSelected,
  deleting,
  onStartSelection,
  onCancelSelection,
  onToggleAll,
  onDeleteSelected,
}: {
  count: number;
  selectionMode: boolean;
  selectedCount: number;
  allSelected: boolean;
  deleting: boolean;
  onStartSelection: () => void;
  onCancelSelection: () => void;
  onToggleAll: () => void;
  onDeleteSelected: () => void;
}) {
  const { t } = useT();
  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="ui-kicker mb-2">{t("history.kicker", {}, "รายการดาวน์โหลดของคุณ")}</p>
          <div className="flex flex-wrap items-baseline gap-2.5">
          <h1 className="ui-page-title">
            {t("history.title", {}, "ประวัติ")}
          </h1>
          {count > 0 && (
            <span className="text-sm text-text-dim">
              {t("history.total", { n: count }, `${count} รายการ`)}
            </span>
          )}
          </div>
          <p className="mt-2 max-w-xl text-sm leading-6 text-text-muted">{t("history.subtitle")}</p>
        </div>
        {count > 0 && !selectionMode && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onStartSelection}
            className="h-11 gap-2 border-border text-text-muted hover:border-rose-500/25 hover:bg-rose-500/10 hover:text-rose-500 sm:h-9"
          >
            <Trash2 className="size-3.5" />
            {t("history.clearAll", {}, "ล้างประวัติ")}
          </Button>
        )}
      </div>
      {selectionMode && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 p-3">
          <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2 text-xs font-semibold text-text hover:bg-bg-surface sm:min-h-9">
            <Checkbox
              checked={allSelected}
              disabled={deleting}
              onCheckedChange={onToggleAll}
              aria-label={allSelected ? t("history.deselectAll") : t("history.selectAll")}
            />
            <span className="font-semibold text-text">{allSelected ? t("history.deselectAll") : t("history.selectAll")}</span>
          </label>
          <span className="mr-auto text-xs font-semibold text-text-muted" aria-live="polite">
            {t("history.selectedCount", { n: selectedCount }, `เลือกแล้ว ${selectedCount} รายการ`)}
          </span>

          {/* Action buttons grouped together in the same right corner */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancelSelection}
              disabled={deleting}
              className="h-11 font-semibold text-text-muted hover:text-text sm:h-9 cursor-pointer"
            >
              {t("history.cancelSelect", {}, "ยกเลิก")}
            </Button>

            {selectedCount > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onDeleteSelected}
                disabled={deleting}
                className="h-11 gap-2 border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300 font-semibold hover:bg-rose-500/20 sm:h-9 animate-in fade-in zoom-in-95 cursor-pointer"
              >
                {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                {t("history.deleteSelected", {}, "ลบที่เลือก")}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Empty state ────────────────────────────────────────────────────── */
function EmptyState({ mode }: { mode: JobListMode }) {
  const { t } = useT();
  const isQueue = mode === "queue";
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border bg-bg-surface/25 px-5 py-20 text-center">
      <div className="grid size-16 place-items-center rounded-2xl border border-primary/20 bg-primary/10">
        {isQueue
          ? <Download className="size-6 text-text-dim" />
          : <History className="size-6 text-text-dim" />}
      </div>
      <div>
        <p className="text-sm font-medium text-text-muted">
          {isQueue ? t("downloads.title") : t("history.title")}
        </p>
        <p className="mt-1 text-xs text-text-dim max-w-xs">
          {isQueue
            ? t("downloads.empty")
            : t("history.empty")}
        </p>
      </div>
    </div>
  );
}

/* ─── Offline notice ─────────────────────────────────────────────────── */
function OfflineBanner({ message, onRetry }: { message: string; onRetry: () => Promise<void> | void }) {
  const { t, locale } = useT();
  const [retrying, setRetrying] = useState(false);

  // Log detailed error to console for developers, keeping the UI user-friendly
  useEffect(() => {
    if (message) {
      console.warn("[Backend Connection Error]:", message);
    }
  }, [message]);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await onRetry();
    } catch (e) {
      console.warn("[Retry Action Error]:", e);
    } finally {
      // Small artificial delay to let the user see the visual feedback
      await new Promise((resolve) => setTimeout(resolve, 600));
      setRetrying(false);
    }
  };

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50/50 dark:border-rose-500/15 dark:bg-rose-500/6 px-4 py-2.5 shadow-xs">
      <div className="flex items-center gap-3">
        <AlertCircle className="size-4 shrink-0 text-rose-600 dark:text-rose-400" />
        <div>
          <p className="text-xs font-semibold text-rose-800 dark:text-rose-300">
            {locale === "th"
              ? "เชื่อมต่อระบบไม่ได้ กรุณาลองใหม่อีกครั้ง"
              : "Could not connect. Please try again."}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleRetry}
        disabled={retrying}
        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-rose-100 dark:bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-800 dark:text-rose-300 transition-colors hover:bg-rose-200 dark:hover:bg-rose-500/20 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
      >
        <RefreshCw className={`size-3 ${retrying ? "animate-spin" : ""}`} />
        {retrying ? (locale === "th" ? "กำลังโหลด..." : "Retrying...") : t("common.retry", {}, "ลองใหม่")}
      </button>
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────────────────── */
export function JobList({ mode, compact = false, containerRef }: {
  mode: JobListMode;
  compact?: boolean;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const { t } = useT();
  const { toast } = useToast();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [deletingSelection, setDeletingSelection] = useState(false);
  const [busyState, setBusyState] = useState<{ id: string; action: "cancel" | "delete" | "pause" | "resume" } | null>(null);
  const [loadError, setLoadError] = useState("");
  const [confirmState, setConfirmState] = useState<{
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    variant?: "danger" | "warning" | "info";
  } | null>(null);

  const showConfirm = useCallback((
    title: string,
    description: string,
    onConfirm: () => void,
    options: { confirmText?: string; cancelText?: string; variant?: "danger" | "warning" | "info" } = {}
  ) => {
    setConfirmState({
      title,
      description,
      onConfirm,
      ...options,
    });
  }, []);

  const updateJobsList = useCallback((newJobs: Job[]) => {
    setJobs(newJobs);
  }, []);

  const fetchJobs = useCallback(async (silent = false) => {
    if (typeof window !== "undefined" && !window.navigator.onLine) {
      return;
    }
    if (!silent) setLoadError("");
    try {
      const data = await apiClient.listJobs({ limit: 100 });
      updateJobsList(data);
      setLoadError("");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [updateJobsList]);

  useEffect(() => {
    let dead = false;
    async function run() {
      if (typeof window !== "undefined" && !window.navigator.onLine) {
        return;
      }
      try {
        const data = await apiClient.listJobs({ limit: 100 });
        if (!dead) { updateJobsList(data); setLoadError(""); }
      } catch (e) {
        if (!dead) setLoadError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
      } finally {
        if (!dead) setLoading(false);
      }
    }
    void run();
    const iv = window.setInterval(run, mode === "queue" ? 4000 : 10000);
    const ev = () => void run();
    window.addEventListener("media-loader:jobs-changed", ev);
    window.addEventListener("online", ev);
    return () => {
      dead = true;
      clearInterval(iv);
      window.removeEventListener("media-loader:jobs-changed", ev);
      window.removeEventListener("online", ev);
    };
  }, [mode, updateJobsList]);

  const visibleJobs = useMemo(() => {
    return jobs.filter((job) =>
      mode === "queue"
        ? isActiveStatus(job.status)
        : job.status === "COMPLETED",
    );
  }, [jobs, mode]);

  const activeCount = useMemo(() => jobs.filter(j => isActiveStatus(j.status)).length, [jobs]);
  const allHistorySelected =
    visibleJobs.length > 0 && visibleJobs.every((job) => selectedJobIds.has(job.id));

  useEffect(() => {
    const visibleIds = new Set(visibleJobs.map((job) => job.id));
    setSelectedJobIds((current) => {
      const next = new Set([...current].filter((id) => visibleIds.has(id)));
      if (next.size === current.size) return current;
      return next;
    });
  }, [visibleJobs]);

  const cancelJob = useCallback((job: Job) => {
    showConfirm(
      t("queue.confirmCancelTitle", {}, "ยกเลิกงานดาวน์โหลด"),
      t("queue.confirmCancelDesc", {}, "คุณแน่ใจหรือไม่ว่าต้องการยกเลิกดาวน์โหลดรายการนี้? ไฟล์ชั่วคราวที่กำลังโหลดจะถูกลบทันที"),
      async () => {
        setBusyState({ id: job.id, action: "cancel" });
        try {
          await apiClient.cancelJob(job.id);
          toast("success", t("queue.cancelled"));
          await fetchJobs(true);
        } catch (e) {
          console.warn("[Cancel Job Error]:", e);
          toast("error", t("queue.actionError"), t("error.genericDesc"));
        } finally { setBusyState(null); }
      },
      { variant: "danger", confirmText: t("common.confirm", {}, "ตกลง") }
    );
  }, [fetchJobs, showConfirm, t, toast]);

  const pauseJob = useCallback((job: Job) => {
    showConfirm(
      t("queue.confirmPauseTitle", {}, "หยุดดาวน์โหลดชั่วคราว"),
      t("queue.confirmPauseDesc", {}, "คุณต้องการหยุดดาวน์โหลดรายการนี้ชั่วคราวใช่หรือไม่?"),
      async () => {
        setBusyState({ id: job.id, action: "pause" });
        try {
          await apiClient.pauseJob(job.id);
          toast("success", t("queue.paused", {}, "หยุดดาวน์โหลดชั่วคราวแล้ว"));
          await fetchJobs(true);
        } catch (e) {
          console.warn("[Pause Job Error]:", e);
          toast("error", t("queue.actionError"), t("error.genericDesc"));
        } finally { setBusyState(null); }
      },
      { variant: "warning", confirmText: t("common.confirm", {}, "ตกลง") }
    );
  }, [fetchJobs, showConfirm, t, toast]);

  const resumeJob = useCallback(async (job: Job) => {
    setBusyState({ id: job.id, action: "resume" });
    try {
      await apiClient.resumeJob(job.id);
      toast("success", t("queue.resumed", {}, "เริ่มดาวน์โหลดต่อแล้ว"));
      await fetchJobs(true);
    } catch (e) {
      console.warn("[Resume Job Error]:", e);
      toast("error", t("queue.actionError"), t("error.genericDesc"));
    } finally { setBusyState(null); }
  }, [fetchJobs, t, toast]);

  const deleteJob = useCallback((job: Job) => {
    showConfirm(
      t("queue.confirmDeleteTitle", {}, "ลบงานออกจากคิว"),
      t("queue.confirmDeleteDesc", {}, "คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้ออกจากคิว?"),
      async () => {
        setBusyState({ id: job.id, action: "delete" });
        try {
          await apiClient.deleteJob(job.id);
          toast("success", t("queue.deleted"));
          await fetchJobs(true);
        } catch (e) {
          console.warn("[Delete Job Error]:", e);
          toast("error", t("queue.actionError"), t("error.genericDesc"));
        } finally { setBusyState(null); }
      },
      { variant: "danger", confirmText: t("common.delete", {}, "ลบ") }
    );
  }, [fetchJobs, showConfirm, t, toast]);

  const downloadAgain = useCallback((job: Job) => {
    requestMediaAnalysis(job.original_url);
    router.push("/dashboard");
  }, [router]);

  const startHistorySelection = useCallback(() => {
    setSelectedJobIds(new Set());
    setSelectionMode(true);
  }, []);

  const cancelHistorySelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedJobIds(new Set());
  }, []);

  const toggleHistorySelection = useCallback((jobId: string) => {
    setSelectedJobIds((current) => {
      const next = new Set(current);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  }, []);

  const toggleAllHistory = useCallback(() => {
    setSelectedJobIds((current) => {
      const everySelected =
        visibleJobs.length > 0 && visibleJobs.every((job) => current.has(job.id));
      return everySelected
        ? new Set()
        : new Set(visibleJobs.map((job) => job.id));
    });
  }, [visibleJobs]);

  const deleteSelectedHistory = useCallback(() => {
    if (selectedJobIds.size === 0) return;
    const idsToDelete = [...selectedJobIds];
    showConfirm(
      t("history.confirmBulkDeleteTitle", {}, "ลบรายการที่เลือก"),
      t(
        "history.confirmBulkDeleteDesc",
        { n: idsToDelete.length },
        `คุณแน่ใจหรือไม่ว่าต้องการลบ ${idsToDelete.length} รายการที่เลือกไว้?`,
      ),
      async () => {
        setDeletingSelection(true);
        try {
          const results = await Promise.allSettled(
            idsToDelete.map((jobId) => apiClient.deleteJob(jobId)),
          );
          if (results.some((result) => result.status === "rejected")) {
            throw new Error("Some history items could not be deleted");
          }
          toast("success", t("history.bulkDeletedSuccess"));
          setSelectionMode(false);
          setSelectedJobIds(new Set());
          await fetchJobs(true);
        } catch (error) {
          console.warn("[Delete Selected History Error]:", error);
          toast("error", t("history.bulkDeletedError"), t("error.genericDesc"));
        } finally {
          setDeletingSelection(false);
        }
      },
      { variant: "danger", confirmText: t("history.deleteSelected", {}, "ลบที่เลือก") },
    );
  }, [fetchJobs, selectedJobIds, showConfirm, t, toast]);

  if (compact && visibleJobs.length === 0) {
    return null;
  }

  const content = (
    <section className={compact ? "w-full" : "mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-9"}>
      {/* Header */}
      {compact ? (
        mode === "queue" && (
          <div className="mb-4 flex items-center justify-between border-b border-border/70 pb-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
              <span>{t("queue.title", {}, "คิวงาน")}</span>
              {activeCount > 0 && (
                <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  {activeCount}
                </span>
              )}
            </h2>
          </div>
        )
      ) : (
        mode === "queue"
          ? <QueueHeader activeCount={activeCount} />
          : <HistoryHeader
              count={visibleJobs.length}
              selectionMode={selectionMode}
              selectedCount={selectedJobIds.size}
              allSelected={allHistorySelected}
              deleting={deletingSelection}
              onStartSelection={startHistorySelection}
              onCancelSelection={cancelHistorySelection}
              onToggleAll={toggleAllHistory}
              onDeleteSelected={deleteSelectedHistory}
            />
      )}

      {/* Offline notice */}
      {loadError && !loading && (
        <OfflineBanner message={loadError} onRetry={fetchJobs} />
      )}

      {/* List */}
      {loading ? (
        <div className="grid min-h-48 place-items-center">
          <Loader2 className="size-6 animate-spin text-text-dim" />
        </div>
      ) : visibleJobs.length > 0 ? (
        <div className="space-y-2.5">
          {visibleJobs.map(job => (
            <JobCard key={job.id} job={job} mode={mode}
              busy={deletingSelection || busyState?.id === job.id}
              busyAction={busyState?.id === job.id ? busyState.action : null}
              selectionMode={mode === "history" && selectionMode}
              selected={selectedJobIds.has(job.id)}
              onToggleSelection={() => toggleHistorySelection(job.id)}
              onCancel={() => void cancelJob(job)}
              onDelete={() => void deleteJob(job)}
              onDownloadAgain={() => void downloadAgain(job)}
              onPause={() => void pauseJob(job)}
              onResume={() => void resumeJob(job)} />
          ))}
        </div>
      ) : !loadError ? (
        <EmptyState mode={mode} />
      ) : null}

      {confirmState && (
        <ConfirmDialog
          isOpen={true}
          title={confirmState.title}
          description={confirmState.description}
          confirmText={confirmState.confirmText}
          cancelText={confirmState.cancelText}
          variant={confirmState.variant}
          onConfirm={() => {
            confirmState.onConfirm();
            setConfirmState(null);
          }}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </section>
  );

  if (compact) {
    return (
      <div
        ref={containerRef}
        className="ui-panel w-full shrink-0 scroll-mt-20 rounded-3xl p-4 lg:w-[27rem] lg:p-5 xl:w-[30rem] 2xl:w-[32rem]"
      >
        {content}
      </div>
    );
  }

  return content;
}
