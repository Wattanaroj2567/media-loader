"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  apiClient,
  canShareFiles,
  isMobileDevice,
  isIosDevice,
} from "@/lib/api-client";
import { isActiveStatus, isTerminalStatus } from "@/lib/media-presenters";
import { useToast } from "@/components/toast";
import { useT } from "@/lib/i18n/context";
import {
  FileShareFlow,
  type FileShareOutcome,
  type FileShareRequest,
} from "@/components/file-share-flow";
import {
  beginDownloadDelivery,
  finishDownloadDelivery,
  forgetPendingDownload,
  getPendingDownload,
} from "@/lib/download-coordinator";
import { useJobPolling } from "@/components/job-polling-provider";

export function GlobalJobNotifier() {
  const { toast } = useToast();
  const { t } = useT();
  const { jobs } = useJobPolling();
  const prevJobsRef = useRef<Record<string, string>>({}); // maps jobId -> status
  const [choice, setChoice] = useState<FileShareRequest | null>(null);
  const choiceRef = useRef<FileShareRequest | null>(null);

  const handleChoiceDone = useCallback(
    (outcome: FileShareOutcome) => {
      const current = choiceRef.current;
      choiceRef.current = null;
      setChoice(null);
      if (!current) return;
      if (outcome === "shared" || outcome === "downloaded") {
        finishDownloadDelivery(current.jobId, true);
        return;
      }
      forgetPendingDownload(current.jobId);
      if (outcome === "dismissed") {
        // Keep the file on the server (temporary retention) — the user can
        // still share or download it from the History page.
        toast(
          "info",
          t("file.savedLaterTitle", {}, "เก็บไฟล์ไว้ให้แล้ว"),
          t("file.savedLaterDesc", {}, "ไปที่หน้าประวัติเพื่อแชร์หรือดาวน์โหลดได้")
        );
      }
    },
    [t, toast]
  );

  useEffect(() => {
    let dead = false;

    async function processJobs() {
      if (dead) return;
      try {
        let changed = false;
        const currentJobs: Record<string, string> = {};

        for (const job of jobs) {
          currentJobs[job.id] = job.status;

          const pendingDownload = getPendingDownload(job.id);
          let handledPendingDownload = false;
          if (job.status === "COMPLETED" && pendingDownload) {
            // This job's delivery flow owns the completion notification even
            // when another poll already claimed and is currently fetching the
            // file. Otherwise a generic completion toast can fire before the
            // browser Save As prompt, followed by a second toast afterwards.
            handledPendingDownload = true;

            // On phones/tablets, let the user pick how to save the file: the
            // native share sheet can save straight into Photos (iOS) or to
            // Photos/Files/Drive (Android). Desktop keeps the automatic
            // browser download. Keep only one chooser open so the user can
            // decide how to handle each completed file clearly.
            const preferShareSheet =
              isMobileDevice() && canShareFiles() && !pendingDownload.destination;

            // While a chooser is already open, don't claim extra completed
            // jobs — they will be offered once the current one is resolved.
            if (preferShareSheet && choiceRef.current) {
              continue;
            }

            if (beginDownloadDelivery(job.id)) {
              changed = true;

              if (preferShareSheet) {
                choiceRef.current = {
                  jobId: job.id,
                  title: job.title || pendingDownload.filename,
                  filename: pendingDownload.filename,
                  isIos: isIosDevice(),
                };
                setChoice(choiceRef.current);
                continue;
              }

              try {
                await apiClient.downloadJobFile(
                  job.id,
                  pendingDownload.filename,
                  pendingDownload.destination
                );
                finishDownloadDelivery(job.id, true);
                toast(
                  "success",
                  t("queue.completedToastTitle", {}, "ดาวน์โหลดสำเร็จแล้ว"),
                  pendingDownload.filename
                );
              } catch (err) {
                finishDownloadDelivery(job.id, false);
                forgetPendingDownload(job.id);
                console.warn("[Automatic File Delivery Error]:", err);
                toast(
                  "error",
                  t("history.downloadError", {}, "ดาวน์โหลดไฟล์ไม่สำเร็จ"),
                  err instanceof Error && err.message
                    ? err.message
                    : t("error.genericDesc")
                );
              }
            }
          }

          if (
            pendingDownload &&
            ["FAILED", "BLOCKED", "CANCELLED"].includes(job.status)
          ) {
            changed = true;
            handledPendingDownload = true;
            forgetPendingDownload(job.id);
            const title = job.title || job.output_filename || job.original_url;
            if (job.status === "FAILED") {
              toast(
                "error",
                t("queue.failedToastTitle", {}, "ดาวน์โหลดล้มเหลว"),
                title
              );
            } else if (job.status === "BLOCKED") {
              toast(
                "error",
                t("queue.blockedToastTitle", {}, "ดาวน์โหลดถูกบล็อก"),
                title
              );
            }
          }

          const prevStatus = prevJobsRef.current[job.id];
          if (prevStatus) {
            const wasActive = isActiveStatus(prevStatus);
            const isTerminal = isTerminalStatus(job.status);

            if (wasActive && isTerminal) {
              changed = true;
              const title = job.title || job.output_filename || job.original_url;

              if (handledPendingDownload) {
                // The pending download path already announced this outcome.
              } else if (job.status === "COMPLETED") {
                toast(
                  "success",
                  t("queue.completedToastTitle", {}, "ดาวน์โหลดสำเร็จแล้ว"),
                  title
                );
              } else if (job.status === "FAILED") {
                forgetPendingDownload(job.id);
                toast(
                  "error",
                  t("queue.failedToastTitle", {}, "ดาวน์โหลดล้มเหลว"),
                  title
                );
              } else if (job.status === "BLOCKED") {
                forgetPendingDownload(job.id);
                toast(
                  "error",
                  t("queue.blockedToastTitle", {}, "ดาวน์โหลดถูกบล็อก"),
                  title
                );
              } else if (job.status === "CANCELLED") {
                forgetPendingDownload(job.id);
              }
            }
          }
        }

        // Initialize prevJobsRef for new jobs without triggering notifications
        jobs.forEach((job) => {
          if (prevJobsRef.current[job.id] === undefined) {
            prevJobsRef.current[job.id] = job.status;
          }
        });

        // Update status for existing jobs
        Object.keys(currentJobs).forEach((id) => {
          prevJobsRef.current[id] = currentJobs[id];
        });

        if (changed) {
          // Trigger events to update mounted JobLists or other page states
          window.dispatchEvent(new CustomEvent("media-loader:jobs-changed"));
        }
      } catch (err: unknown) {
        if (dead) return;
        console.warn("[GlobalJobNotifier Error]:", err);
      }
    }

    void processJobs();

    return () => {
      dead = true;
    };
  }, [jobs, toast, t]);

  return <FileShareFlow request={choice} onDone={handleChoiceDone} />;
}
