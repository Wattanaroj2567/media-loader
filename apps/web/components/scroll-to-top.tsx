"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

export function ScrollToTop({ mobileOnly = false }: { mobileOnly?: boolean }) {
  const [visible, setVisible] = useState(false);
  const { t } = useT();

  useEffect(() => {
    const update = () => setVisible(window.scrollY > 320);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-20 z-40 px-4 sm:bottom-24 sm:px-6 lg:px-8",
        mobileOnly && "lg:hidden"
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl justify-end">
        <button
          type="button"
          aria-label={t("landing.scrollToTop")}
          className="pointer-events-auto grid size-11 place-items-center rounded-full border border-border bg-bg-surface/95 text-text shadow-lg backdrop-blur-xl transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                ? "auto"
                : "smooth",
            })
          }
        >
          <ArrowUp className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
