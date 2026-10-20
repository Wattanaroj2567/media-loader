const PREF_KEY = "media-loader:browser-notifications";
const OWNER_KEY = "media-loader:browser-notifications-owner";
let fallbackPreference: { enabled: boolean; userId: string } | null = null;

export type BrowserNotificationPermission =
  NotificationPermission | "unsupported" | "install-required";

function isAppleMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isStandaloneApp(): boolean {
  if (typeof window === "undefined") return false;
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    navigatorWithStandalone.standalone === true
  );
}

export function getNotificationPermission(): BrowserNotificationPermission {
  if (typeof window === "undefined") return "unsupported";
  if (isAppleMobileDevice() && !isStandaloneApp()) return "install-required";
  if (
    !("Notification" in window) ||
    !("PushManager" in window) ||
    !("serviceWorker" in navigator)
  ) {
    return "unsupported";
  }
  return Notification.permission;
}

/** True when this account opted in on the current browser profile. */
export function hasBrowserNotificationsPreference(userId: string): boolean {
  try {
    return (
      window.localStorage.getItem(PREF_KEY) === "1" &&
      window.localStorage.getItem(OWNER_KEY) === userId
    );
  } catch {
    return fallbackPreference?.enabled === true && fallbackPreference.userId === userId;
  }
}

/** True when this account opted in and the browser still grants permission. */
export function areBrowserNotificationsEnabled(userId: string): boolean {
  return (
    getNotificationPermission() === "granted" &&
    hasBrowserNotificationsPreference(userId)
  );
}

export function setBrowserNotificationsPreference(
  enabled: boolean,
  userId: string
): void {
  fallbackPreference = { enabled, userId };
  try {
    window.localStorage.setItem(PREF_KEY, enabled ? "1" : "0");
    if (enabled) {
      window.localStorage.setItem(OWNER_KEY, userId);
    } else if (window.localStorage.getItem(OWNER_KEY) === userId) {
      window.localStorage.removeItem(OWNER_KEY);
    }
  } catch {
    // Keep the preference in memory when browser storage is unavailable.
  }
}

/** Must be called from a user gesture (e.g. a button click). */
export async function requestBrowserNotifications(): Promise<BrowserNotificationPermission> {
  const availability = getNotificationPermission();
  if (availability === "unsupported" || availability === "install-required") {
    return availability;
  }
  if (typeof Notification.requestPermission !== "function") return "unsupported";
  return Notification.requestPermission();
}

export async function registerBrowserPushSubscription(
  publicKey: string
): Promise<PushSubscription> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    throw new Error("Service workers are unavailable");
  }

  const registration = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
  });
  const normalized = publicKey.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const applicationServerKey = Uint8Array.from(atob(padded), (character) =>
    character.charCodeAt(0)
  );
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    const existingKey = existing.options.applicationServerKey;
    if (
      existingKey &&
      new Uint8Array(existingKey).length === applicationServerKey.length &&
      new Uint8Array(existingKey).every(
        (byte, index) => byte === applicationServerKey[index]
      )
    ) {
      return existing;
    }
    await existing.unsubscribe();
  }

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  });
}

export async function getBrowserPushSubscription(): Promise<PushSubscription | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  const registration = await navigator.serviceWorker.getRegistration("/");
  return registration?.pushManager.getSubscription() ?? null;
}
