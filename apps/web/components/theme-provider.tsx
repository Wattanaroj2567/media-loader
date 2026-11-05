"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";

function BrowserThemeColor() {
  const { resolvedTheme } = useTheme();

  React.useEffect(() => {
    if (!resolvedTheme) return;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", resolvedTheme === "dark" ? "#101010" : "#edf1f6");
  }, [resolvedTheme]);

  return null;
}

function TouchFeedback() {
  React.useEffect(() => {
    const selector =
      'button, a[href], summary, select, input[type="button"], input[type="submit"], input[type="reset"], input[type="checkbox"], input[type="radio"], [role="button"], [role="switch"], [role="tab"], [role="radio"], [role="checkbox"], [role="menuitem"]';
    let pressed: Element | null = null;
    let pointerId: number | null = null;
    let startX = 0;
    let startY = 0;
    const clear = () => {
      pressed?.removeAttribute("data-touch-pressed");
      pressed = null;
      pointerId = null;
    };
    const down = (event: PointerEvent) => {
      if (event.pointerType !== "touch" || !event.isPrimary) return;
      clear();
      const target =
        event.target instanceof Element ? event.target.closest(selector) : null;
      if (!target || target.matches(':disabled, [aria-disabled="true"]')) return;
      pressed = target;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      target.setAttribute("data-touch-pressed", "");
    };
    const move = (event: PointerEvent) => {
      if (
        event.pointerId === pointerId &&
        Math.hypot(event.clientX - startX, event.clientY - startY) > 10
      )
        clear();
    };
    const end = (event: PointerEvent) => {
      if (event.pointerId === pointerId) clear();
    };
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("pointermove", move, true);
    document.addEventListener("pointerup", end, true);
    document.addEventListener("pointercancel", end, true);
    return () => {
      clear();
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("pointermove", move, true);
      document.removeEventListener("pointerup", end, true);
      document.removeEventListener("pointercancel", end, true);
    };
  }, []);
  return null;
}

// Filter out the React 19 script tag warning in development caused by next-themes injecting inline FOUC scripts
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const origError = console.error;
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Encountered a script tag while rendering React component")
    ) {
      return;
    }
    origError.apply(console, args);
  };
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props}>
      <BrowserThemeColor />
      <TouchFeedback />
      {children}
    </NextThemesProvider>
  );
}
