"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "danger" | "warning" | "info";
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmText = "ตกลง",
  cancelText = "ยกเลิก",
  onConfirm,
  onCancel,
  variant = "info",
}: ConfirmDialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen || typeof window === "undefined") return null;

  const accentColor =
    variant === "danger"
      ? "text-rose-400 border-rose-500/20 bg-rose-500/10"
      : variant === "warning"
      ? "text-amber-400 border-amber-500/20 bg-amber-500/10"
      : "text-primary border-primary/20 bg-primary/10";

  const confirmBtnClass =
    variant === "danger"
      ? "bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
      : variant === "warning"
      ? "bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold cursor-pointer"
      : "bg-primary hover:bg-primary/90 text-slate-950 font-semibold cursor-pointer";

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] flex h-full w-full items-center justify-center bg-black/80 p-4 transition-opacity duration-200 animate-in fade-in"
      onClick={(e) => {
        if (e.target === overlayRef.current) onCancel();
      }}
    >
      <div
        className="ui-panel w-full max-w-md overflow-hidden rounded-3xl border border-border bg-bg-surface p-5 shadow-2xl transition-all duration-200 sm:p-6 animate-in zoom-in-95"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-desc"
      >
        <div className="flex items-start gap-3.5">
          <div className={`grid size-11 shrink-0 place-items-center rounded-2xl border ${accentColor}`}>
            <AlertTriangle className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="dialog-title" className="text-lg font-semibold text-text leading-snug">
              {title}
            </h2>
            <p id="dialog-desc" className="mt-2 text-sm leading-relaxed text-text-muted">
              {description}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 w-full rounded-xl border border-border bg-bg-base/80 px-4 text-sm font-medium text-text-muted hover:bg-bg-surface hover:text-text sm:h-10 sm:w-auto cursor-pointer"
          >
            {cancelText}
          </button>
          <Button
            onClick={onConfirm}
            className={`h-11 w-full rounded-xl px-4 text-sm font-medium sm:h-10 sm:w-auto ${confirmBtnClass}`}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
