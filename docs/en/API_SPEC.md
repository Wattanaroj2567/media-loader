# API Specification

> **Language:** **English** · [ภาษาไทย](../th/API_SPEC.md)

Base API: FastAPI, normally available at `http://localhost:8000` during local development.

## Authentication and guest access

- `GET /health` is public.
- `POST /media/analyze` and `POST /downloads` accept signed-in users and guests.
- For a guest job, send the stable `X-Guest-Session-ID` header on create and
  subsequent job/file requests. The web client stores and reuses this ID.
- Without that header, an anonymous `POST /downloads` request still creates a
  guest ID, but the response does not return it. The caller therefore cannot
  retrieve that job later.
- `GET /downloads` and `DELETE /account` require a Supabase access token in
  `Authorization: Bearer <token>`.
- Per-job actions and file-token issuance accept either a valid bearer token or
  `X-Guest-Session-ID` for the owner of that job.

Never log access tokens, download tokens, service-role keys, or environment-file
values.

Job source URLs are encrypted in database storage and returned to the authorized
job owner after decryption. Policy logs retain only a redacted source origin.
API access logs remove query values. Source analysis and downloads use the
public-IP egress proxy described in [Security and Policy](SECURITY_AND_POLICY.md).

## JSON response envelope

JSON endpoints use this envelope.

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
| `POST /media/analyze` | Anonymous or bearer token |
| `POST /downloads` | Anonymous or bearer token; use `X-Guest-Session-ID` for a guest job that can be revisited |
| `GET /downloads` | Bearer token required |
| `GET /downloads/{job_id}` | Bearer token or owning guest session |
| `POST /downloads/{job_id}/cancel` | Bearer token or owning guest session |
| `POST /downloads/{job_id}/pause` | Bearer token or owning guest session |
| `POST /downloads/{job_id}/resume` | Bearer token or owning guest session |
| `DELETE /downloads/{job_id}` | Bearer token or owning guest session |
| `GET /files/token/{job_id}` | Bearer token or owning guest session |
| `GET /files/download/{job_id}` | Download token, bearer token, or owning guest session |
| `DELETE /files/delete/{job_id}` | Bearer token or owning guest session |
| `DELETE /account` | Bearer token required |

### GET `/health`

Public health check.

```json
{
  "ok": true,
  "data": {
    "status": "healthy",
    "worker_pool": "local"
  },
  "error": null
}
```

### POST `/media/analyze`

Validate and analyze a media URL before creating a job. The API checks URL and
policy rules before extracting metadata and available formats. Authentication
is optional; when a user is signed in, the decision is associated with that user.

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

`is_animated_gif` is true only when source metadata identifies animated GIF
media. This also covers X posts served as MP4 from the public `/tweet_video/`
path and direct Giphy GIF links whose preview redirects to a silent MP4.

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

On success, the response contains the new job ID and `QUEUED` status. A guest
caller should send `X-Guest-Session-ID` so it can retrieve the job later.

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
