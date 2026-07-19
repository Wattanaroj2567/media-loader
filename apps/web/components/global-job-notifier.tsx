"use client";

import { useEffect, useRef } from "react";
import { apiClient } from "@/lib/api-client";
import { isActiveStatus, isTerminalStatus } from "@/lib/media-presenters";
import { useToast } from "@/components/toast";
import { useT } from "@/lib/i18n/context";
import {
  beginDownloadDelivery,
  finishDownloadDelivery,
  forgetPendingDownload,
  getPendingDownload,
} from "@/lib/download-coordinator";

export function GlobalJobNotifier() {
  const { toast } = useToast();
  const { t } = useT();
  const prevJobsRef = useRef<Record<string, string>>({}); // maps jobId -> status

  useEffect(() => {
    let dead = false;

    async function pollActiveJobs() {
      if (typeof window !== "undefined" && !window.navigator.onLine) {
        return;
      }
      try {
        const jobs = await apiClient.listJobs({ limit: 100 });
        if (dead) return;

        let changed = false;
        const currentJobs: Record<string, string> = {};

        for (const job of jobs) {
          currentJobs[job.id] = job.status;

          const pendingDownload = getPendingDownload(job.id);
          let handledPendingDownload = false;
          if (
            job.status === "COMPLETED" &&
            pendingDownload &&
            beginDownloadDelivery(job.id)
          ) {
            changed = true;
            handledPendingDownload = true;
            try {
              await apiClient.downloadJobFile(
                job.id,
                pendingDownload.filename,
                pendingDownload.destination,
              );
              finishDownloadDelivery(job.id, true);
              toast(
                "success",
                t("queue.completedToastTitle", {}, "ดาวน์โหลดสำเร็จแล้ว"),
                pendingDownload.filename,
              );
            } catch (err) {
              finishDownloadDelivery(job.id, false);
              forgetPendingDownload(job.id);
              console.warn("[Automatic File Delivery Error]:", err);
              toast(
                "error",
                t("history.downloadError", {}, "ดาวน์โหลดไฟล์ไม่สำเร็จ"),
                t("error.genericDesc"),
              );
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
              toast("error", t("queue.failedToastTitle", {}, "ดาวน์โหลดล้มเหลว"), title);
            } else if (job.status === "BLOCKED") {
              toast("error", t("queue.blockedToastTitle", {}, "ดาวน์โหลดถูกบล็อก"), title);
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
                toast("success", t("queue.completedToastTitle", {}, "ดาวน์โหลดสำเร็จแล้ว"), title);
              } else if (job.status === "FAILED") {
                forgetPendingDownload(job.id);
                toast("error", t("queue.failedToastTitle", {}, "ดาวน์โหลดล้มเหลว"), title);
              } else if (job.status === "BLOCKED") {
                forgetPendingDownload(job.id);
                toast("error", t("queue.blockedToastTitle", {}, "ดาวน์โหลดถูกบล็อก"), title);
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
      } catch (err) {
        console.warn("[GlobalJobNotifier Error]:", err);
      }
    }

    // Run initially
    void pollActiveJobs();

    // Poll every 4 seconds
    const interval = setInterval(pollActiveJobs, 4000);

    return () => {
      dead = true;
      clearInterval(interval);
    };
  }, [toast, t]);

  return null;
}
