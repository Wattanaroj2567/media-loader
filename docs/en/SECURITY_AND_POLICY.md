# Security and Policy

> **Language:** **English** · [ภาษาไทย](../th/SECURITY_AND_POLICY.md)

## Purpose

This project must stay rights-aware and safe.

The system must never become an unrestricted downloader.

---

## Current Implementation Scope

- The API accepts HTTP and HTTPS on ports 80 and 443, checks IPv4 and IPv6 DNS
  answers, and blocks non-public addresses before analysis and job creation.
- API and worker source requests use the `ssrf-proxy`. It resolves each
  destination, rejects the connection if any answer is non-public, and connects
  to the validated numeric address. HTTP redirects are followed through the
  proxy, so each new destination is checked before connection. HTTPS uses a
  CONNECT tunnel and each subsequent redirect creates another checked request.
- Docker Compose isolates the API and worker from direct internet access and
  connects them to the proxy. Deployments outside this Compose network must
  provide an equivalent public-IP egress proxy and block direct network egress.
- `download_jobs.original_url` is encrypted with Fernet before database writes.
  The API and worker must share `MEDIA_URL_ENCRYPTION_KEY`. It remains encrypted
  while the job record exists for owner-only copy and reanalysis actions; deleting
  the job removes the stored link. `policy_logs.url` stores only the source
  origin with its path and query removed.
- Existing plaintext rows require the one-time migration command documented in
  [Environment Variables](ENVIRONMENT_VARIABLES.md). Until it is run, older
  job rows remain plaintext in the database.
- API access logs remove query values, and application logs identify a job and
  safe source origin without recording the submitted URL.
- The direct Giphy GIF path still checks that the final URL remains on Giphy
  and has a GIF path; the egress proxy also checks every network destination.
- Legacy guest session IDs and short-lived file tokens grant access to a guest
  job or file. Treat them as credentials; new jobs require a signed-in account.
- The default output mode is `local_temp`. Complete Supabase cloud-file storage
  and delivery are not implemented.

---

## Core Rules

1. Validate URLs before network access
2. Run policy check before analysis
3. Show analysis results, then require rights confirmation before queueing
4. Block unsupported or unsafe URLs
5. Store policy decisions
6. Keep secrets server-side
7. Use Supabase RLS
8. Keep completed files owner-scoped and temporary by default

---

## Blocked URL Types

Always block:

- `file://`
- `ftp://` unless explicitly supported later
- `localhost`
- `127.0.0.1`
- `0.0.0.0`
- Private IP ranges
- Link-local IP ranges
- Internal hostnames

---

## SSRF Protection

Before making outbound requests:

- Parse URL strictly
- Allow only HTTP/HTTPS on ports 80 and 443
- Resolve IPv4 and IPv6 records and reject the hostname if any answer is not public
- Connect through the SSRF proxy, which uses the validated address for that connection
- Enforce allowed protocols
- Limit redirects
- Re-check each redirect destination through the proxy
- Set timeout
- Limit response size

The proxy performs connection-time DNS validation and address pinning to prevent
DNS rebinding. For non-Compose deployments, ensure the API and worker cannot
make user-derived connections around their configured proxy.

## Web Push delivery

- Accept subscription endpoints only over HTTPS from the supported FCM, Mozilla,
  Apple, and Windows push-service hostnames.
- Re-check endpoints in the worker and send through the DNS-validating egress
  proxy; never send to arbitrary user-provided hosts.
- Keep subscription endpoints and browser keys in the server-managed,
  RLS-protected `push_subscriptions` table. Never log or return them.
- Keep the VAPID private key in API/worker secrets and out of browser bundles.

---

## Platform Policy

The system must not bypass platform restrictions.

For major platforms, the policy layer should be conservative.

Current API decisions:

```text
allowed
needs_confirmation
blocked
```

When uncertain, return `needs_confirmation` or `blocked`, not `allowed`.

---

## yt-dlp Restricted Mode

If yt-dlp is used:

- Do not use browser cookies
- Do not bypass login restrictions
- Do not bypass DRM
- Do not bypass age gates
- Do not bypass geo restrictions
- Do not download private content
- Use timeouts
- Use controlled output paths
- Sanitize filenames

---

## File Safety

- API metadata responses read through yt-dlp are limited to 8 MiB each and
  32 MiB per extraction attempt, measured after transport decompression.
  Oversized responses are closed without retrying. The public Instagram embed
  fallback retains its separate 1,000,000-byte limit. Metadata extraction excludes
  yt-dlp's urllib transport, which buffers compressed bodies before returning them.
- The worker checks actual downloaded bytes, not only declared source sizes.
  A monitored subprocess owns yt-dlp and its FFmpeg children so native downloads,
  external downloaders, merging, and conversion can be stopped on resource limits,
  cancellation, or timeout. Source URLs are passed through stdin, not process arguments.
- Each temporary file is limited by `MAX_FILE_SIZE_MB`; all files for one job
  share a budget of three times that limit to allow audio/video streams and
  merged output to coexist. Admission requires capacity for the remaining job
  budget plus 64 MiB free on the shared output disk. Runtime checks preserve
  that 64 MiB reserve and remove failed-job output.
- Subprocess disk checks run every 250 ms; a fast writer can overshoot between
  checks. Use filesystem/container storage quotas for a hard storage boundary,
  particularly when multiple workers share a volume.
- Thumbnail fallback windows accept only HTTP(S) URLs and use
  `noopener,noreferrer` to isolate the source page from the application.
- Enforce max file size
- Validate media content before accepting output
- Validate extension
- Store in a controlled local temp path by default
- Resolve and validate local paths before serving
- Do not execute downloaded files
- Sanitize filenames
- Clean temp files

---

## Supabase Security

- Enable RLS on all user-owned tables
- Users can only access their own rows
- Service role key only in backend/worker
- Keep future Storage buckets private; cloud-file storage is not currently implemented
- Deliver local temp files through FastAPI with a bearer token, owning guest
  session, or short-lived file token
- Avoid public buckets for user media

---

## Logging Rules

Log:

- Job ID
- Status
- Safe domain/platform
- Safe error code

Do not log:

- Secrets
- Access tokens
- Full submitted URLs or query strings
- Local temp output paths when not necessary
- Service role key
- User private keys

The database keeps job URLs encrypted while their job records exist so owners can
copy or analyze the source link again. Deleting a job removes its stored link.
Policy logs keep only a redacted source origin. Run the legacy-data migration
before sharing an existing deployment that stored plaintext URLs.

---

## Safe Error Messages

Good:

```text
This URL is blocked because it points to an internal network address.
```

Bad:

```text
Request to 192.168.1.1 returned private server headers: ...
```

---

## Final Safety Checklist

- [ ] Policy check cannot be skipped
- [ ] Worker only processes queued jobs created by API
- [ ] Secrets are not printed
- [ ] Submitted URLs and query values are removed from application logs
- [ ] Job URLs are encrypted at rest and the same encryption key is configured for API and worker
- [ ] Redirect destinations and DNS rebinding are checked at the egress proxy
- [ ] API and worker have no direct egress path around the proxy
- [ ] Service role key is not in frontend
- [ ] RLS is enabled
- [ ] Cloud-file storage remains disabled until implemented and secured
- [ ] SSRF protections exist
- [ ] Platform restrictions are not bypassed
