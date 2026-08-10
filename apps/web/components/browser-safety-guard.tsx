"use client";

import { useEffect } from "react";

/**
 * BrowserSafetyGuard patches browser DOM quirks like releasePointerCapture exception
 * thrown by devtools overlay scripts when releasing pointer capture on uncaptured elements.
 */
export function BrowserSafetyGuard() {
  useEffect(() => {
    if (typeof window === "undefined" || typeof Element === "undefined") return;

    const originalReleasePointerCapture = Element.prototype.releasePointerCapture;
    Element.prototype.releasePointerCapture = function (pointerId: number) {
      try {
        if (this.hasPointerCapture(pointerId)) {
          originalReleasePointerCapture.call(this, pointerId);
        }
      } catch {
        // Silently swallow pointer capture cleanup mismatch in dev overlay scripts
      }
    };
  }, []);

  return null;
}
