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
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { FULL_PAGE_AUTH_MEDIA_QUERY } from "@/components/auth-route";
import { requestMediaAnalysis } from "@/lib/analyzer-session";
import { useT } from "@/lib/i18n/context";
import styles from "./auth-form.module.css";

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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<
    "login" | "register" | "forgot-password" | "reset-password"
  >("login");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const openAuth = useCallback(
    (url?: string) => {
      if (url) requestMediaAnalysis(url);
      if (window.matchMedia(FULL_PAGE_AUTH_MEDIA_QUERY).matches) {
        router.push("/auth/login");
        return;
      }
      setMode("login");
      setOpen(true);
    },
    [router]
  );
  const context = useMemo(() => ({ openAuth }), [openAuth]);

  useEffect(() => {
    if (!open) return;
    const media = window.matchMedia(FULL_PAGE_AUTH_MEDIA_QUERY);
    const updatePresentation = () => {
      if (!media.matches) return;
      router.replace(`/auth/${mode}`);
    };
    updatePresentation();
    media.addEventListener("change", updatePresentation);
    return () => media.removeEventListener("change", updatePresentation);
  }, [open, mode, router]);

  useEffect(() => {
    const requestedMode = new URLSearchParams(window.location.search).get("auth");
    if (
      requestedMode !== "login" &&
      requestedMode !== "register" &&
      requestedMode !== "forgot-password"
    )
      return;
    if (window.matchMedia(FULL_PAGE_AUTH_MEDIA_QUERY).matches) {
      const params = new URLSearchParams(window.location.search);
      params.delete("auth");
      router.replace(`/auth/${requestedMode}${params.size ? `?${params}` : ""}`);
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      setMode(requestedMode);
      setOpen(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [router]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) dialog.close();
    scrollRef.current?.scrollTo(0, 0);

    if (!open) return;

    const viewport = window.visualViewport;
    const syncDialogViewport = () => {
      dialog.style.setProperty(
        "--auth-viewport-height",
        `${Math.round(viewport?.height ?? window.innerHeight)}px`
      );
      dialog.style.setProperty(
        "--auth-viewport-offset-top",
        `${Math.round(viewport?.offsetTop ?? 0)}px`
      );
    };

    syncDialogViewport();
    viewport?.addEventListener("resize", syncDialogViewport);
    viewport?.addEventListener("scroll", syncDialogViewport);
    window.addEventListener("resize", syncDialogViewport);

    if (!window.matchMedia("(pointer: coarse)").matches) {
      dialog.querySelector<HTMLInputElement>("input")?.focus();
    }

    return () => {
      viewport?.removeEventListener("resize", syncDialogViewport);
      viewport?.removeEventListener("scroll", syncDialogViewport);
      window.removeEventListener("resize", syncDialogViewport);
    };
  }, [open, mode]);

  function closeAuth() {
    setOpen(false);
    setMode("login");
    if (new URLSearchParams(window.location.search).has("auth")) {
      router.replace("/", { scroll: false });
    }
  }

  return (
    <LandingAuthContext.Provider value={context}>
      {children}
      <dialog
        ref={dialogRef}
        aria-labelledby="auth-title"
        onClose={closeAuth}
        onCancel={closeAuth}
        className={`${styles.modalSurface} fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-[392px] h-fit max-h-[calc(100dvh-2rem)] overflow-hidden rounded-2xl border p-0 text-text`}
      >
        <button
          type="button"
          aria-label={t("common.close")}
          onClick={closeAuth}
          className={`${styles.modalClose} absolute top-[max(14px,env(safe-area-inset-top))] right-[max(14px,env(safe-area-inset-right))] sm:top-3.5 sm:right-3.5 z-10 grid size-9 sm:size-8 cursor-pointer place-items-center rounded-full sm:rounded-md border border-border/80 bg-bg-surface sm:bg-bg-elevated text-text-muted shadow-sm transition-colors hover:bg-bg-elevated hover:text-text outline-none focus-visible:outline-2 focus-visible:outline-primary`}
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
