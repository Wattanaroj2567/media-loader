/**
 * Resumable in-memory file transfer for the mobile save/share flow.
 *
 * The Web Share API needs the whole file before the share sheet opens, so a
 * large file is buffered here first. Mobile browsers (notably iOS Safari)
 * suspend a backgrounded tab and break its network transfer; instead of
 * surfacing that as an error, the transfer pauses and later continues from the
 * received offset with an HTTP Range request.
 */

export interface TransferProgress {
  received: number;
  total: number | null;
}

export interface VisibilitySource {
  isHidden(): boolean;
  subscribe(listener: (hidden: boolean) => void): () => void;
}

export class DownloadHttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "DownloadHttpError";
    this.status = status;
  }
}

interface ResumableDownloadOptions {
  /** Open the file at `offset` (send `Range: bytes=offset-` when offset > 0). */
  open: (offset: number, signal: AbortSignal) => Promise<Response>;
  onProgress?: (progress: TransferProgress) => void;
  visibility?: VisibilitySource;
  maxVisibleRetries?: number;
  retryDelayMs?: number;
}

function documentVisibility(): VisibilitySource {
  return {
    isHidden: () =>
      typeof document !== "undefined" && document.visibilityState === "hidden",
    subscribe(listener) {
      if (typeof document === "undefined") return () => {};
      const handle = () => listener(document.visibilityState === "hidden");
      document.addEventListener("visibilitychange", handle);
      return () => document.removeEventListener("visibilitychange", handle);
    },
  };
}

function totalFromResponse(response: Response, offset: number): number | null {
  const contentRange = response.headers.get("Content-Range");
  const rangeTotal = contentRange?.match(/\/(\d+)\s*$/)?.[1];
  if (rangeTotal) return Number(rangeTotal);
  const length = Number(response.headers.get("Content-Length"));
  return Number.isFinite(length) && length > 0 ? offset + length : null;
}

async function errorMessage(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;
  return payload?.error?.message || `HTTP ${response.status}`;
}

export class ResumableDownload {
  private chunks: Uint8Array[] = [];
  private controller = new AbortController();
  private readonly options: Required<
    Pick<ResumableDownloadOptions, "maxVisibleRetries" | "retryDelayMs">
  > &
    ResumableDownloadOptions;

  received = 0;
  total: number | null = null;
  contentDisposition: string | null = null;

  constructor(options: ResumableDownloadOptions) {
    this.options = { maxVisibleRetries: 2, retryDelayMs: 800, ...options };
  }

  /**
   * Transfer the remaining bytes. Resolves "complete" when the file is fully
   * buffered or "paused" when the page was hidden while the transfer broke;
   * call run() again to continue. Rejects on HTTP errors, user aborts, and
   * repeated network failures while the page stays visible.
   */
  async run(): Promise<"complete" | "paused"> {
    const visibility = this.options.visibility ?? documentVisibility();
    let visibleRetries = 0;

    for (;;) {
      if (this.total !== null && this.received >= this.total) return "complete";

      let hiddenDuringAttempt = visibility.isHidden();
      const unsubscribe = visibility.subscribe((hidden) => {
        if (hidden) hiddenDuringAttempt = true;
      });
      try {
        await this.transferOnce();
        return "complete";
      } catch (error) {
        if (this.controller.signal.aborted || error instanceof DownloadHttpError) {
          throw error;
        }
        if (hiddenDuringAttempt || visibility.isHidden()) return "paused";
        if (visibleRetries >= this.options.maxVisibleRetries) throw error;
        visibleRetries += 1;
        await new Promise((resolve) => setTimeout(resolve, this.options.retryDelayMs));
      } finally {
        unsubscribe();
      }
    }
  }

  abort() {
    this.controller.abort();
  }

  toBlob(type: string): Blob {
    return new Blob(this.chunks as BlobPart[], { type });
  }

  private async transferOnce() {
    const offset = this.received;
    const response = await this.options.open(offset, this.controller.signal);
    if (!response.ok) {
      throw new DownloadHttpError(response.status, await errorMessage(response));
    }
    if (offset > 0 && response.status !== 206) {
      // The server ignored the Range header and sent the whole file again.
      this.chunks = [];
      this.received = 0;
    }
    if (this.contentDisposition === null) {
      this.contentDisposition = response.headers.get("Content-Disposition");
    }
    this.total = totalFromResponse(response, this.received);
    this.report();

    if (!response.body) throw new TypeError("Response has no body");
    const reader = response.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      this.chunks.push(value);
      this.received += value.byteLength;
      this.report();
    }
    if (this.total !== null && this.received < this.total) {
      throw new TypeError("Transfer ended before the whole file arrived");
    }
  }

  private report() {
    this.options.onProgress?.({ received: this.received, total: this.total });
  }
}
