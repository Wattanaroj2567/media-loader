"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useT } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

interface TopProgressBarProps {
  className?: string;
}

export function TopProgressBar({ className }: TopProgressBarProps) {
  const { t } = useT();
  const [active, setActive] = useState(true);
  const [fading, setFading] = useState(false);
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
    if (document.readyState === "complete") {
      finishProgress();
      return;
    }

    const finishInitialLoad = () => finishProgress();
    window.addEventListener("load", finishInitialLoad, { once: true });
    const initialLoadTimer = setTimeout(finishInitialLoad, 10_000);

    return () => {
      window.removeEventListener("load", finishInitialLoad);
      clearTimeout(initialLoadTimer);
    };
  }, [finishProgress]);

  useEffect(
    () => () => {
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
        "pointer-events-none fixed inset-x-0 top-0 z-100 h-[3px] overflow-hidden transition-opacity duration-300 motion-reduce:hidden",
        fading ? "opacity-0" : "opacity-100",
        className
      )}
    >
      <div
        className={cn(
          "top-progress-line relative h-full rounded-r-full",
          fading && "top-progress-line-complete"
        )}
      >
        <span
          className="top-progress-glow absolute right-0 top-1/2 -translate-y-1/2"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
