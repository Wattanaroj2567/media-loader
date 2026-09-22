import type { Job } from "@/lib/api-client";

function jobUpdatedAt(job: Job) {
  const timestamp = Date.parse(job.updated_at);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function queueDisplayStatus(
  status: string,
  progress?: number | null,
  locallyResuming = false
) {
  if (status === "QUEUED" && (locallyResuming || (progress ?? 0) > 0)) {
    return "RESUMING";
  }
  return status;
}

export function mergePolledJobs(current: Job[], incoming: Job[]) {
  const currentById = new Map(current.map((job) => [job.id, job]));

  return incoming.map((incomingJob) => {
    const existing = currentById.get(incomingJob.id);
    if (!existing) return incomingJob;

    const incomingTime = jobUpdatedAt(incomingJob);
    const existingTime = jobUpdatedAt(existing);
    if (incomingTime <= existingTime) return existing;
    return incomingJob;
  });
}
