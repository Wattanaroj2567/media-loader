"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  // Prevent hydration mismatch by rendering a placeholder until mounted on client
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="size-11 rounded-lg border border-border bg-bg-surface/30 sm:size-9" />
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
      className="flex size-11 items-center justify-center rounded-lg border border-border bg-bg-surface/30 text-text-muted transition-all duration-200 hover:border-primary/40 hover:bg-bg-surface hover:text-primary active:scale-95 sm:size-9 cursor-pointer"
    >
      {isDark ? (
        <Sun className="size-4.5 transition-transform duration-300 rotate-0 hover:rotate-12" />
      ) : (
        <Moon className="size-4.5 transition-transform duration-300 rotate-0 hover:-rotate-12" />
      )}
    </button>
  );
}
