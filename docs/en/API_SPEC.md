# API Specification

> **Language:** **English** · [ภาษาไทย](../th/API_SPEC.md)

Base API: FastAPI service, normally exposed at `http://localhost:8000` during local development.

All user-scoped endpoints require:

```http
Authorization: Bearer <Supabase access token>
```

Do not log tokens, signed URLs, service role keys, or `.env.local` values.

All endpoints return the same envelope:

```json
{
  "ok": true,
  "data": {},
  "error": null
}
```

Error response:

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

---

## GET `/health`

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

---

## POST `/media/analyze`

Analyze a media URL before queueing. The API validates the URL, runs the policy check, logs the decision for the signed-in user, then extracts metadata and real source formats when allowed.

### Request

```json
{
  "url": "https://example.com/video"
}
```

### Response

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
      "thumbnail_url": "https://...",
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

`view_count`, `like_count`, and `reaction_count` are public values reported by the
source metadata. When a platform does not expose a value, the API returns `null`; it
never estimates or synthesizes engagement counts. Reactions remain separate from likes
because platforms such as Facebook report a combined reaction total rather than a
likes-only count. For public Instagram posts, the analyzer also reads the real
`video_view_count` exposed by Instagram's logged-out embed page when the primary
extractor omits it; no account cookies are used.

`is_animated_gif` is true only when source metadata identifies GIF media. Native
`.gif` sources are detected across platforms; X animated GIF posts are also detected
from their public `/tweet_video/` media path even though X serves them as MP4. Direct
Giphy `.gif` links retain their GIF identity when the public CDN redirects extraction
to a silent MP4 preview; choosing GIF still produces a real `.gif` file.

Video quality is not fabricated. The API only returns formats found by the extractor. Common heights may include `144`, `240`, `360`, `720`, `1080`, `1440`, `2160`, or any real non-standard height exposed by the source.

Rights confirmation happens after analysis, when the user has inspected the
metadata and selected a format, and is required by `POST /downloads`.

---

## POST `/downloads`

Create a download/conversion job. The API reruns URL validation, policy, and analysis server-side before inserting the job, then validates that `selected_format_id` exists in the real analysis result.

### Request

```json
{
  "url": "https://example.com/video",
  "selected_format_id": "137",
  "output_format": "gif",
  "rights_confirmed": true
}
```

`output_format` accepts `mp4`, `mp3`, or `gif`. GIF output is accepted only when
analysis identified the source as animated GIF media. The worker converts platform-backed
video containers into a real `.gif` file using a palette-optimized 15 FPS conversion
capped at 960 pixels wide to control size while preserving the source aspect ratio.

### Response

```json
{
  "ok": true,
  "data": {
    "job_id": "uuid",
    "status": "QUEUED"
  },
  "error": null
}
```

---

## GET `/downloads`

List the signed-in user's jobs.

Query params:

- `status`
- `q`
- `limit`
- `offset`

The frontend uses the same endpoint for:

- queue: active statuses (`PENDING`, `ANALYZING`, `READY`, `QUEUED`, `DOWNLOADING`, `CONVERTING`, `UPLOADING`)
- history: terminal statuses (`COMPLETED`, `FAILED`, `BLOCKED`, `CANCELLED`)

---

## GET `/downloads/{job_id}`

Get one signed-in user's job. The API never falls back to another profile and never returns another user's row.

---

## POST `/downloads/{job_id}/cancel`

Cancel a cancellable job. Cancellable statuses are `PENDING`, `ANALYZING`, `READY`, `QUEUED`, `DOWNLOADING`, `CONVERTING`, and `UPLOADING`.

---

## DELETE `/downloads/{job_id}`

Delete a queued or terminal job and clear its local temporary output when present. Running jobs must be cancelled first.

---

## GET `/files/download/{job_id}`

Authenticated local file delivery for completed jobs.

The frontend calls this endpoint with the Supabase access token and opens the browser save dialog when supported. The local temp file remains available until it is explicitly removed or reaches retention cleanup, so a transient browser failure does not discard the user's completed output. Cleanup clears `storage_path`; only metadata/history remains in PostgreSQL.

---

## DELETE `/files/delete/{job_id}`

Authenticated cleanup for a completed local temp file. This removes only the temporary output, not the history record.

---

## DELETE `/account`

Delete the signed-in account from Media Loader. The server cancels active jobs, removes local temporary outputs, and deletes the Supabase Auth user through the service role client.
