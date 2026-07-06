/**
 * Client-side URL validation for Media Loader.
 *
 * This is a first-pass check before sending to FastAPI.
 * The real policy check happens server-side.
 */

export type UrlValidationResult = {
  valid: boolean;
  error?: string;
  /** Cleaned/trimmed URL */
  url: string;
};

/** Protocols we never allow */
const BLOCKED_PROTOCOLS = new Set([
  "javascript:",
  "data:",
  "file:",
  "ftp:",
  "blob:",
  "about:",
  "chrome:",
  "vbscript:",
]);

/** Private/reserved IPv4 ranges (SSRF prevention) */
const PRIVATE_IP_PATTERNS = [
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/,
  /^192\.168\.\d{1,3}\.\d{1,3}$/,
  /^0\.0\.0\.0$/,
  /^169\.254\.\d{1,3}\.\d{1,3}$/,
];

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "[::1]",
]);

/**
 * Validate a URL string for basic safety and format.
 *
 * Rules:
 * - Must be non-empty
 * - Must use http or https protocol
 * - Must have a valid hostname
 * - Must not target localhost or private IPs
 * - Must not use blocked protocols
 */
export function validateUrl(input: string): UrlValidationResult {
  const url = input.trim();

  if (!url) {
    return { valid: false, error: "URL is required", url };
  }

  // Block dangerous protocols before URL parsing
  const lowerUrl = url.toLowerCase();
  for (const protocol of BLOCKED_PROTOCOLS) {
    if (lowerUrl.startsWith(protocol)) {
      return {
        valid: false,
        error: `Blocked protocol: ${protocol.replace(":", "")} URLs are not allowed`,
        url,
      };
    }
  }

  // Try to parse as URL
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return {
      valid: false,
      error: "Invalid URL format. Must start with https:// or http://",
      url,
    };
  }

  // Only allow http and https
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      valid: false,
      error: `Only http and https URLs are supported (got ${parsed.protocol.replace(":", "")})`,
      url,
    };
  }

  // Check for blocked hostnames
  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return {
      valid: false,
      error: "Localhost and loopback addresses are blocked for safety",
      url,
    };
  }

  // Check for private IP ranges
  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return {
        valid: false,
        error: "Private network addresses (RFC 1918) are blocked for safety",
        url,
      };
    }
  }

  // Must have a hostname with at least one dot (no bare words like "test")
  if (!hostname.includes(".") && !hostname.startsWith("[")) {
    return {
      valid: false,
      error: "URL must contain a valid domain name",
      url,
    };
  }

  return { valid: true, url: parsed.href };
}

/**
 * Extract a human-readable domain from a URL.
 * Returns the hostname without "www." prefix.
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}
