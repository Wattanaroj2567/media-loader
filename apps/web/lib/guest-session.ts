const GUEST_SESSION_KEY = "media_loader_guest_session_id";
const GUEST_JOBS_KEY = "media_loader_guest_job_ids";

let memoryFallbackSessionId = "";
let memoryFallbackJobs: string[] = [];

/**
 * Retrieves the persistent guest session ID from localStorage or creates a new one.
 * Falls back to in-memory ID during server-side rendering and testing.
 */
export function getGuestSessionId(): string {
  if (typeof window === "undefined") {
    if (!memoryFallbackSessionId) {
      memoryFallbackSessionId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `guest_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    }
    return memoryFallbackSessionId;
  }
  try {
    let sessionId = localStorage.getItem(GUEST_SESSION_KEY);
    if (!sessionId) {
      sessionId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `guest_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      localStorage.setItem(GUEST_SESSION_KEY, sessionId);
    }
    return sessionId;
  } catch {
    return "";
  }
}

/**
 * Clears the stored guest session ID.
 */
export function clearGuestSessionId(): void {
  memoryFallbackSessionId = "";
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(GUEST_SESSION_KEY);
  } catch {
    // Ignore storage access errors
  }
}

/**
 * Retrieves array of recent job IDs created in guest mode on this device.
 */
export function getGuestJobIds(): string[] {
  if (typeof window === "undefined") return memoryFallbackJobs;
  try {
    const raw = localStorage.getItem(GUEST_JOBS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Records a new job ID into the guest session storage.
 */
export function addGuestJobId(jobId: string): void {
  if (!jobId) return;
  if (typeof window === "undefined") {
    if (!memoryFallbackJobs.includes(jobId)) {
      memoryFallbackJobs = [jobId, ...memoryFallbackJobs].slice(0, 30);
    }
    return;
  }
  try {
    const current = getGuestJobIds();
    if (!current.includes(jobId)) {
      const next = [jobId, ...current].slice(0, 30);
      localStorage.setItem(GUEST_JOBS_KEY, JSON.stringify(next));
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Removes a job ID from the guest session storage (e.g. after deletion).
 */
export function removeGuestJobId(jobId: string): void {
  if (!jobId) return;
  if (typeof window === "undefined") {
    memoryFallbackJobs = memoryFallbackJobs.filter((id) => id !== jobId);
    return;
  }
  try {
    const current = getGuestJobIds();
    const next = current.filter((id) => id !== jobId);
    localStorage.setItem(GUEST_JOBS_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage errors
  }
}
