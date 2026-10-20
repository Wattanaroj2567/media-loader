"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, Globe, Laptop, MoreHorizontal } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/config";

interface HeaderUtilityControlsProps {
  className?: string;
  trailing?: ReactNode;
}

const languages: readonly {
  code: Locale;
  labelKey: string;
  fallbackLabel: string;
  flag: string;
}[] = [
  { code: "th", labelKey: "lang.th", fallbackLabel: "ไทย", flag: "TH" },
  { code: "en", labelKey: "lang.en", fallbackLabel: "English", flag: "EN" },
];

export function HeaderUtilityControls({
  className,
  trailing,
}: HeaderUtilityControlsProps) {
  const { locale, setLocale, t } = useT();
  const [isOpen, setIsOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen && !isMoreOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsOpen(false);
      }
      if (moreRef.current && !moreRef.current.contains(target)) {
        setIsMoreOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        setIsMoreOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isMoreOpen]);

  const currentLanguage =
    languages.find((lang) => lang.code === locale) ?? languages[0];

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {/* ── Desktop: Side-by-side Select Capsules (sm: and up) ── */}
      <div className="hidden sm:flex items-center gap-1.5">
        {/* Language Switcher Select Dropdown */}
        <div className="relative inline-block text-left" ref={dropdownRef}>
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            onClick={() => setIsOpen((prev) => !prev)}
            className={cn(
              "group flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold transition-all duration-200 outline-none select-none",
              "border-border/70 bg-bg-surface/50 text-text-muted backdrop-blur-sm shadow-2xs",
              "dark:border-white/12 dark:bg-white/6",
              "hover:border-border hover:bg-bg-surface hover:text-text",
              "dark:hover:border-white/20 dark:hover:bg-white/10 dark:hover:text-text",
              "focus-visible:ring-2 focus-visible:ring-primary/40",
              isOpen &&
                "border-primary/50 bg-primary/5 text-primary ring-2 ring-primary/20 dark:border-primary/50 dark:bg-primary/10 dark:text-primary"
            )}
            title={locale === "th" ? "เลือกภาษา" : "Select language"}
            aria-label={
              locale === "th"
                ? `เลือกภาษา (ปัจจุบัน: ${currentLanguage.fallbackLabel})`
                : `Select language (Current: ${currentLanguage.fallbackLabel})`
            }
          >
            <Globe
              className={cn(
                "size-3.5 shrink-0 transition-colors",
                isOpen ? "text-primary" : "text-text-muted group-hover:text-text"
              )}
              aria-hidden="true"
            />
            <span className="tracking-wide uppercase font-semibold text-[11px] sm:text-xs">
              {currentLanguage.flag}
            </span>
            <ChevronDown
              className={cn(
                "size-3 shrink-0 transition-transform duration-200",
                isOpen
                  ? "rotate-180 text-primary"
                  : "text-text-dim group-hover:text-text-muted"
              )}
              aria-hidden="true"
            />
          </button>

          {isOpen && (
            <div
              role="listbox"
              aria-label={locale === "th" ? "ภาษา" : "Language"}
              className="absolute right-0 top-full mt-2 z-50 min-w-36 overflow-hidden rounded-2xl border border-border/80 bg-popover/95 p-1.5 backdrop-blur-xl shadow-xl animate-in fade-in-50 zoom-in-95 duration-150"
            >
              {languages.map((lang) => {
                const isSelected = locale === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      setLocale(lang.code);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-colors cursor-pointer outline-none",
                      isSelected
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-text-muted hover:bg-bg-surface hover:text-text"
                    )}
                  >
                    <span>{t(lang.labelKey, {}, lang.fallbackLabel)}</span>
                    {isSelected && (
                      <Check
                        className="size-3.5 text-primary shrink-0"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Theme Select Dropdown */}
        <ThemeToggle
          variant="dropdown"
          showLabel={false}
          tone="surface"
          className="focus-visible:ring-2 focus-visible:ring-primary/40"
        />
      </div>

      {/* ── Mobile: 3-Dots Responsive Overflow Menu (< sm) ── */}
      <div className="relative inline-block text-left sm:hidden" ref={moreRef}>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={isMoreOpen}
          onClick={() => setIsMoreOpen((prev) => !prev)}
          className={cn(
            "flex size-8 cursor-pointer items-center justify-center rounded-full border text-text-muted transition-all duration-200 outline-none select-none",
            "border-border/70 bg-bg-surface/50 backdrop-blur-sm shadow-2xs",
            "dark:border-white/12 dark:bg-white/6",
            "hover:border-border hover:bg-bg-surface hover:text-text",
            "dark:hover:border-white/20 dark:hover:bg-white/10 dark:hover:text-text",
            "focus-visible:ring-2 focus-visible:ring-primary/40",
            isMoreOpen &&
              "border-primary/50 bg-primary/5 text-primary ring-2 ring-primary/20 dark:border-primary/50 dark:bg-primary/10 dark:text-primary"
          )}
          title={locale === "th" ? "ตัวเลือกเพิ่มเติม" : "More options"}
          aria-label={
            locale === "th"
              ? "ตัวเลือกเพิ่มเติม (ภาษาและธีม)"
              : "More options (Language & Theme)"
          }
        >
          <MoreHorizontal className="size-4 shrink-0" aria-hidden="true" />
        </button>

        {isMoreOpen && (
          <div
            role="dialog"
            aria-label={
              locale === "th" ? "การตั้งค่าเพิ่มเติม" : "Additional preferences"
            }
            className="absolute right-0 top-full mt-2 z-50 w-[272px] overflow-hidden rounded-2xl border border-border/80 bg-popover/95 p-2.5 backdrop-blur-xl shadow-xl animate-in fade-in-50 zoom-in-95 duration-150"
          >
            {/* Language Selection */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-text-dim">
                <Globe className="size-3 text-text-muted" aria-hidden="true" />
                <span>{locale === "th" ? "ภาษา" : "Language"}</span>
              </div>
              <div
                role="tablist"
                aria-label={locale === "th" ? "เลือกภาษา" : "Select language"}
                className="flex w-full items-center rounded-xl border border-border/60 bg-bg-base/70 p-1"
              >
                {languages.map((lang) => {
                  const isSelected = locale === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      onClick={() => {
                        setLocale(lang.code);
                      }}
                      className={cn(
                        "flex h-8 flex-1 items-center justify-center rounded-lg text-xs font-medium transition-all duration-150 select-none cursor-pointer outline-none",
                        isSelected
                          ? "bg-bg-elevated text-primary font-semibold shadow-xs"
                          : "text-text-muted hover:bg-bg-surface/50 hover:text-text"
                      )}
                    >
                      {t(lang.labelKey, {}, lang.fallbackLabel)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Theme Selection */}
            <div className="mt-2.5 pt-2.5 border-t border-border/50 space-y-1.5">
              <div className="flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-text-dim">
                <Laptop className="size-3 text-text-muted" aria-hidden="true" />
                <span>{locale === "th" ? "ธีม" : "Theme"}</span>
              </div>
              <ThemeToggle variant="segmented" className="w-full" />
            </div>
          </div>
        )}
      </div>

      {trailing && (
        <>
          <div aria-hidden="true" className="mx-0.5 h-4 w-px bg-border/40" />
          {trailing}
        </>
      )}
    </div>
  );
}
