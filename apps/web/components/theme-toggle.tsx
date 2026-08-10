"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-9 w-9 rounded-xl border border-border bg-bg-surface/50" />
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
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-bg-surface/50 text-text transition-all duration-200 hover:border-primary/40 hover:bg-bg-surface hover:text-primary active:scale-95 cursor-pointer"
    >
      {isDark ? (
        <Sun className="size-4 text-primary transition-transform duration-300 hover:rotate-12" />
      ) : (
        <Moon className="size-4 text-primary transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  );
}
