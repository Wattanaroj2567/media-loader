"use client";

import { useSyncExternalStore } from "react";

export const FULL_PAGE_AUTH_MEDIA_QUERY =
  "(max-width: 639px), (max-width: 950px) and (max-height: 480px)";

function subscribe(listener: () => void) {
  const media = window.matchMedia(FULL_PAGE_AUTH_MEDIA_QUERY);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

function getSnapshot() {
  return window.matchMedia(FULL_PAGE_AUTH_MEDIA_QUERY).matches;
}

function getServerSnapshot() {
  return true;
}

export function useFullPageAuth() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
