"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Laptop, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";

export function ThemeToggle({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const { t } = useT();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={cn("h-9 w-28 rounded-xl border border-border bg-bg-surface/50 opacity-60", className)} />
    );
  }

  const currentTheme = theme || "system";

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
        className="h-9 cursor-pointer rounded-xl border border-border bg-bg-surface/50 pl-7.5 pr-6 text-xs font-semibold text-text transition-all duration-200 hover:border-primary/40 hover:bg-bg-surface hover:text-primary outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 appearance-none"
      >
        <option value="system" className="bg-bg-surface text-text font-sans">
          {t("theme.system", {}, "ตามระบบ")}
        </option>
        <option value="dark" className="bg-bg-surface text-text font-sans">
          {t("theme.dark", {}, "มืด")}
        </option>
        <option value="light" className="bg-bg-surface text-text font-sans">
          {t("theme.light", {}, "สว่าง")}
        </option>
      </select>

      <div className="pointer-events-none absolute right-2 z-10 flex items-center text-text-dim">
        <ChevronDown className="size-3" />
      </div>
    </div>
  );
}
