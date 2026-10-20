"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import { X } from "lucide-react";
import { requestMediaAnalysis } from "@/lib/analyzer-session";
import { useT } from "@/lib/i18n/context";
import styles from "./auth-form.module.css";

const AuthForm = dynamic(
  () => import("@/components/auth-form").then((module) => module.AuthForm),
  { ssr: false, loading: () => null }
);

const LandingAuthContext = createContext<{ openAuth: (url?: string) => void } | null>(
  null
);

export function useLandingAuth() {
  const context = useContext(LandingAuthContext);
  if (!context) throw new Error("Landing authentication requires LandingAuthProvider");
  return context;
}

export function LandingAuthProvider({ children }: { children: ReactNode }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<
    "login" | "register" | "forgot-password" | "reset-password"
  >("login");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const openAuth = useCallback((url?: string) => {
    if (url) requestMediaAnalysis(url);
    setMode("login");
    setOpen(true);
  }, []);
  const context = useMemo(() => ({ openAuth }), [openAuth]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLInputElement>("input")?.focus();
    } else if (!open && dialog.open) dialog.close();
    scrollRef.current?.scrollTo(0, 0);
  }, [open, mode]);

  function closeAuth() {
    setOpen(false);
    setMode("login");
  }

  return (
    <LandingAuthContext.Provider value={context}>
      {children}
      <dialog
        ref={dialogRef}
        aria-labelledby="auth-title"
        onClose={closeAuth}
        onCancel={closeAuth}
        className={`${styles.modalSurface} fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-[392px] overflow-hidden rounded-2xl border p-0 text-text`}
      >
        <button
          type="button"
          aria-label={t("common.close")}
          onClick={closeAuth}
          className={`${styles.modalClose} absolute top-3.5 right-3.5 z-10 grid size-8 cursor-pointer place-items-center rounded-md border border-border/80 bg-bg-elevated text-text-muted shadow-sm transition-colors hover:bg-bg-surface hover:text-text outline-none focus-visible:outline-2 focus-visible:outline-primary`}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
        <div
          ref={scrollRef}
          className={styles.modalScroll}
          data-testid="auth-modal-scroll"
        >
          {open && (
            <AuthForm
              key={mode}
              mode={mode}
              presentation="modal"
              onModeChange={setMode}
            />
          )}
        </div>
      </dialog>
    </LandingAuthContext.Provider>
  );
}
