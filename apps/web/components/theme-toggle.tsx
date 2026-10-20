"use client";

import { useEffect, useState, useRef } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Laptop, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";

interface ThemeToggleProps {
  className?: string;
  variant?: "segmented" | "dropdown" | "select";
  dropdownAlign?: "top" | "bottom";
  showLabel?: boolean;
  /**
   * Visual weight of the dropdown trigger.
   * "surface" (default) shows its own border/background — use when the
   * toggle stands alone. "ghost" is borderless/transparent by default and
   * only reveals a background on hover — use when nesting the toggle
   * inside another bordered container (e.g. a pill-shaped toolbar) so it
   * doesn't create a mismatched double border/background.
   */
  tone?: "surface" | "ghost";
}

export function ThemeToggle({
  className,
  variant = "segmented",
  dropdownAlign = "bottom",
  showLabel = true,
  tone = "surface",
}: ThemeToggleProps) {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { t } = useT();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (!mounted) {
    if (variant === "segmented") {
      return (
        <div
          className={cn(
            "h-10 w-full animate-pulse rounded-xl border border-border/60 bg-bg-surface/40",
            className
          )}
        />
      );
    }
    return (
      <div
        className={cn(
          "h-8 animate-pulse rounded-full",
          tone === "surface"
            ? "w-13 border border-border/70 bg-bg-surface/40"
            : "size-8",
          className
        )}
      />
    );
  }

  const currentTheme = theme || "system";

  const options = [
    { value: "system", label: t("theme.system", {}, "ตามระบบ"), icon: Laptop },
    { value: "dark", label: t("theme.dark", {}, "มืด"), icon: Moon },
    { value: "light", label: t("theme.light", {}, "สว่าง"), icon: Sun },
  ];

  if (variant === "segmented") {
    return (
      <div
        role="radiogroup"
        aria-label={t("theme.selectLabel", {}, "เลือกธีม")}
        className={cn(
          "flex w-full items-center rounded-xl border border-border/60 bg-bg-base/70 p-1",
          className
        )}
      >
        {options.map((opt) => {
          const Icon = opt.icon;
          const isActive = currentTheme === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setTheme(opt.value)}
              title={`${t("theme.selectLabel", {}, "ธีม")}: ${opt.label}`}
              className={cn(
                "flex h-8 flex-1 min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-1 text-xs font-medium transition-all duration-150 select-none outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                isActive
                  ? "bg-bg-elevated text-primary font-semibold shadow-xs"
                  : "text-text-muted hover:bg-bg-surface/50 hover:text-text"
              )}
            >
              <Icon
                className={cn(
                  "size-3.5 shrink-0 transition-colors",
                  isActive ? "text-primary" : "text-text-muted"
                )}
              />
              <span className="truncate text-[11px] sm:text-xs font-medium">
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === "dropdown") {
    const activeOption = options.find((o) => o.value === currentTheme) || options[0];
    const ActiveIcon = activeOption.icon;

    return (
      <div className="relative inline-block text-left" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-label={`${t("theme.selectLabel", {}, "เลือกธีม")}: ${activeOption.label}`}
          title={`${t("theme.selectLabel", {}, "เลือกธีม")}: ${activeOption.label}`}
          className={cn(
            "group flex h-8 cursor-pointer items-center justify-center rounded-full border px-2.5 text-xs font-semibold transition-all duration-200 outline-none select-none",
            tone === "ghost"
              ? "border-transparent bg-transparent text-text-muted hover:bg-bg-elevated hover:text-primary"
              : cn(
                  "border-border/70 bg-bg-surface/50 text-text-muted backdrop-blur-sm shadow-2xs",
                  "dark:border-white/12 dark:bg-white/6",
                  "hover:border-border hover:bg-bg-surface hover:text-text",
                  "dark:hover:border-white/20 dark:hover:bg-white/10 dark:hover:text-text"
                ),
            "focus-visible:ring-2 focus-visible:ring-primary/40",
            isOpen &&
              "border-primary/50 bg-primary/5 text-primary ring-2 ring-primary/20 dark:border-primary/50 dark:bg-primary/10 dark:text-primary",
            showLabel ? "gap-1.5" : "gap-1.5",
            className
          )}
        >
          <ActiveIcon
            className={cn(
              "size-3.5 shrink-0 transition-colors",
              isOpen ? "text-primary" : "text-text-muted group-hover:text-text"
            )}
          />
          {showLabel && (
            <span className="text-xs truncate text-text">{activeOption.label}</span>
          )}
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
            className={cn(
              "absolute z-50 min-w-36 overflow-hidden rounded-2xl border border-border/80 bg-popover/95 p-1.5 backdrop-blur-xl shadow-xl animate-in fade-in-50 zoom-in-95 duration-150",
              dropdownAlign === "top"
                ? "bottom-full mb-2 left-0"
                : "top-full mt-2 right-0"
            )}
          >
            {options.map((opt) => {
              const Icon = opt.icon;
              const isSelected = currentTheme === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setTheme(opt.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-colors outline-none",
                    isSelected
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-text-muted hover:bg-bg-surface hover:text-text"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="size-3.5 shrink-0" />
                    <span>{opt.label}</span>
                  </span>
                  {isSelected && (
                    <Check
                      className="size-3.5 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("relative flex items-center", className)}>
      <div className="pointer-events-none absolute left-2.5 z-10 flex items-center text-primary">
        {currentTheme === "light" && <Sun className="size-3.5" />}
        {currentTheme === "dark" && <Moon className="size-3.5" />}
        {currentTheme === "system" && <Laptop className="size-3.5" />}
      </div>

      <select
        value={currentTheme}
        onChange={(e) => setTheme(e.target.value)}
        aria-label={t("theme.selectLabel", {}, "เลือกธีม")}
        title={t("theme.selectLabel", {}, "เลือกธีม")}
        className="h-9 w-full cursor-pointer rounded-xl border border-border bg-bg-surface/50 pl-7.5 pr-6 text-xs font-semibold text-text transition-all duration-200 hover:border-primary/40 hover:bg-bg-surface hover:text-primary outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 appearance-none"
      >
        {options.map((opt) => (
          <option
            key={opt.value}
            value={opt.value}
            className="bg-bg-surface text-text font-sans"
          >
            {opt.label}
          </option>
        ))}
      </select>

      <div className="pointer-events-none absolute right-2 z-10 flex items-center text-text-dim">
        <ChevronDown className="size-3" />
      </div>
    </div>
  );
}
