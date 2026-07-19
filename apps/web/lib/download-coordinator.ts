import type { FileDestination } from "./api-client";

interface PendingDownload {
  destination: FileDestination | null;
  filename: string;
}

const pendingDownloads = new Map<string, PendingDownload>();
const deliveriesInProgress = new Set<string>();

export function registerPendingDownload(
  jobId: string,
  filename: string,
  destination: FileDestination | null,
) {
  pendingDownloads.set(jobId, { destination, filename });
}

export function getPendingDownload(jobId: string) {
  return pendingDownloads.get(jobId) ?? null;
}

export function beginDownloadDelivery(jobId: string) {
  if (!pendingDownloads.has(jobId) || deliveriesInProgress.has(jobId)) {
    return false;
  }
  deliveriesInProgress.add(jobId);
  return true;
}

export function finishDownloadDelivery(jobId: string, delivered: boolean) {
  deliveriesInProgress.delete(jobId);
  if (delivered) pendingDownloads.delete(jobId);
}

export function forgetPendingDownload(jobId: string) {
  deliveriesInProgress.delete(jobId);
  pendingDownloads.delete(jobId);
}
