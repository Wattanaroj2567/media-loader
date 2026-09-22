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
  /** True when the dialog is shown on an iOS device (iPhone / iPad).
   *  On iOS the Share sheet can save directly into Photos, so Share becomes
   *  the primary action and Download to Files is secondary. */
  isIos?: boolean;
  onShare: () => void;
  onDownload: () => void;
  onDismiss: () => void;
}

/**
 * Bottom-sheet style chooser shown on mobile when a download completes.
 *
 * iOS — primary: Share (→ "Save Video / Save Image" into Photos app)
 *        secondary: Download to Files
 *
 * Android / Desktop — primary: Download to Files / browser download
 *                     secondary: Share sheet
 */
export function SaveFileDialog({
  open,
  title,
  busy = false,
  busyAction = null,
  isIos = false,
  onShare,
  onDownload,
  onDismiss,
}: SaveFileDialogProps) {
  const { t } = useT();

  if (!open || typeof window === "undefined") return null;

  const shareBtn = (primary: boolean) => (
    <Button
      type="button"
      variant={primary ? "default" : "outline"}
      onClick={onShare}
      disabled={busy}
      className="h-12 w-full gap-2 rounded-xl text-sm font-semibold cursor-pointer"
    >
      {busy && busyAction === "share" ? (
        <LoadingIndicator
          label={t("download.preparing", {}, "กำลังเตรียมไฟล์...")}
          iconClassName="size-4"
        />
      ) : (
        <>
          <Share2 aria-hidden="true" className="size-4 shrink-0" />
          <span>
            {isIos
              ? t("file.shareActionIos", {}, "บันทึกลงรูปภาพ / แชร์")
              : t("file.shareAction", {}, "แชร์ / บันทึกลงแอปรูปภาพ")}
          </span>
        </>
      )}
    </Button>
  );

  const downloadBtn = (primary: boolean) => (
    <Button
      type="button"
      variant={primary ? "default" : "outline"}
      onClick={onDownload}
      disabled={busy}
      className="h-12 w-full gap-2 rounded-xl text-sm font-semibold cursor-pointer"
    >
      {busy && busyAction === "download" ? (
        <LoadingIndicator
          label={t("download.preparing", {}, "กำลังเตรียมดาวน์โหลด...")}
          iconClassName="size-4"
        />
      ) : (
        <>
          <Download aria-hidden="true" className="size-4 shrink-0" />
          <span>{t("file.downloadAction", {}, "ดาวน์โหลดไฟล์")}</span>
        </>
      )}
    </Button>
  );

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
              {isIos
                ? t(
                    "file.saveDescIos",
                    {},
                    "กดบันทึกลงรูปภาพเพื่อเซฟลง Photos หรือดาวน์โหลดลง Files"
                  )
                : t("file.saveDesc", {}, "เลือกวิธีบันทึกไฟล์ลงเครื่องของคุณ")}
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
          {isIos ? (
            <>
              {shareBtn(true)}
              {downloadBtn(false)}
            </>
          ) : (
            <>
              {downloadBtn(true)}
              {shareBtn(false)}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
