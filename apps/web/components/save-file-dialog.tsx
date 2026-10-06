"use client";

import { createPortal } from "react-dom";
import { Download, RotateCw, Share2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LoadingIndicator } from "@/components/loading-indicator";
import { useT } from "@/lib/i18n/context";

type ShareTransferPhase = "idle" | "downloading" | "paused" | "ready";

export interface ShareTransferState {
  phase: ShareTransferPhase;
  received: number;
  total: number | null;
}

interface SaveFileDialogProps {
  open: boolean;
  title: string;
  /** Progress of buffering the file for the share sheet. */
  transfer: ShareTransferState;
  downloading?: boolean;
  /** True when the dialog is shown on an iOS device (iPhone / iPad).
   *  On iOS the Share sheet can save directly into Photos, so Share becomes
   *  the primary action and Download to Files is secondary. */
  isIos?: boolean;
  onShare: () => void;
  onDownload: () => void;
  onDismiss: () => void;
}

function formatMegabytes(bytes: number) {
  return (bytes / (1000 * 1000)).toFixed(1);
}

/**
 * Bottom-sheet style chooser shown on mobile when a download completes.
 *
 * iOS — primary: Share (→ "Save Video / Save Image" into Photos app)
 *        secondary: Download to Files
 *
 * Android / Desktop — primary: Download to Files / browser download
 *                     secondary: Share sheet
 *
 * The share sheet needs the whole file, so Share first buffers it (with
 * progress) and then asks for a second tap when the first tap's user
 * activation has expired.
 */
export function SaveFileDialog({
  open,
  title,
  transfer,
  downloading = false,
  isIos = false,
  onShare,
  onDownload,
  onDismiss,
}: SaveFileDialogProps) {
  const { t } = useT();

  if (!open || typeof window === "undefined") return null;

  const { phase, received, total } = transfer;
  const percent =
    total && total > 0 ? Math.min(100, Math.floor((received / total) * 100)) : null;
  const shareLabel = isIos
    ? t("file.shareActionIos", {}, "บันทึกลงรูปภาพ / แชร์")
    : t("file.shareAction", {}, "แชร์ / บันทึกลงแอปรูปภาพ");

  const shareBtn = (primary: boolean) => (
    <Button
      type="button"
      variant={primary || phase === "ready" ? "default" : "outline"}
      onClick={onShare}
      disabled={phase === "downloading" || downloading}
      className="h-12 w-full gap-2 rounded-xl text-sm font-semibold cursor-pointer"
    >
      {phase === "downloading" ? (
        <LoadingIndicator
          label={
            percent === null
              ? t("file.transferLoading", {}, "กำลังโหลดไฟล์...")
              : t("file.transferLoadingPercent", { percent }, `กำลังโหลดไฟล์ ${percent}%`)
          }
          iconClassName="size-4"
        />
      ) : phase === "paused" ? (
        <>
          <RotateCw aria-hidden="true" className="size-4 shrink-0" />
          <span>{t("file.transferResume", {}, "โหลดต่อ")}</span>
        </>
      ) : (
        <>
          <Share2 aria-hidden="true" className="size-4 shrink-0" />
          <span>{shareLabel}</span>
        </>
      )}
    </Button>
  );

  const downloadBtn = (primary: boolean) => (
    <Button
      type="button"
      variant={primary && phase !== "ready" ? "default" : "outline"}
      onClick={onDownload}
      disabled={downloading || phase === "downloading"}
      className="h-12 w-full gap-2 rounded-xl text-sm font-semibold cursor-pointer"
    >
      {downloading ? (
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

  const transferHint =
    phase === "downloading"
      ? t(
          "file.transferHint",
          {},
          "กำลังโหลดไฟล์ก่อนบันทึก ถ้าสลับไปแอปอื่น ระบบจะพักไว้และโหลดต่อเมื่อกลับมา"
        )
      : phase === "paused"
        ? t(
            "file.transferPausedHint",
            {},
            "พักการโหลดไว้ระหว่างที่ออกจากหน้านี้ จะโหลดต่อจากเดิมเมื่อกลับมา"
          )
        : t("file.transferReadyHint", {}, "ไฟล์พร้อมแล้ว แตะปุ่มด้านล่างเพื่อบันทึก");

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
            disabled={downloading}
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

        {phase !== "idle" && (
          <div className="mt-4" data-testid="share-transfer">
            <div
              role="progressbar"
              aria-label={t("file.transferProgress", {}, "ความคืบหน้าการโหลดไฟล์")}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={phase === "ready" ? 100 : (percent ?? undefined)}
              className="h-2 overflow-hidden rounded-full bg-bg-base"
            >
              <div
                className={`h-full rounded-full transition-[width] duration-300 ${
                  phase === "paused" ? "bg-text-muted" : "bg-primary"
                }`}
                style={{ width: `${phase === "ready" ? 100 : (percent ?? 8)}%` }}
              />
            </div>
            <div className="mt-2 flex items-start justify-between gap-3 text-xs leading-5 text-text-muted">
              <p>{transferHint}</p>
              <p className="shrink-0 tabular-nums">
                {total
                  ? `${formatMegabytes(received)} / ${formatMegabytes(total)} MB`
                  : `${formatMegabytes(received)} MB`}
              </p>
            </div>
          </div>
        )}

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
