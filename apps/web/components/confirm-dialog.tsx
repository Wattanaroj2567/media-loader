"use client";

import { useEffect, useRef } from "react";
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

  if (!isOpen) return null;

  const accentColor =
    variant === "danger"
      ? "text-rose-400 border-rose-500/20 bg-rose-500/10"
      : variant === "warning"
      ? "text-amber-400 border-amber-500/20 bg-amber-500/10"
      : "text-primary border-primary/20 bg-primary/10";

  const confirmBtnClass =
    variant === "danger"
      ? "bg-rose-600 hover:bg-rose-500 text-white"
      : variant === "warning"
      ? "bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold"
      : "bg-primary hover:bg-primary/90 text-slate-950 font-semibold";

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px] transition-opacity duration-200 animate-in fade-in"
      onClick={(e) => {
        if (e.target === overlayRef.current) onCancel();
      }}
    >
      <div
        className="w-full max-w-md scale-95 overflow-hidden rounded-2xl border border-border bg-popover p-5 shadow-2xl transition-all duration-200 animate-in zoom-in-95"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-desc"
      >
        <div className="flex items-start gap-3.5">
          <div className={`grid size-10 shrink-0 place-items-center rounded-xl border ${accentColor}`}>
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

        <div className="mt-6 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 px-4 rounded-xl text-sm font-medium border border-border bg-bg-surface/50 hover:bg-bg-surface text-text-muted hover:text-text cursor-pointer"
          >
            {cancelText}
          </button>
          <Button
            onClick={onConfirm}
            className={`h-10 px-4 rounded-xl text-sm font-medium ${confirmBtnClass}`}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
