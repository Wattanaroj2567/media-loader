# API Specification

> **Language:** **English** · [ภาษาไทย](../th/API_SPEC.md)

Base API: FastAPI, normally available at `http://localhost:8000` during local development.

## Authentication and guest access

- `GET /health` is public.
- Analysis, job creation, and job resume require a verified Supabase bearer token.
- New jobs belong to the verified account; guest headers cannot create jobs.
- Existing legacy guest jobs retain owner-checked lookup, pause, cancel, delete,
  and file access through `X-Guest-Session-ID`, but cannot resume anonymously.
- `GET /downloads` and `DELETE /account` require a Supabase access token in
  `Authorization: Bearer <token>`.
- Per-job actions and file-token issuance accept either a valid bearer token or
  `X-Guest-Session-ID` for the owner of that job.

Never log access tokens, download tokens, service-role keys, or environment-file
values.

Job source URLs are encrypted in database storage and returned to the authorized
job owner after decryption. They remain available while the job record exists so
the owner can copy or analyze the source link again; deleting the job removes
the stored link. Policy logs retain only a redacted source origin. API access
logs remove query values. Source analysis and downloads use the public-IP egress
proxy described in [Security and Policy](SECURITY_AND_POLICY.md).

## Web authentication routes

These routes belong to the Next.js web origin, not the FastAPI base API.
Supabase Auth owns accounts and sessions; signed-in FastAPI requests continue
to use its access token.

Pasting a valid URL on the public page opens the sign-in form directly in a
dismissible modal. The header sign-in button opens this same modal without
requiring a URL and preserves any pending analysis intent. Sign-in, registration,
and password recovery use the same authentication surface: full-screen on phones
and a centered modal on larger screens. The close button remains accessible while
scrolling, and switching forms keeps the landing page and draft link. Direct
authentication routes remain available for callbacks and bookmarks.
Neither pasting nor dismissing the dialog starts analysis or navigation. The
page remembers the link in same-tab session storage across login failure,
reload, registration, and OAuth. After login, the dashboard consumes that intent
and analyzes the link. Source URLs are not put in authentication redirect query
parameters. Format selection and the explicit “Confirm rights and download”
button precede queueing. This single button records the user's confirmation and
creates the job; the interface has no separate rights checkbox.

| Route | Behavior |
| --- | --- |
| `/auth/login` | Email/password or Google sign-in |
| `/auth/register` | Email/password signup or Google sign-in; optional display name is `full_name` metadata, not a username credential |
| `/auth/forgot-password` | Requests recovery email; shows the same neutral confirmation even on provider failure |
| `/auth/reset-password` | Requires a verified authenticated session, updates the password, then signs out globally and opens `/auth/login?reset=success` |
| `GET /auth/callback` | Exchanges the authorization code for a session and redirects to a permitted destination |
| `POST /auth/signout` | Calls Supabase sign-out; returns `303` to `/` on success or `503` with a safe error code on provider failure |

Signup with a session opens `/dashboard`. Signup that requires email confirmation
asks the user to check their email; profiles use the existing database trigger.
Recovery email redirects through `/auth/callback?next=/auth/reset-password` and
must be opened in the initiating browser for PKCE. If the password update succeeds
but global sign-out fails, retry repeats only sign-out. Email signup stores the
selected locale in user metadata as `language`. Successful password sign-in and
callback exchanges sync that preference from the browser's `media-loader-locale`
cookie, defaulting to Thai when missing or invalid. The recovery redirect does
not carry a locale query parameter; the app does not select a language for the
hosted Supabase email template.

The callback's `next` must be same-origin with a pathname of `/dashboard`,
`/history`, `/settings`, `/downloads`, or `/auth/reset-password`. Query and fragment
are stripped; other destinations fall back to `/dashboard`. Failures redirect
with a safe callback error code to login or recovery.

Middleware protects `/dashboard`, `/history`, `/downloads`, and `/settings`,
redirecting anonymous visitors to `/`. Signed-in visitors to `/`, `/auth/login`,
`/auth/register`, or `/auth/forgot-password` go to `/dashboard`; recovery and
callback error messages remain accessible. Redirects carry session cookies.

Enable Email/Password and Google in the Supabase dashboard. Allowlist the exact
web-origin URLs `/auth/callback` and `/auth/callback?next=/auth/reset-password`
(for example, `http://localhost:3000/auth/callback` and
`http://localhost:3000/auth/callback?next=/auth/reset-password`). Configure each
deployed origin manually in the dashboard.

## JSON response envelope

FastAPI JSON endpoints use this envelope.

```json
{
  "ok": true,
  "data": {},
  "error": null
}
```

Errors use the same envelope:

```json
{
  "ok": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error"
  }
}
```

`GET /files/download/{job_id}` is the exception: it streams the file as a binary
response.

## Endpoints

| Method and path | Access |
| --- | --- |
| `GET /health` | Public |
| `POST /media/analyze` | Bearer token required |
| `POST /downloads` | Bearer token required |
| `GET /downloads` | Bearer token required |
| `GET /downloads/{job_id}` | Bearer token or owning guest session |
| `POST /downloads/{job_id}/cancel` | Bearer token or owning guest session |
| `POST /downloads/{job_id}/pause` | Bearer token or owning guest session |
| `POST /downloads/{job_id}/resume` | Bearer token required |
| `DELETE /downloads/{job_id}` | Bearer token or owning guest session |
| `GET /files/token/{job_id}` | Bearer token or owning guest session |
| `GET /files/download/{job_id}` | Download token, bearer token, or owning guest session |
| `DELETE /files/delete/{job_id}` | Bearer token or owning guest session |
| `DELETE /account` | Bearer token required |
| `GET /notifications/vapid-public-key` | Bearer token required |
| `POST /notifications/subscriptions` | Bearer token required |
| `GET /notifications/subscriptions/status` | Bearer token required |
| `DELETE /notifications/subscriptions` | Bearer token required |

### GET `/health`

Public health check.

```json
{
  "ok": true,
  "data": {
    "status": "healthy",
    "worker_id": "local-worker-1",
    "worker_pool": "local",
    "output_mode": "local_temp",
    "supabase_connected": true
  },
  "error": null
}
```

`worker_id` identifies the worker, `output_mode` is the output storage mode, and
`supabase_connected` reports whether Supabase is configured (it does not test the
connection).

### POST `/media/analyze`

Validate and analyze a media URL before creating a job. The API checks URL and
policy rules before extracting metadata and available formats. Authentication
is required before policy processing or extraction; decisions belong to that user.

Request:

```json
{
  "url": "https://example.com/video"
}
```

A successful response includes real source metadata and formats. Fields may be
`null` when the source does not provide a value.

```json
{
  "ok": true,
  "data": {
    "policy": {
      "decision": "allowed",
      "reason": "URL passed domain safety checks"
    },
    "media": {
      "title": "Example Video",
      "platform": "youtube",
      "thumbnail_url": "https://example.com/thumbnail.jpg",
      "duration_seconds": 125,
      "uploader": "Creator Name",
      "source_domain": "youtube.com",
      "view_count": 1234567,
      "like_count": 45678,
      "reaction_count": null,
      "is_animated_gif": false
    },
    "formats": [
      {
        "format_id": "137",
        "type": "video",
        "extension": "mp4",
        "resolution": "1920x1080",
        "quality_label": "1080p · 30 FPS",
        "width": 1920,
        "height": 1080,
        "raw_height": 1080,
        "fps": 30,
        "bitrate": null,
        "video_codec": "avc1",
        "audio_codec": "none",
        "filesize": null,
        "has_video": true,
        "has_audio": false
      }
    ]
  },
  "error": null
}
```

`view_count`, `like_count`, and `reaction_count` are public values reported by
source metadata. The API returns `null` when a value is unavailable; it does not
estimate or synthesize counts. Reactions remain separate from likes because
some platforms report a combined reaction total. For public Instagram posts,
the analyzer may read the real `video_view_count` from the logged-out embed page
when the primary extractor omits it. It does not use account cookies.

`is_animated_gif` is true when source metadata or the submitted URL identifies
animated GIF media. This covers X posts served as MP4 from the public
`/tweet_video/` path, direct Giphy GIF links whose preview redirects to a silent
MP4, and Tenor `.gif` links that redirect to a `/view/` page. The platform and
source domain remain based on the host the user submitted. Direct animated GIF
links from Facebook CDN hosts such as `cdn.fbsbx.com` are identified as Facebook
media and use the normal yt-dlp path through the egress proxy.

In `formats[]`, `height` and `quality_label` are a quality tier that follows
YouTube's labels, while `resolution` is the file's actual frame size. For frames
wider than 16:9, the tier comes from the 16:9-equivalent height of the width. For
example, a 1920x960 video reports `height` `1080` and `quality_label` `1080p`,
but `resolution` stays `1920x960`. `raw_height` carries the actual frame height

When the extractor returns multiple video formats with a known display tier,
the API returns one option for that tier. Formats without a known height stay
separate because their display tiers cannot be compared. For duplicate known
tiers, it prefers a format with reported FPS
and then the higher FPS value; if no candidate reports FPS, it keeps the best
format by container, codec, audio-track, and bitrate preference. A video-only
format can still be combined with a separate audio track by the worker.

A blocked policy decision is returned without formats. Rights confirmation is
required later, when submitting `POST /downloads`.

### POST `/downloads`

Create a media-processing job. The API revalidates the URL and policy, analyzes
the source again, and confirms that the selected format is still available
before inserting the job.

Request:

```json
{
  "url": "https://example.com/video",
  "selected_format_id": "137",
  "output_format": "mp4",
  "rights_confirmed": true
}
```

`output_format` accepts `mp4`, `mp3`, or `gif`. The request is rejected unless
`rights_confirmed` is true. GIF output is accepted only when analysis identifies
the source as animated GIF media. The selected source format must be compatible
with the requested output.

On success, the response contains the new job ID and `QUEUED` status. The verified
account owns the job, regardless of any guest header supplied by the caller.

### GET `/downloads`

List the signed-in user's jobs. Guest sessions do not have this account-wide
history endpoint.

Query parameters:

- `status` — filter by status
- `q` — search query
- `limit` — page size
- `offset` — number of jobs to skip

The frontend uses this endpoint for active queue and terminal history views.
Per-job guest lookup uses `GET /downloads/{job_id}`.
Job payloads include `file_size_bytes` with the exact completed output size;
`file_size_mb` is a rounded convenience value.

### GET `/downloads/{job_id}`

Return one job after checking that the bearer-token user or guest session owns
it. The API does not fall back to another user profile.

### POST `/downloads/{job_id}/cancel`

Cancel a job in a cancellable state: `PENDING`, `ANALYZING`, `READY`,
`QUEUED`, `DOWNLOADING`, `CONVERTING`, `UPLOADING`, or `PAUSED`.

### POST `/downloads/{job_id}/pause`

Pause a job in `PENDING`, `READY`, `QUEUED`, `DOWNLOADING`, or `CONVERTING`.
The response status becomes `PAUSED`.

### POST `/downloads/{job_id}/resume`

Resume a `PAUSED` job. The API returns it to `QUEUED` for a worker in its
target pool.

### DELETE `/downloads/{job_id}`

Delete a job and its local temporary output, if present. Running jobs must be
cancelled first. A successful response is:

```json
{
  "ok": true,
  "data": {
    "deleted": true
  },
  "error": null
}
```

### GET `/files/token/{job_id}`

Create a short-lived download token for a completed file. The response contains
`job_id`, `download_token`, `download_url`, and `expires_in`; token lifetime is
300 seconds. A bearer token or the owning guest-session header is required.

```json
{
  "ok": true,
  "data": {
    "job_id": "uuid",
    "download_token": "short-lived-token",
    "download_url": "/files/download/uuid?token=short-lived-token",
    "expires_in": 300
  },
  "error": null
}
```

Treat the URL as a secret while it is valid. Do not log or share it.

### GET `/files/download/{job_id}`

Stream a completed local temporary file. Access may use the short-lived query
token, a bearer token, or the owning guest-session header. This endpoint returns
binary file content rather than the JSON envelope.

A successful request does not delete the file. The worker removes expired
temporary outputs after the configured retention period, which defaults to
60 minutes. The user can also explicitly delete an output.

### DELETE `/files/delete/{job_id}`

Delete a completed local temporary output and clear its stored path. The job
history remains. Access requires a bearer token or the owning guest session.

### DELETE `/account`

Delete the signed-in user's Media Loader account. The API removes the user's
local temporary outputs and deletes the Supabase Auth user. A bearer token is
required.

### Web Push subscriptions

`GET /notifications/vapid-public-key` returns the public application server key
needed by the browser Push API. It returns `503 PUSH_NOT_CONFIGURED` when
`VAPID_PUBLIC_KEY` is empty.

`POST /notifications/subscriptions` stores or updates the authenticated user's
browser subscription. It accepts only HTTPS endpoints from supported push
services; endpoint URLs and subscription keys are private credentials and are
never returned by the API.

```json
{
  "endpoint": "https://fcm.googleapis.com/push/<subscription-token>",
  "keys": {
    "p256dh": "<browser-public-key>",
    "auth": "<browser-auth-secret>"
  },
  "locale": "th"
}
```

`GET /notifications/subscriptions/status` reports whether the authenticated
account has any push endpoints registered across app origins.

`DELETE /notifications/subscriptions` accepts an optional endpoint in its
request body. When supplied, it removes only that endpoint owned by the
authenticated user; when omitted, it removes all of that account's endpoints
so opting out on one app origin also stops pushes registered on another. The
worker sends notifications for job transitions to `COMPLETED`, `FAILED`, and
`BLOCKED`; expired push endpoints are removed after a `404` or `410` response.
