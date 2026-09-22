"use client";

import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";

interface HeaderUtilityControlsProps {
  className?: string;
  trailing?: ReactNode;
}

export function HeaderUtilityControls({
  className,
  trailing,
}: HeaderUtilityControlsProps) {
  const { locale, setLocale } = useT();
  const toggleLocale = () => setLocale(locale === "th" ? "en" : "th");

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <button
        type="button"
        onClick={toggleLocale}
        className="flex h-8 items-center justify-center rounded-full px-3 text-xs font-semibold text-text-muted transition-colors outline-none hover:bg-bg-elevated hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40"
        title={locale === "th" ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"}
      >
        {locale === "th" ? "EN" : "TH"}
      </button>

      <ThemeToggle
        variant="dropdown"
        showLabel={false}
        tone="ghost"
        className="size-8 focus-visible:ring-2 focus-visible:ring-primary/40"
      />

      {trailing && (
        <>
          <div aria-hidden="true" className="mx-0.5 h-4 w-px bg-border/40" />
          {trailing}
        </>
      )}
    </div>
  );
}
