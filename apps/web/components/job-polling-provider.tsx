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

interface JobPollingContextValue {
  jobs: Job[];
  loading: boolean;
  error: string;
  refreshJobs: (silent?: boolean) => Promise<void>;
}

const JobPollingContext = createContext<JobPollingContextValue | null>(null);

export function JobPollingProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const mountedRef = useRef(false);
  const unauthorizedRef = useRef(false);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const hasSuccessfulLoadRef = useRef(false);
  const consecutiveFailuresRef = useRef(0);

  const refreshJobs = useCallback((silent = false) => {
    if (
      unauthorizedRef.current ||
      (typeof window !== "undefined" &&
        (!window.navigator.onLine || document.visibilityState === "hidden"))
    ) {
      return Promise.resolve();
    }

    if (inFlightRef.current) return inFlightRef.current;

    const request = (async () => {
      if (!silent && mountedRef.current) setError("");
      try {
        const nextJobs = await apiClient.listJobs({ limit: 100 });
        if (!mountedRef.current) return;
        setJobs(nextJobs);
        hasSuccessfulLoadRef.current = true;
        consecutiveFailuresRef.current = 0;
        setError("");
      } catch (cause) {
        if (!mountedRef.current) return;
        const message =
          cause instanceof Error ? cause.message : "โหลดข้อมูลไม่สำเร็จ";
        if (cause instanceof UnauthorizedError) {
          unauthorizedRef.current = true;
          setError(message);
          return;
        }

        consecutiveFailuresRef.current += 1;
        if (
          !hasSuccessfulLoadRef.current ||
          consecutiveFailuresRef.current >= 2
        ) {
          setError(message);
        }
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    })().finally(() => {
      if (inFlightRef.current === request) inFlightRef.current = null;
    });

    inFlightRef.current = request;
    return request;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void refreshJobs();

    // The worker checks for work every five seconds, so polling faster adds
    // API traffic without making job updates meaningfully quicker.
    const intervalId = window.setInterval(() => void refreshJobs(true), 5000);
    const handleJobsChanged = () => void refreshJobs(true);
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
    () => ({ jobs, loading, error, refreshJobs }),
    [error, jobs, loading, refreshJobs],
  );

  return (
    <JobPollingContext.Provider value={value}>
      {children}
    </JobPollingContext.Provider>
  );
}

export function useJobPolling() {
  const context = useContext(JobPollingContext);
  if (!context) {
    throw new Error("useJobPolling must be used within JobPollingProvider");
  }
  return context;
}
