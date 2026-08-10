"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={cn("h-9 w-9 rounded-xl border border-border bg-bg-surface/50", className)} />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => {
        const nextTheme = isDark ? "light" : "dark";
        setTheme(nextTheme);
      }}
      aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      className={cn(
        "flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-border bg-bg-surface/50 text-text transition-all duration-200 hover:border-primary/40 hover:bg-bg-surface hover:text-primary active:scale-95",
        className,
      )}
    >
      {isDark ? (
        <Sun className="size-4 text-primary transition-transform duration-300 hover:rotate-12" />
      ) : (
        <Moon className="size-4 text-primary transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  );
}
