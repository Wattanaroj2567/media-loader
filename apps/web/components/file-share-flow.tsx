"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { SaveFileDialog, type ShareTransferState } from "@/components/save-file-dialog";
import { useToast } from "@/components/toast";
import {
  apiClient,
  saveBufferedFile,
  shareBufferedFile,
  transferToFile,
} from "@/lib/api-client";
import { useT } from "@/lib/i18n/context";
import { DownloadHttpError, type ResumableDownload } from "@/lib/resumable-download";

export interface FileShareRequest {
  jobId: string;
  title: string;
  filename: string;
  isIos: boolean;
  /** Start buffering immediately (the request itself came from a tap). */
  autoStart?: boolean;
}

export type FileShareOutcome = "shared" | "downloaded" | "dismissed" | "failed";

// Browsers keep a tap's user activation for only a few seconds; a transfer that
// finishes within this window can open the share sheet without a second tap.
const QUICK_SHARE_WINDOW_MS = 3000;
const COMPLETED_FILE_CACHE_TTL_MS = 15 * 60 * 1000;
const COMPLETED_FILE_CACHE_MAX_BYTES = 128 * 1024 * 1024;
const COMPLETED_FILE_CACHE_MAX_ITEMS = 2;
const completedFileCache = new Map<string, { file: File; cachedAt: number }>();
const inProgressTransfers = new Map<string, ResumableDownload>();

const IDLE: ShareTransferState = { phase: "idle", received: 0, total: null };

function getCachedCompletedFile(jobId: string): File | null {
  const cached = completedFileCache.get(jobId);
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > COMPLETED_FILE_CACHE_TTL_MS) {
    completedFileCache.delete(jobId);
    return null;
  }
  completedFileCache.delete(jobId);
  completedFileCache.set(jobId, cached);
  return cached.file;
}

function cacheCompletedFile(jobId: string, file: File) {
  if (file.size > COMPLETED_FILE_CACHE_MAX_BYTES) return;
  completedFileCache.delete(jobId);
  completedFileCache.set(jobId, { file, cachedAt: Date.now() });

  let cachedBytes = [...completedFileCache.values()].reduce(
    (total, cached) => total + cached.file.size,
    0
  );
  while (
    completedFileCache.size > COMPLETED_FILE_CACHE_MAX_ITEMS ||
    cachedBytes > COMPLETED_FILE_CACHE_MAX_BYTES
  ) {
    const oldestJobId = completedFileCache.keys().next().value;
    if (!oldestJobId) break;
    const oldest = completedFileCache.get(oldestJobId);
    completedFileCache.delete(oldestJobId);
    cachedBytes -= oldest?.file.size ?? 0;
  }
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

/**
 * Save/share flow for one completed file: buffer it with progress, pause while
 * the tab is suspended, and retain the transfer if the sheet is dismissed.
 */
export function FileShareFlow({
  request,
  onDone,
}: {
  request: FileShareRequest | null;
  onDone: (outcome: FileShareOutcome) => void;
}) {
  const { toast } = useToast();
  const { t } = useT();
  const [transfer, setTransfer] = useState<ShareTransferState>(IDLE);
  const [downloading, setDownloading] = useState(false);
  const transferRef = useRef<ResumableDownload | null>(null);
  const fileRef = useRef<File | null>(null);
  const runningRef = useRef(false);
  const autoStartedRef = useRef<string | null>(null);
  const activeJobIdRef = useRef<string | null>(null);
  const dismissedJobIdsRef = useRef(new Set<string>());
  const progressUnsubscribeRef = useRef<(() => void) | null>(null);
  const requestRef = useRef(request);
  const runTransferRef = useRef<(startedAt: number) => void>(() => {});

  useEffect(() => {
    requestRef.current = request;
  }, [request]);

  const subscribeToTransfer = useCallback((current: ResumableDownload) => {
    progressUnsubscribeRef.current?.();
    progressUnsubscribeRef.current = current.subscribeProgress(
      ({ received, total }) => {
        setTransfer((state) => ({ ...state, received, total }));
      }
    );
  }, []);

  const finish = useCallback(
    (outcome: FileShareOutcome) => {
      const activeJobId = activeJobIdRef.current;
      if (activeJobId && outcome !== "dismissed") {
        if (outcome === "failed") completedFileCache.delete(activeJobId);
        if (inProgressTransfers.get(activeJobId) === transferRef.current) {
          inProgressTransfers.delete(activeJobId);
        }
        dismissedJobIdsRef.current.delete(activeJobId);
      }
      progressUnsubscribeRef.current?.();
      progressUnsubscribeRef.current = null;
      transferRef.current?.abort();
      transferRef.current = null;
      fileRef.current = null;
      activeJobIdRef.current = null;
      setTransfer(IDLE);
      setDownloading(false);
      onDone(outcome);
    },
    [onDone]
  );

  const completeShare = useCallback(
    async (explicitTap: boolean) => {
      const file = fileRef.current;
      if (!file) return;
      const result = await shareBufferedFile(file);
      if (result === "shared") {
        toast("success", t("file.sharedSuccess", {}, "แชร์ไฟล์แล้ว"), file.name);
        finish("shared");
      } else if (result === "blocked" && explicitTap) {
        // The browser cannot share this file; save it with a download instead.
        saveBufferedFile(file);
        toast(
          "success",
          t("queue.completedToastTitle", {}, "ดาวน์โหลดสำเร็จแล้ว"),
          file.name
        );
        finish("downloaded");
      }
      // Otherwise (dismissed sheet, or the quick attempt lost its user
      // activation) stay ready so the next tap opens the share sheet.
    },
    [finish, t, toast]
  );

  const runTransfer = useCallback(
    async (startedAt: number) => {
      const current = transferRef.current;
      if (!current || !request || runningRef.current) return;
      runningRef.current = true;
      setTransfer((state) => ({ ...state, phase: "downloading" }));
      try {
        const result = await current.run();
        if (transferRef.current !== current) return;
        if (result === "paused") {
          setTransfer((state) => ({ ...state, phase: "paused" }));
          return;
        }
        fileRef.current = transferToFile(current, request.filename);
        cacheCompletedFile(request.jobId, fileRef.current);
        if (inProgressTransfers.get(request.jobId) === current) {
          inProgressTransfers.delete(request.jobId);
        }
        setTransfer({
          phase: "ready",
          received: current.received,
          total: current.total ?? current.received,
        });
        if (
          Date.now() - startedAt < QUICK_SHARE_WINDOW_MS &&
          !dismissedJobIdsRef.current.has(request.jobId)
        ) {
          await completeShare(false);
        }
      } catch (error) {
        if (transferRef.current !== current || isAbortError(error)) return;
        console.warn("[Share Transfer Error]:", error);
        toast(
          "error",
          t("file.shareError", {}, "แชร์ไฟล์ไม่สำเร็จ"),
          error instanceof DownloadHttpError ? error.message : t("error.genericDesc")
        );
        finish("failed");
      } finally {
        runningRef.current = false;
        const nextRequest = requestRef.current;
        if (
          nextRequest &&
          transferRef.current &&
          activeJobIdRef.current === nextRequest.jobId &&
          transferRef.current !== current
        ) {
          queueMicrotask(() => runTransferRef.current(Date.now()));
        }
      }
    },
    [completeShare, finish, request, t, toast]
  );
  useEffect(() => {
    runTransferRef.current = (startedAt) => {
      void runTransfer(startedAt);
    };
  }, [runTransfer]);

  const startTransfer = useCallback(() => {
    if (!request) return;

    if (activeJobIdRef.current === request.jobId && transferRef.current) {
      dismissedJobIdsRef.current.delete(request.jobId);
      subscribeToTransfer(transferRef.current);
      if (fileRef.current) {
        setTransfer({
          phase: "ready",
          received: transferRef.current.received,
          total: transferRef.current.total ?? transferRef.current.received,
        });
      } else if (!runningRef.current) {
        void runTransfer(Date.now());
      }
      return;
    }

    const cachedFile = getCachedCompletedFile(request.jobId);
    if (cachedFile) {
      progressUnsubscribeRef.current?.();
      progressUnsubscribeRef.current = null;
      transferRef.current = null;
      activeJobIdRef.current = request.jobId;
      dismissedJobIdsRef.current.delete(request.jobId);
      fileRef.current = cachedFile;
      setTransfer({
        phase: "ready",
        received: cachedFile.size,
        total: cachedFile.size,
      });
      return;
    }

    progressUnsubscribeRef.current?.();
    progressUnsubscribeRef.current = null;
    fileRef.current = null;
    activeJobIdRef.current = request.jobId;
    dismissedJobIdsRef.current.delete(request.jobId);
    const existingTransfer = inProgressTransfers.get(request.jobId);
    transferRef.current =
      existingTransfer ?? apiClient.createFileTransfer(request.jobId);
    if (!existingTransfer) inProgressTransfers.set(request.jobId, transferRef.current);
    subscribeToTransfer(transferRef.current);
    setTransfer({
      phase: "downloading",
      received: transferRef.current.received,
      total: transferRef.current.total,
    });
    void runTransfer(Date.now());
  }, [request, runTransfer, subscribeToTransfer]);

  // History share buttons open the flow from a tap, so start right away.
  useEffect(() => {
    if (!request?.autoStart || autoStartedRef.current === request.jobId) return;
    autoStartedRef.current = request.jobId;
    startTransfer();
  }, [request, startTransfer]);

  useEffect(() => {
    if (!request) {
      autoStartedRef.current = null;
      progressUnsubscribeRef.current?.();
      progressUnsubscribeRef.current = null;
    }
  }, [request]);

  // Continue a paused transfer as soon as the page is visible again.
  useEffect(() => {
    if (transfer.phase !== "paused") return;
    const resumeIfVisible = () => {
      if (document.visibilityState === "visible") void runTransfer(Date.now());
    };
    resumeIfVisible();
    document.addEventListener("visibilitychange", resumeIfVisible);
    return () => document.removeEventListener("visibilitychange", resumeIfVisible);
  }, [runTransfer, transfer.phase]);

  // Keep in-progress bytes available to another save flow on the same page.
  useEffect(
    () => () => {
      progressUnsubscribeRef.current?.();
      const activeJobId = activeJobIdRef.current;
      if (
        !activeJobId ||
        inProgressTransfers.get(activeJobId) !== transferRef.current
      ) {
        transferRef.current?.abort();
      }
    },
    []
  );

  const handleShare = useCallback(() => {
    if (transfer.phase === "ready") void completeShare(true);
    else if (transfer.phase === "paused") void runTransfer(Date.now());
    else if (transfer.phase === "idle") {
      const cachedFile = request ? getCachedCompletedFile(request.jobId) : null;
      if (cachedFile) {
        activeJobIdRef.current = request?.jobId ?? null;
        fileRef.current = cachedFile;
        setTransfer({
          phase: "ready",
          received: cachedFile.size,
          total: cachedFile.size,
        });
        void completeShare(true);
      } else {
        startTransfer();
      }
    }
  }, [completeShare, request, runTransfer, startTransfer, transfer.phase]);

  const handleDownload = useCallback(async () => {
    if (!request) return;
    const file = fileRef.current;
    if (file) {
      saveBufferedFile(file);
      toast(
        "success",
        t("queue.completedToastTitle", {}, "ดาวน์โหลดสำเร็จแล้ว"),
        file.name
      );
      finish("downloaded");
      return;
    }
    const activeJobId = activeJobIdRef.current;
    if (activeJobId && inProgressTransfers.get(activeJobId) === transferRef.current) {
      inProgressTransfers.delete(activeJobId);
    }
    progressUnsubscribeRef.current?.();
    progressUnsubscribeRef.current = null;
    transferRef.current?.abort();
    transferRef.current = null;
    setTransfer(IDLE);
    setDownloading(true);
    try {
      await apiClient.downloadJobFile(request.jobId, request.filename, null);
      toast(
        "success",
        t("queue.completedToastTitle", {}, "ดาวน์โหลดสำเร็จแล้ว"),
        request.filename
      );
      finish("downloaded");
    } catch (error) {
      console.warn("[Download File Error]:", error);
      toast(
        "error",
        t("history.downloadError", {}, "ดาวน์โหลดไฟล์ไม่สำเร็จ"),
        error instanceof Error && error.message ? error.message : t("error.genericDesc")
      );
      finish("failed");
    }
  }, [finish, request, t, toast]);

  const handleDismiss = useCallback(() => {
    if (downloading) return;
    if (request && activeJobIdRef.current === request.jobId && transferRef.current) {
      dismissedJobIdsRef.current.add(request.jobId);
      onDone("dismissed");
      return;
    }
    finish("dismissed");
  }, [downloading, finish, onDone, request]);

  return (
    <SaveFileDialog
      open={request !== null}
      title={request?.title ?? ""}
      transfer={transfer}
      downloading={downloading}
      isIos={request?.isIos ?? false}
      onShare={handleShare}
      onDownload={() => void handleDownload()}
      onDismiss={handleDismiss}
    />
  );
}
