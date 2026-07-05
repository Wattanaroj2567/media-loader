"use client";

import { Loader2, CheckCircle2, ShieldAlert, Clock, Layers } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

type JobStatus =
  | "COMPLETED"
  | "DOWNLOADING"
  | "BLOCKED"
  | "PENDING"
  | "QUEUED";

type Job = {
  id: string;
  title: string;
  platform: string;
  format: string;
  status: JobStatus;
  createdAt: string;
};

const MOCK_JOBS: Job[] = [
  {
    id: "j1",
    title: "Public Domain Film Sample",
    platform: "Internet Archive",
    format: "1080p MP4 (Direct)",
    status: "COMPLETED",
    createdAt: "3 min ago",
  },
  {
    id: "j2",
    title: "Creative Commons Audio",
    platform: "Wikimedia Commons",
    format: "Audio MP3 (Target)",
    status: "DOWNLOADING",
    createdAt: "6 min ago",
  },
  {
    id: "j3",
    title: "Restricted Protected Media",
    platform: "DRM Protected Origin",
    format: "Unknown Source",
    status: "BLOCKED",
    createdAt: "14 min ago",
  },
  {
    id: "j4",
    title: "Localhost Loopback URL",
    platform: "Local Dev Target",
    format: "Forbidden Port",
    status: "BLOCKED",
    createdAt: "22 min ago",
  },
];

const statusConfig: Record<
  JobStatus,
  { label: string; icon: React.ReactNode; badgeClass: string }
> = {
  COMPLETED: {
    label: "Completed",
    icon: <CheckCircle2 className="h-3 w-3" />,
    badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  DOWNLOADING: {
    label: "Processing",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
    badgeClass: "bg-primary/10 text-primary border-primary/20",
  },
  BLOCKED: {
    label: "Blocked by Policy",
    icon: <ShieldAlert className="h-3 w-3" />,
    badgeClass: "bg-destructive/10 text-destructive border-destructive/20",
  },
  PENDING: {
    label: "Pending",
    icon: <Clock className="h-3 w-3" />,
    badgeClass: "bg-muted/15 text-muted-foreground border-border/30",
  },
  QUEUED: {
    label: "Queued",
    icon: <Layers className="h-3 w-3" />,
    badgeClass: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  },
};

export function JobList({ loading = false }: { loading?: boolean }) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2.5">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg bg-card/50" />
        ))}
      </div>
    );
  }

  if (MOCK_JOBS.length === 0) {
    return (
      <div className="text-center py-8 rounded-lg border border-border/40 bg-card/20">
        <p className="text-xs text-muted-foreground">
          No queue history matches this local session.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {MOCK_JOBS.map((job) => {
        const { label, icon, badgeClass } = statusConfig[job.status];
        return (
          <div
            key={job.id}
            className="flex items-center justify-between rounded-lg border border-border/55 bg-card/75 p-3.5 hover:border-primary/15 transition-all duration-200"
          >
            {/* Metadata Detail */}
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate text-xs font-semibold text-foreground tracking-tight">
                {job.title}
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/80 font-mono">
                <span>{job.platform}</span>
                <span>·</span>
                <span>{job.format}</span>
                <span>·</span>
                <span>{job.createdAt}</span>
              </div>
            </div>

            {/* Status Pill Badge */}
            <Badge variant="outline" className={`flex items-center gap-1 text-[10px] px-2 py-0.5 font-normal shrink-0 ${badgeClass}`}>
              {icon}
              <span>{label}</span>
            </Badge>
          </div>
        );
      })}
    </div>
  );
}
