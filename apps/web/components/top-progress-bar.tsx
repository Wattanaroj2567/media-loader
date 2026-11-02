"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { useT } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

const PROGRESS_STYLES = `
@keyframes top-progress-sweep {
  0% {
    transform: translateX(-100%);
  }
  60% {
    transform: translateX(-20%);
  }
  85% {
    transform: translateX(0%);
  }
  100% {
    transform: translateX(0%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .top-progress-line {
    animation: none !important;
    display: none !important;
  }
}
`;

function useGlobalStyles(css: string, id: string) {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(id)) return;

    const style = document.createElement("style");
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }, [css, id]);
}

interface TopProgressBarProps {
  className?: string;
}

export function TopProgressBar({ className }: TopProgressBarProps) {
  const { t } = useT();
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [fading, setFading] = useState(false);
  const navigationStarted = useRef(false);
  const previousPathname = useRef(pathname);
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const routeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useGlobalStyles(PROGRESS_STYLES, "top-progress-bar-styles");

  const finishProgress = useCallback(() => {
    if (finishTimer.current) clearTimeout(finishTimer.current);
    setFading(true);
    finishTimer.current = setTimeout(() => {
      setActive(false);
      setFading(false);
      finishTimer.current = null;
    }, 250);
  }, []);

  useEffect(() => {
    const startProgressForLink = (event: MouseEvent) => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;

      const link = target.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      if (link.hasAttribute("download") || (link.target && link.target !== "_self")) {
        return;
      }

      const destination = new URL(link.href, window.location.href);
      if (
        destination.origin !== window.location.origin ||
        destination.pathname === window.location.pathname
      ) {
        return;
      }

      navigationStarted.current = true;
      if (finishTimer.current) clearTimeout(finishTimer.current);
      if (routeTimer.current) clearTimeout(routeTimer.current);
      if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
      setFading(false);
      setActive(true);

      fallbackTimer.current = setTimeout(() => {
        navigationStarted.current = false;
        finishProgress();
      }, 10_000);
    };

    document.addEventListener("click", startProgressForLink, true);
    return () => document.removeEventListener("click", startProgressForLink, true);
  }, [finishProgress]);

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    if (!navigationStarted.current && !active) return;

    navigationStarted.current = false;
    if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
    routeTimer.current = setTimeout(() => {
      routeTimer.current = null;
      finishProgress();
    }, 180);

    return () => {
      if (routeTimer.current) clearTimeout(routeTimer.current);
    };
  }, [active, finishProgress, pathname]);

  useEffect(
    () => () => {
      if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
      if (routeTimer.current) clearTimeout(routeTimer.current);
      if (finishTimer.current) clearTimeout(finishTimer.current);
    },
    []
  );

  if (!active) return null;

  return (
    <div
      role="progressbar"
      aria-label={t("common.loading", {}, "Loading page")}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-100 h-[2.5px] overflow-hidden transition-opacity duration-300 motion-reduce:hidden",
        fading ? "opacity-0" : "opacity-100",
        className
      )}
    >
      <div
        className="top-progress-line relative h-full w-full"
        style={{
          background: "linear-gradient(90deg, #0284c7 0%, #0ea5e9 50%, #00c8ff 100%)",
          boxShadow: "0 0 10px rgba(0, 200, 255, 0.8), 0 0 4px rgba(2, 132, 199, 0.6)",
          animation: "top-progress-sweep 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        }}
      >
        <span
          className="absolute right-0 top-1/2 -translate-y-1/2 w-16 h-2 bg-radial from-[#00c8ff] via-[#00c8ff]/60 to-transparent blur-[1px] shadow-[0_0_10px_#00c8ff]"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
