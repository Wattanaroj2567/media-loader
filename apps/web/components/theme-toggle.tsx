"use client";

import { useEffect, useState, useRef } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Laptop, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";

export interface ThemeToggleProps {
  className?: string;
  variant?: "segmented" | "dropdown" | "select";
  dropdownAlign?: "top" | "bottom";
  showLabel?: boolean;
}

export function ThemeToggle({
  className,
  variant = "segmented",
  dropdownAlign = "bottom",
  showLabel = true,
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
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  if (!mounted) {
    if (variant === "segmented") {
      return (
        <div className={cn("h-10 w-full animate-pulse rounded-xl border border-border/60 bg-bg-surface/40", className)} />
      );
    }
    return (
      <div className={cn("h-9 w-full animate-pulse rounded-xl border border-border/60 bg-bg-surface/40", className)} />
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
          "grid grid-cols-3 gap-1 rounded-xl border border-border/80 bg-bg-base/60 p-1 backdrop-blur-md shadow-inner",
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
                "flex h-8 min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-1 text-xs font-medium transition-all duration-200 select-none outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                isActive
                  ? "border border-primary/30 bg-bg-elevated text-primary font-semibold shadow-xs"
                  : "border border-transparent text-text-muted hover:bg-bg-surface/70 hover:text-text"
              )}
            >
              <Icon className={cn("size-3.5 shrink-0 transition-transform duration-200", isActive && "scale-110 text-primary")} />
              <span className="truncate text-[11px] font-medium">{opt.label}</span>
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
      <div className={cn("relative inline-block text-left w-full", className)} ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-haspopup="true"
          title={`${t("theme.selectLabel", {}, "เลือกธีม")}: ${activeOption.label}`}
          className="flex h-9 w-full cursor-pointer items-center justify-center gap-1 rounded-xl border border-border/80 bg-bg-surface/50 px-2 text-xs font-semibold text-text transition-all duration-200 hover:border-primary/40 hover:bg-primary/10 hover:text-primary outline-none"
        >
          <ActiveIcon className="size-4 shrink-0 text-primary" />
          {showLabel && <span className="text-xs truncate">{activeOption.label}</span>}
          <ChevronDown className={cn("size-3 text-text-dim transition-transform duration-200", isOpen && "rotate-180")} />
        </button>

        {isOpen && (
          <div
            className={cn(
              "absolute z-50 w-40 overflow-hidden rounded-2xl border border-border/80 bg-popover/95 p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in-50 zoom-in-95 duration-150",
              dropdownAlign === "top" ? "bottom-full mb-2 left-0" : "top-full mt-1.5 right-0"
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
                    "flex w-full cursor-pointer items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium transition-colors",
                    isSelected
                      ? "bg-primary/14 text-primary font-semibold"
                      : "text-text-muted hover:bg-bg-surface/80 hover:text-text"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="size-3.5 shrink-0" />
                    <span>{opt.label}</span>
                  </span>
                  {isSelected && <Check className="size-3.5 shrink-0 text-primary" />}
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
          <option key={opt.value} value={opt.value} className="bg-bg-surface text-text font-sans">
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

