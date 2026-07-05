# Security and Policy

## Purpose

This project must stay rights-aware and safe.

The system must never become an unrestricted downloader.

---

## Core Rules

1. Validate URLs before network access
2. Run policy check before analysis
3. Require rights confirmation when needed
4. Block unsupported or unsafe URLs
5. Store policy decisions
6. Keep secrets server-side
7. Use Supabase RLS
8. Store completed files privately

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
- Suspicious redirects to internal networks

---

## SSRF Protection

Before making outbound requests:

- Parse URL strictly
- Resolve hostname
- Reject private/internal IPs
- Enforce allowed protocols
- Limit redirects
- Re-check redirect destinations
- Set timeout
- Limit response size

---

## Platform Policy

The system must not bypass platform restrictions.

For major platforms, the policy layer should be conservative.

Possible decisions:

```text
allowed
needs_confirmation
blocked
unsupported
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

- Enforce max file size
- Validate MIME type
- Validate extension
- Store in user-scoped path
- Do not execute downloaded files
- Sanitize filenames
- Clean temp files

---

## Supabase Security

- Enable RLS on all user-owned tables
- Users can only access their own rows
- Service role key only in backend/worker
- Storage bucket private by default
- Use signed URLs for downloads
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
- Full signed URLs
- Service role key
- User private keys

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
- [ ] Service role key is not in frontend
- [ ] RLS is enabled
- [ ] Storage is private
- [ ] SSRF protections exist
- [ ] Platform restrictions are not bypassed
