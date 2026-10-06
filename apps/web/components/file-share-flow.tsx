"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  SaveFileDialog,
  type ShareTransferState,
} from "@/components/save-file-dialog";
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

const IDLE: ShareTransferState = { phase: "idle", received: 0, total: null };

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

/**
 * Save/share flow for one completed file: buffer it with progress, pause while
 * the tab is suspended and resume afterwards, then hand it to the share sheet.
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

  const finish = useCallback(
    (outcome: FileShareOutcome) => {
      transferRef.current?.abort();
      transferRef.current = null;
      fileRef.current = null;
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
        setTransfer({
          phase: "ready",
          received: current.received,
          total: current.total ?? current.received,
        });
        if (Date.now() - startedAt < QUICK_SHARE_WINDOW_MS) {
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
      }
    },
    [completeShare, finish, request, t, toast]
  );

  const startTransfer = useCallback(() => {
    if (!request) return;
    transferRef.current = apiClient.createFileTransfer(
      request.jobId,
      ({ received, total }) => setTransfer((state) => ({ ...state, received, total }))
    );
    void runTransfer(Date.now());
  }, [request, runTransfer]);

  // History share buttons open the flow from a tap, so start right away.
  useEffect(() => {
    if (!request?.autoStart || autoStartedRef.current === request.jobId) return;
    autoStartedRef.current = request.jobId;
    startTransfer();
  }, [request, startTransfer]);

  useEffect(() => {
    if (!request) autoStartedRef.current = null;
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

  // Abort a transfer that is still running when the flow unmounts.
  useEffect(() => () => transferRef.current?.abort(), []);

  const handleShare = useCallback(() => {
    if (transfer.phase === "ready") void completeShare(true);
    else if (transfer.phase === "paused") void runTransfer(Date.now());
    else if (transfer.phase === "idle") startTransfer();
  }, [completeShare, runTransfer, startTransfer, transfer.phase]);

  const handleDownload = useCallback(async () => {
    if (!request) return;
    const file = fileRef.current;
    if (file) {
      saveBufferedFile(file);
      toast("success", t("queue.completedToastTitle", {}, "ดาวน์โหลดสำเร็จแล้ว"), file.name);
      finish("downloaded");
      return;
    }
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
    finish("dismissed");
  }, [downloading, finish]);

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
