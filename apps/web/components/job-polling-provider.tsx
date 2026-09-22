"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { apiClient, type Job, UnauthorizedError } from "@/lib/api-client";
import { isActiveStatus } from "@/lib/media-presenters";
import { mergePolledJobs } from "@/lib/job-sync";

import { getGuestJobIds } from "@/lib/guest-session";

interface JobPollingContextValue {
  jobs: Job[];
  loading: boolean;
  error: string;
  refreshJobs: (silent?: boolean) => Promise<void>;
  updateJob: (job: Job) => void;
}

const JobPollingContext = createContext<JobPollingContextValue | null>(null);

export function JobPollingProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const mountedRef = useRef(false);
  const unauthorizedRef = useRef(false);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const pendingRefreshRef = useRef(false);
  const refreshJobsRef = useRef<(silent?: boolean) => Promise<void>>(() =>
    Promise.resolve()
  );
  const hasSuccessfulLoadRef = useRef(false);
  const consecutiveFailuresRef = useRef(0);
  const idleSuccessStreakRef = useRef(0);
  const hasActiveJobsRef = useRef(false);
  const lastPollAtRef = useRef(0);

  const refreshJobs = useCallback((silent = false) => {
    if (
      typeof window !== "undefined" &&
      (!window.navigator.onLine || document.visibilityState === "hidden")
    ) {
      return Promise.resolve();
    }

    if (inFlightRef.current) {
      pendingRefreshRef.current = true;
      return inFlightRef.current;
    }

    const request = (async () => {
      if (!silent && mountedRef.current) setError("");

      if (unauthorizedRef.current) {
        const guestJobIds = getGuestJobIds();
        if (guestJobIds.length > 0) {
          try {
            const fetched = await Promise.all(
              guestJobIds.map((id) => apiClient.getJob(id).catch(() => null))
            );
            if (!mountedRef.current) return;
            const validJobs = fetched.filter(Boolean) as Job[];
            setJobs((prev) => {
              const merged = mergePolledJobs(prev, validJobs);
              const map = new Map<string, Job>();
              for (const j of merged) map.set(j.id, j);
              // Preserve active optimistic jobs that might still be processing
              for (const j of prev) {
                if (!map.has(j.id) && guestJobIds.includes(j.id)) {
                  map.set(j.id, j);
                }
              }
              return Array.from(map.values());
            });
            setError("");
          } catch {
            // Ignore guest polling errors
          }
        } else {
          setJobs([]);
        }
        if (mountedRef.current) setLoading(false);
        return;
      }

      try {
        const nextJobs = await apiClient.listJobs({ limit: 100 });
        if (!mountedRef.current) return;
        setJobs((current) => mergePolledJobs(current, nextJobs));
        hasSuccessfulLoadRef.current = true;
        consecutiveFailuresRef.current = 0;
        idleSuccessStreakRef.current = nextJobs.some((job) =>
          isActiveStatus(job.status)
        )
          ? 0
          : idleSuccessStreakRef.current + 1;
        setError("");
      } catch (cause) {
        if (!mountedRef.current) return;
        if (cause instanceof UnauthorizedError) {
          unauthorizedRef.current = true;
          const guestJobIds = getGuestJobIds();
          if (guestJobIds.length > 0) {
            try {
              const fetched = await Promise.all(
                guestJobIds.map((id) => apiClient.getJob(id).catch(() => null))
              );
              if (!mountedRef.current) return;
              const validJobs = fetched.filter(Boolean) as Job[];
              setJobs((prev) => {
                const merged = mergePolledJobs(prev, validJobs);
                const map = new Map<string, Job>();
                for (const j of merged) map.set(j.id, j);
                for (const j of prev) {
                  if (!map.has(j.id) && guestJobIds.includes(j.id)) {
                    map.set(j.id, j);
                  }
                }
                return Array.from(map.values());
              });
            } catch {
              // Ignore
            }
          } else {
            setJobs([]);
          }
          setError("");
          return;
        }

        const message = cause instanceof Error ? cause.message : "โหลดข้อมูลไม่สำเร็จ";
        consecutiveFailuresRef.current += 1;
        idleSuccessStreakRef.current = 0;
        if (!hasSuccessfulLoadRef.current || consecutiveFailuresRef.current >= 2) {
          setError(message);
        }
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    })().finally(() => {
      if (inFlightRef.current === request) inFlightRef.current = null;
      if (pendingRefreshRef.current && mountedRef.current) {
        pendingRefreshRef.current = false;
        void refreshJobsRef.current(true);
      }
    });

    inFlightRef.current = request;
    return request;
  }, []);

  const updateJob = useCallback((updatedJob: Job) => {
    setJobs((current) => {
      const index = current.findIndex((job) => job.id === updatedJob.id);
      if (index === -1) return [updatedJob, ...current];
      return current.map((job) => (job.id === updatedJob.id ? updatedJob : job));
    });
  }, []);

  // Derived activity for the polling tick (effect, never during render).
  useEffect(() => {
    hasActiveJobsRef.current = jobs.some((job) => isActiveStatus(job.status));
  }, [jobs]);

  useEffect(() => {
    refreshJobsRef.current = refreshJobs;
  });

  useEffect(() => {
    mountedRef.current = true;
    lastPollAtRef.current = Date.now();
    void refreshJobs();

    // Adaptive polling: stay fast (5s) while jobs are active, while the
    // first load is still pending, while recovering from a failure so
    // errors clear quickly, or until two consecutive polls confirm the
    // queue is idle. When idle and healthy, one poll per 30s is enough —
    // every tab shares the API rate-limit budget, and queue changes made
    // locally already trigger an immediate refresh event.
    const intervalId = window.setInterval(() => {
      const fast =
        hasActiveJobsRef.current ||
        !hasSuccessfulLoadRef.current ||
        consecutiveFailuresRef.current > 0 ||
        idleSuccessStreakRef.current < 2;
      if (!fast && Date.now() - lastPollAtRef.current < 30000) return;
      lastPollAtRef.current = Date.now();
      void refreshJobs(true);
    }, 5000);
    const handleJobsChanged = (e: Event) => {
      const customEvent = e as CustomEvent<{ job?: Job }>;
      if (customEvent.detail?.job) {
        const optimistic = customEvent.detail.job;
        setJobs((current) => {
          if (current.some((j) => j.id === optimistic.id)) return current;
          return [optimistic, ...current];
        });
      }
      void refreshJobs(true);
    };
    const handleOnline = () => void refreshJobs();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void refreshJobs(true);
    };
    window.addEventListener("media-loader:jobs-changed", handleJobsChanged);
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mountedRef.current = false;
      window.clearInterval(intervalId);
      window.removeEventListener("media-loader:jobs-changed", handleJobsChanged);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshJobs]);

  const value = useMemo(
    () => ({ jobs, loading, error, refreshJobs, updateJob }),
    [error, jobs, loading, refreshJobs, updateJob]
  );

  return (
    <JobPollingContext.Provider value={value}>{children}</JobPollingContext.Provider>
  );
}

export function useJobPolling() {
  const context = useContext(JobPollingContext);
  if (!context) {
    throw new Error("useJobPolling must be used within JobPollingProvider");
  }
  return context;
}
