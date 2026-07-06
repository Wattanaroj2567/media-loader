# API Specification

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
    "status": "healthy"
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
      "source_domain": "youtube.com"
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
  "output_format": "mp4",
  "rights_confirmed": true
}
```

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

The frontend calls this endpoint with the Supabase access token and opens the browser save dialog when supported. After the response is delivered, FastAPI deletes the local temp file and clears `storage_path`; only metadata/history remains in PostgreSQL.

---

## DELETE `/files/delete/{job_id}`

Authenticated cleanup for a completed local temp file. This removes only the temporary output, not the history record.

---

## DELETE `/account`

Delete the signed-in account from Media Loader. The server cancels active jobs, removes local temporary outputs, and deletes the Supabase Auth user through the service role client.
