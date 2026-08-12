import { getDownloadFilename, type MediaFormat } from "./media-presenters.ts";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || "http://localhost:8000";

export interface Job {
  id: string;
  original_url: string;
  status: string;
  progress: number;
  selected_format: string;
  selected_quality?: string | null;
  output_format: "mp4" | "mp3";
  media_type?: "video" | "audio";
  title?: string | null;
  uploader?: string | null;
  platform?: string | null;
  source_domain?: string | null;
  thumbnail_url?: string | null;
  duration_seconds?: number | null;
  output_filename?: string | null;
  file_available?: boolean;
  file_size_mb?: number | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  download_speed?: number | null;
}

export interface PolicyResult {
  decision: "allowed" | "blocked" | "needs_confirmation";
  reason: string;
}

export interface MediaMetadata {
  title: string;
  platform: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  uploader: string | null;
  source_domain: string | null;
  view_count: number | null;
  like_count: number | null;
}

export interface MediaAnalysis {
  policy: PolicyResult;
  media: MediaMetadata;
  formats: MediaFormat[];
}

export interface CreateJobInput {
  url: string;
  selected_format_id: string;
  output_format: "mp4" | "mp3";
  rights_confirmed: boolean;
}

interface ApiEnvelope<T> {
  ok: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
}

type TokenProvider = () => Promise<string | null>;
type Fetcher = typeof fetch;

export interface FileDestination {
  createWritable: () => Promise<WritableStream<Uint8Array>>;
}

async function currentAccessToken(): Promise<string | null> {
  const { createClient } = await import("./supabase/client");
  const {
    data: { session },
  } = await createClient().auth.getSession();
  return session?.access_token || null;
}

/**
 * Whether the browser supports the Web Share API with files.
 * Supported on iOS Safari 15+, Android Chrome 89+, and most mobile browsers.
 */
export function canShareFiles(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function"
  );
}

/** Rough mobile detection (Web Share API is most useful on phones/tablets). */
export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
}

/** Trigger a browser download from an in-memory blob (saves to Downloads / Files). */
function triggerBlobDownload(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoke after a delay so Safari/Firefox have time to start reading the blob.
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

/** Infer a proper MIME type from the filename (the API serves octet-stream). */
function mimeFromFilename(filename: string): string | null {
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  const mimeByExtension: Record<string, string> = {
    mp4: "video/mp4",
    webm: "video/webm",
    mkv: "video/x-matroska",
    mov: "video/quicktime",
    m4v: "video/x-m4v",
    mp3: "audio/mpeg",
    m4a: "audio/mp4",
    aac: "audio/aac",
    wav: "audio/wav",
    ogg: "audio/ogg",
    flac: "audio/flac",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
  };
  return mimeByExtension[extension] ?? null;
}

function apiErrorMessage(payload: unknown, fallback: string) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    payload.error &&
    typeof payload.error === "object" &&
    "message" in payload.error
  ) {
    return String(payload.error.message);
  }
  if (
    payload &&
    typeof payload === "object" &&
    "detail" in payload &&
    typeof payload.detail === "string"
  ) {
    return payload.detail;
  }
  return fallback;
}

export class UnauthorizedError extends Error {
  constructor(message = "Session หมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly tokenProvider: TokenProvider;
  private readonly fetcher: Fetcher;

  constructor(
    baseUrl = API_BASE_URL,
    tokenProvider: TokenProvider = currentAccessToken,
    fetcher: Fetcher = fetch,
  ) {
    this.baseUrl = baseUrl;
    this.tokenProvider = tokenProvider;
    this.fetcher = fetcher.bind(typeof window !== "undefined" ? window : globalThis);
  }

  private async authorizationHeaders(includeJson = true) {
    const token = await this.tokenProvider();
    if (!token) {
      throw new UnauthorizedError("Session หมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง");
    }
    const headers = new Headers({ Authorization: `Bearer ${token}` });
    if (includeJson) headers.set("Content-Type", "application/json");
    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const response = await this.fetcher(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: new Headers({
        ...(Object.fromEntries(
          (await this.authorizationHeaders()).entries(),
        ) as Record<string, string>),
        ...(Object.fromEntries(
          new Headers(options.headers).entries(),
        ) as Record<string, string>),
      }),
    });
    const payload = (await response.json().catch(() => null)) as
      | ApiEnvelope<T>
      | null;
    if (response.status === 401) {
      throw new UnauthorizedError(
        apiErrorMessage(payload, "Session หมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง"),
      );
    }
    if (!response.ok || !payload?.ok || payload.data === null) {
      throw new Error(apiErrorMessage(payload, "ไม่สามารถเชื่อมต่อบริการได้"));
    }
    return payload.data;
  }

  async health(): Promise<{ status: string }> {
    const response = await this.fetcher(`${this.baseUrl}/health`);
    if (!response.ok) throw new Error("API is unavailable");
    const payload = (await response.json()) as ApiEnvelope<{ status: string }>;
    if (!payload.ok || !payload.data) throw new Error("API is unavailable");
    return payload.data;
  }

  analyzeMedia(url: string, options: RequestInit = {}): Promise<MediaAnalysis> {
    return this.request<MediaAnalysis>("/media/analyze", {
      method: "POST",
      body: JSON.stringify({ url }),
      ...options,
    });
  }

  createJob(input: CreateJobInput): Promise<{
    job_id: string;
    status: string;
  }> {
    return this.request("/downloads", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async listJobs(options: {
    limit?: number;
    offset?: number;
    status?: string;
    query?: string;
  } = {}): Promise<Job[]> {
    const parameters = new URLSearchParams({
      limit: String(options.limit ?? 50),
      offset: String(options.offset ?? 0),
    });
    if (options.status) parameters.set("status", options.status);
    if (options.query) parameters.set("q", options.query);
    const data = await this.request<{ jobs: Job[]; total: number }>(
      `/downloads?${parameters.toString()}`,
    );
    return data.jobs || [];
  }

  getJob(jobId: string): Promise<Job> {
    return this.request(`/downloads/${encodeURIComponent(jobId)}`);
  }

  cancelJob(jobId: string): Promise<Job> {
    return this.request(`/downloads/${encodeURIComponent(jobId)}/cancel`, {
      method: "POST",
    });
  }

  pauseJob(jobId: string): Promise<Job> {
    return this.request(`/downloads/${encodeURIComponent(jobId)}/pause`, {
      method: "POST",
    });
  }

  resumeJob(jobId: string): Promise<Job> {
    return this.request(`/downloads/${encodeURIComponent(jobId)}/resume`, {
      method: "POST",
    });
  }

  deleteJob(jobId: string): Promise<{ deleted: boolean }> {
    return this.request(`/downloads/${encodeURIComponent(jobId)}`, {
      method: "DELETE",
    });
  }

  deleteAccount(): Promise<{ deleted: boolean }> {
    return this.request("/account", { method: "DELETE" });
  }

  private async fileResponse(jobId: string) {
    const response = await this.fetcher(
      `${this.baseUrl}/files/download/${encodeURIComponent(jobId)}`,
      {
        headers: await this.authorizationHeaders(false),
      },
    );
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(apiErrorMessage(payload, "ดาวน์โหลดไฟล์ไม่สำเร็จ"));
    }
    return response;
  }

  async chooseFileDestination(
    preferredFilename: string,
  ): Promise<FileDestination | null> {
    const pickerWindow = window as Window & {
      showSaveFilePicker?: (options: {
        suggestedName: string;
      }) => Promise<FileDestination>;
    };

    if (!pickerWindow.showSaveFilePicker) return null;
    return pickerWindow.showSaveFilePicker({
      suggestedName: preferredFilename,
    });
  }

  async downloadJobFile(
    jobId: string,
    preferredFilename: string,
    destination: FileDestination | null = null,
  ): Promise<"picker" | "download"> {
    if (destination) {
      const response = await this.fileResponse(jobId);
      if (!response.body) throw new Error("ไม่พบข้อมูลไฟล์");
      const writable = await destination.createWritable();
      await response.body.pipeTo(writable);
      return "picker";
    }

    const response = await this.fileResponse(jobId);
    const filename = getDownloadFilename(
      response.headers.get("Content-Disposition"),
      preferredFilename,
    );
    triggerBlobDownload(await response.blob(), filename);
    return "download";
  }

  /**
   * Deliver a completed file through the native share sheet (Web Share API).
   *
   * On iOS the share sheet includes "Save Video / Save Image" which saves
   * straight into the Photos app; on Android the user can pick Photos, Files,
   * Drive, etc. The completed file is one-shot (the API deletes it after this
   * request), so when sharing is unavailable or dismissed we fall back to a
   * regular browser download with the already-fetched blob instead of wasting it.
   *
   * Returns:
   *   - "shared":      file handed to the native share sheet
   *   - "downloaded":  share was unavailable/dismissed; file downloaded instead
   *   - "unsupported": this browser has no Web Share API; nothing was consumed
   */
  async shareJobFile(
    jobId: string,
    preferredFilename: string,
  ): Promise<"shared" | "downloaded" | "unsupported"> {
    if (!canShareFiles()) return "unsupported";

    const response = await this.fileResponse(jobId);
    const blob = await response.blob();
    const filename = getDownloadFilename(
      response.headers.get("Content-Disposition"),
      preferredFilename,
    );
    const file = new File([blob], filename, {
      // The API always serves octet-stream, but iOS decides whether the share
      // sheet offers "Save Video / Save Image" (into Photos) based on the
      // MIME type, so infer a proper one from the file extension.
      type: mimeFromFilename(filename) || blob.type || "application/octet-stream",
    });

    if (!navigator.canShare({ files: [file] })) {
      triggerBlobDownload(blob, filename);
      return "downloaded";
    }

    try {
      await navigator.share({ files: [file], title: filename });
      return "shared";
    } catch {
      // The one-shot server file is already consumed at response.blob(), so on
      // any share failure (including the user dismissing the share sheet) we
      // deliver the blob we already hold instead of losing the file.
      triggerBlobDownload(blob, filename);
      return "downloaded";
    }
  }

}

export const apiClient = new ApiClient();
