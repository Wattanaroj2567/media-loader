"use client";

import { createPortal } from "react-dom";
import { Download, Share2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LoadingIndicator } from "@/components/loading-indicator";
import { useT } from "@/lib/i18n/context";

interface SaveFileDialogProps {
  open: boolean;
  title: string;
  busy?: boolean;
  busyAction?: "share" | "download" | null;
  onShare: () => void;
  onDownload: () => void;
  onDismiss: () => void;
}

/**
 * Bottom-sheet style chooser shown on mobile when a download completes.
 * Lets the user decide between the native share sheet (iOS: "Save Video" /
 * "Save Image" straight into Photos; Android: pick Photos/Files/Drive) or a
 * regular browser download. The file stays available until retention cleanup,
 * but the user picks first to avoid opening multiple save actions at once.
 */
export function SaveFileDialog({
  open,
  title,
  busy = false,
  busyAction = null,
  onShare,
  onDownload,
  onDismiss,
}: SaveFileDialogProps) {
  const { t } = useT();

  if (!open || typeof window === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("file.saveTitle", {}, "ไฟล์พร้อมแล้ว")}
      onClick={onDismiss}
      className="fixed inset-0 z-9999 flex items-end justify-center bg-black/55 p-3 backdrop-blur-[2px] sm:items-center sm:p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="ui-panel w-full max-w-md rounded-3xl border border-border bg-bg-surface p-5 animate-fade-in-up sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-semibold text-text">
              {t("file.saveTitle", {}, "ไฟล์พร้อมแล้ว")}
            </p>
            <p className="mt-1 text-xs leading-5 text-text-muted">
              {t("file.saveDesc", {}, "เลือกวิธีบันทึกไฟล์ลงเครื่องของคุณ")}
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            disabled={busy}
            aria-label={t("common.close", {}, "ปิด")}
            className="grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-bg-base/80 text-text-muted transition-colors hover:bg-bg-surface hover:text-text disabled:opacity-50 cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        <p
          title={title}
          className="mt-4 truncate rounded-xl border border-border/70 bg-bg-base/50 px-3.5 py-2.5 text-sm font-medium text-text"
        >
          {title}
        </p>

        <div className="mt-4 grid gap-2.5">
          <Button
            type="button"
            onClick={onShare}
            disabled={busy}
            className="h-12 w-full gap-2 rounded-xl text-sm font-semibold cursor-pointer"
          >
            {busy && busyAction === "share" ? (
              <LoadingIndicator
                label={t("download.preparing", {}, "กำลังเตรียมดาวน์โหลด...")}
                iconClassName="size-4"
              />
            ) : (
              <>
                <Share2 aria-hidden="true" className="size-4 shrink-0" />
                <span>{t("file.shareAction", {}, "แชร์ / บันทึกลงแอปรูปภาพ")}</span>
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onDownload}
            disabled={busy}
            className="h-12 w-full gap-2 rounded-xl text-sm font-semibold cursor-pointer"
          >
            <Download aria-hidden="true" className="size-4 shrink-0 text-primary" />
            <span>{t("file.downloadAction", {}, "ดาวน์โหลดไฟล์")}</span>
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
