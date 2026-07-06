"use client";

import { JobList } from "@/components/job-list";

export function ActivityFeed() {
  return <JobList mode="queue" />;
}
