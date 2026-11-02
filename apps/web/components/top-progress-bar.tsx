"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { useT } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

interface TopProgressBarProps {
  className?: string;
}

export function TopProgressBar({ className }: TopProgressBarProps) {
  const { t } = useT();
  const pathname = usePathname();
  const [active, setActive] = useState(true);
  const [fading, setFading] = useState(false);
  const navigationStarted = useRef(false);
  const previousPathname = useRef(pathname);
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const routeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finishProgress = useCallback(() => {
    if (finishTimer.current) clearTimeout(finishTimer.current);
    setFading(true);
    finishTimer.current = setTimeout(() => {
      setActive(false);
      setFading(false);
      finishTimer.current = null;
    }, 300);
  }, []);

  useEffect(() => {
    const finishInitialLoad = () => {
      if (!navigationStarted.current) finishProgress();
    };

    if (document.readyState === "complete") {
      finishInitialLoad();
      return;
    }

    window.addEventListener("load", finishInitialLoad, { once: true });
    const initialLoadTimer = setTimeout(finishInitialLoad, 10_000);

    return () => {
      window.removeEventListener("load", finishInitialLoad);
      clearTimeout(initialLoadTimer);
    };
  }, [finishProgress]);

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
      aria-valuenow={fading ? 100 : undefined}
      className={cn(
        "top-progress-track pointer-events-none fixed inset-x-0 top-0 z-100 h-[3px] overflow-hidden transition-opacity duration-300 motion-reduce:hidden",
        fading ? "opacity-0" : "opacity-100",
        className
      )}
    >
      <div
        className={cn(
          "top-progress-segment absolute inset-y-0 left-0 rounded-full",
          fading && "top-progress-segment-complete"
        )}
        aria-hidden="true"
      />
    </div>
  );
}
