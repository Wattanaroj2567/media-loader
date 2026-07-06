"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Ban,
  Clock3,
  Download,
  FileDown,
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
import { useToast } from "@/components/toast";
import { apiClient, type Job } from "@/lib/api-client";
import { isActiveStatus, isTerminalStatus } from "@/lib/media-presenters.ts";
import { useT } from "@/lib/i18n/context";
import { ConfirmDialog } from "@/components/confirm-dialog";

type JobListMode = "queue" | "history";
type HistoryFilter = "ALL" | "COMPLETED" | "FAILED" | "BLOCKED" | "CANCELLED";

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

function safeFilename(job: Job) {
  // Use job.title to suggest a clean title (e.g. including Thai characters)
  // instead of the restricted ASCII filename used in the local filesystem.
  const title = job.title || "media";
  const ext = job.output_format || "mp4";
  return `${title}.${ext}`.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_");
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
function JobCard({ job, mode, busy, busyAction, onCancel, onDelete, onSave, onRetry, onPause, onResume }: {
  job: Job; mode: JobListMode; busy: boolean;
  busyAction: "cancel" | "delete" | "save" | "retry" | "pause" | "resume" | null;
  onCancel: () => void; onDelete: () => void; onSave: () => void; onRetry: () => void;
  onPause: () => void; onResume: () => void;
}) {
  const { t } = useT();
  const canCancel     = mode === "queue" && (job.status === "DOWNLOADING" || job.status === "CONVERTING" || job.status === "PAUSED");
  const canPause      = mode === "queue" && (job.status === "DOWNLOADING" || job.status === "CONVERTING");
  const canResume     = mode === "queue" && job.status === "PAUSED";
  const canDeleteQ    = mode === "queue" && queuedDeletableStatuses.has(job.status);
  const canSave       = mode === "history" && job.status === "COMPLETED" && job.file_available;
  const canRetry      = mode === "history" && (job.status === "FAILED" || job.status === "CANCELLED");
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
    <article className="flex gap-3 rounded-2xl border border-border bg-bg-surface p-3 transition-colors hover:border-primary/30 hover:bg-bg-surface/80 shadow-sm">
      {/* Thumb — fixed 80×45 (16:9) */}
      <div className="h-11.25 w-20 shrink-0 sm:h-13.5 sm:w-24">
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

        {/* Help text indicating where the downloaded file goes */}
        {mode === "history" && job.status === "COMPLETED" && job.file_available && (
          <p className="mt-2 text-[11px] font-medium text-text-muted">
            {t("history.fileAvailableHelp")}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-start gap-1.5 pt-0.5">
        {canSave && (
          <Button size="sm" onClick={onSave} disabled={busy}
            className="h-8 gap-1.5 px-3 text-xs font-medium">
            {busyAction === "save" ? <Loader2 className="size-3.5 animate-spin" /> : <FileDown className="size-3.5" />}
            <span className="hidden sm:block">{t("history.save", {}, "บันทึก")}</span>
          </Button>
        )}
        {canRetry && (
          <Button size="sm" onClick={onRetry} disabled={busy} variant="secondary"
            className="h-8 gap-1.5 px-3 text-xs font-medium border border-border hover:bg-bg-surface text-text-muted hover:text-text cursor-pointer">
            {busyAction === "retry" ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            <span className="hidden sm:block">{t("common.retry", {}, "ลองใหม่")}</span>
          </Button>
        )}
        {canResume && (
          <button type="button" onClick={onResume} disabled={busy} title={t("queue.resume", {}, "ดาวน์โหลดต่อ")}
            className="grid size-8 place-items-center rounded-lg border border-border bg-bg-surface/50 text-emerald-600 dark:text-emerald-400 transition-colors hover:border-emerald-500/20 hover:bg-emerald-500/10 hover:text-emerald-500 dark:hover:text-emerald-300 cursor-pointer">
            {busyAction === "resume" ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
          </button>
        )}
        {canPause && (
          <button type="button" onClick={onPause} disabled={busy} title={t("queue.pause", {}, "หยุดชั่วคราว")}
            className="grid size-8 place-items-center rounded-lg border border-border bg-bg-surface/50 text-text-muted transition-colors hover:border-amber-500/20 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer">
            {busyAction === "pause" ? <Loader2 className="size-3.5 animate-spin" /> : <Pause className="size-3.5" />}
          </button>
        )}
        {canCancel && (
          <button type="button" onClick={onCancel} disabled={busy} title={t("queue.cancel", {}, "ยกเลิก")}
            className="grid size-8 place-items-center rounded-lg border border-border bg-bg-surface/50 text-text-muted transition-colors hover:border-rose-500/20 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer">
            {busyAction === "cancel" ? <Loader2 className="size-3.5 animate-spin" /> : <Ban className="size-3.5" />}
          </button>
        )}
        {canDeleteQ && (
          <button type="button" onClick={onDelete} disabled={busy} title={t("queue.delete", {}, "ลบ")}
            className="grid size-8 place-items-center rounded-lg border border-border text-text-muted transition-colors hover:border-rose-500/20 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer">
            {busyAction === "delete" ? <Loader2 className="size-4.5 animate-spin" /> : <Trash2 className="size-4.5" />}
          </button>
        )}
        {mode === "history" && (
          <button type="button" onClick={onDelete} disabled={busy} title={t("history.delete", {}, "ลบ")}
            className="grid size-8 place-items-center rounded-lg border border-transparent text-text-muted transition-colors hover:border-rose-500/20 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer">
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
const FILTERS: Array<{ key: HistoryFilter; label: string }> = [
  { key: "ALL", label: "ทั้งหมด" },
  { key: "COMPLETED", label: "สำเร็จ" },
  { key: "FAILED", label: "ล้มเหลว" },
  { key: "BLOCKED", label: "ถูกบล็อก" },
  { key: "CANCELLED", label: "ยกเลิก" },
];

function HistoryHeader({ count, filter, onFilter }: {
  count: number;
  filter: HistoryFilter; onFilter: (v: HistoryFilter) => void;
}) {
  const { t } = useT();
  return (
    <div className="mb-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h1 className="text-base font-semibold text-text">
            {t("history.title", {}, "ประวัติ")}
          </h1>
          {count > 0 && (
            <span className="text-sm text-text-dim">
              {t("history.total", { n: count }, `${count} รายการ`)}
            </span>
          )}
        </div>
      </div>
      {/* Filters */}
      <div className="flex gap-1 overflow-x-auto pb-0.5">
        {FILTERS.map((f) => (
          <button key={f.key} type="button" onClick={() => onFilter(f.key)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f.key
                ? "bg-primary/15 text-primary"
                : "text-text-muted hover:bg-bg-surface hover:text-text"
            }`}>
            {t(`history.${f.key.toLowerCase()}`, {}, f.label)}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Empty state ────────────────────────────────────────────────────── */
function EmptyState({ mode, hasFilter }: { mode: JobListMode; hasFilter: boolean }) {
  const { t } = useT();
  const isQueue = mode === "queue";
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="grid size-14 place-items-center rounded-2xl border border-border bg-bg-surface shadow-xs">
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
            : (hasFilter ? t("history.emptyFilter") : t("history.empty"))}
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
export function JobList({ mode }: { mode: JobListMode }) {
  const { t } = useT();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const jobsRef = useRef<Job[]>(jobs);

  // Keep jobsRef updated with the latest jobs state on every render
  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<HistoryFilter>("ALL");
  const [busyState, setBusyState] = useState<{ id: string; action: "cancel" | "delete" | "save" | "retry" | "pause" | "resume" } | null>(null);
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
    const prevJobs = jobsRef.current;
    if (prevJobs.length > 0) {
      newJobs.forEach((newJob) => {
        const prevJob = prevJobs.find((pj) => pj.id === newJob.id);
        if (prevJob) {
          const wasActive = isActiveStatus(prevJob.status);
          const isTerminal = isTerminalStatus(newJob.status);
          if (wasActive && isTerminal) {
            const title = newJob.title || newJob.output_filename || newJob.original_url;
            if (newJob.status === "COMPLETED") {
              toast("success", t("queue.completedToastTitle"), title);
            } else if (newJob.status === "FAILED") {
              toast("error", t("queue.failedToastTitle"), title);
            } else if (newJob.status === "BLOCKED") {
              toast("error", t("queue.blockedToastTitle"), title);
            }
          }
        }
      });
    }
    setJobs(newJobs);
  }, [toast, t]);

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
    return jobs
      .filter(j => mode === "queue" ? isActiveStatus(j.status) : isTerminalStatus(j.status))
      .filter(j => mode !== "history" || filter === "ALL" || j.status === filter);
  }, [filter, jobs, mode]);

  const activeCount = useMemo(() => jobs.filter(j => isActiveStatus(j.status)).length, [jobs]);

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

  const deleteJob = useCallback((job: Job, src: JobListMode) => {
    const isQueue = src === "queue";
    showConfirm(
      isQueue ? t("queue.confirmDeleteTitle", {}, "ลบงานออกจากคิว") : t("history.confirmDeleteTitle", {}, "ลบประวัติงานดาวน์โหลด"),
      isQueue 
        ? t("queue.confirmDeleteDesc", {}, "คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้ออกจากคิว?")
        : t("history.confirmDeleteDesc", {}, "คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้ออกจากประวัติ? ไฟล์ชั่วคราวที่ดาวน์โหลดสำเร็จจะถูกลบออกจากเซิร์ฟเวอร์ด้วย"),
      async () => {
        setBusyState({ id: job.id, action: "delete" });
        try {
          await apiClient.deleteJob(job.id);
          toast("success", isQueue ? t("queue.deleted") : t("history.deleted"));
          await fetchJobs(true);
        } catch (e) {
          console.warn("[Delete Job Error]:", e);
          toast("error", isQueue ? t("queue.actionError") : t("history.deleteError"), t("error.genericDesc"));
        } finally { setBusyState(null); }
      },
      { variant: "danger", confirmText: t("common.delete", {}, "ลบ") }
    );
  }, [fetchJobs, showConfirm, t, toast]);

  const saveFile = useCallback(async (job: Job) => {
    setBusyState({ id: job.id, action: "save" });
    try {
      await apiClient.saveJobFile(job.id, safeFilename(job));
      toast("success", t("history.saved"), t("history.savedDesc"));
      await fetchJobs(true);
    } catch (e) {
      console.warn("[Save File Error]:", e);
      toast("error", t("history.downloadError"), t("error.genericDesc"));
    } finally { setBusyState(null); }
  }, [fetchJobs, t, toast]);

  const retryJob = useCallback(async (job: Job) => {
    setBusyState({ id: job.id, action: "retry" });
    try {
      const ok = await apiClient.createJob({
        url: job.original_url,
        selected_format_id: job.selected_format,
        output_format: job.output_format,
        rights_confirmed: true,
      });
      if (ok) {
        // Silently remove the old failed job from history to prevent cluttering
        try {
          await apiClient.deleteJob(job.id);
        } catch (delErr) {
          console.warn("Failed to delete old job on retry:", delErr);
        }
        toast("success", t("download.queued"), t("download.queuedDesc"));
        window.dispatchEvent(new CustomEvent("media-loader:jobs-changed"));
        await fetchJobs(true);
      } else {
        toast("error", t("download.failed"), t("download.failedDesc"));
      }
    } catch (err) {
      console.warn("[Retry Job Error]:", err);
      toast("error", t("download.failed"), t("error.genericDesc"));
    } finally { setBusyState(null); }
  }, [fetchJobs, toast, t]);

  const hasFilter = filter !== "ALL";

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-6">
      {/* Header */}
      {mode === "queue"
        ? <QueueHeader activeCount={activeCount} />
        : <HistoryHeader count={visibleJobs.length} filter={filter} onFilter={setFilter} />}

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
        <div className="space-y-1.5">
          {visibleJobs.map(job => (
            <JobCard key={job.id} job={job} mode={mode}
              busy={busyState?.id === job.id}
              busyAction={busyState?.id === job.id ? busyState.action : null}
              onCancel={() => void cancelJob(job)}
              onDelete={() => void deleteJob(job, mode)}
              onSave={() => void saveFile(job)}
              onRetry={() => void retryJob(job)}
              onPause={() => void pauseJob(job)}
              onResume={() => void resumeJob(job)} />
          ))}
        </div>
      ) : !loadError ? (
        <EmptyState mode={mode} hasFilter={hasFilter} />
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
}
