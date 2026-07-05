# API Specification

Base API: FastAPI service

All endpoints should return consistent JSON:

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

Check API health.

### Response

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

Analyze a media URL before download.

### Request

```json
{
  "url": "https://example.com/video.mp4",
  "rights_confirmed": true
}
```

### Response

```json
{
  "ok": true,
  "data": {
    "policy": {
      "decision": "allowed",
      "reason": "Direct media URL is allowed"
    },
    "media": {
      "title": "Example Video",
      "platform": "direct",
      "thumbnail_url": null,
      "duration_seconds": null
    },
    "formats": [
      {
        "format_id": "direct-mp4",
        "type": "video",
        "extension": "mp4",
        "resolution": "source",
        "audio_codec": "unknown",
        "video_codec": "unknown",
        "filesize": null
      }
    ]
  },
  "error": null
}
```

---

## POST `/downloads`

Create a download job.

### Request

```json
{
  "url": "https://example.com/video.mp4",
  "selected_format_id": "direct-mp4",
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

## GET `/downloads/{job_id}`

Get a job detail.

### Response

```json
{
  "ok": true,
  "data": {
    "id": "uuid",
    "status": "COMPLETED",
    "progress": 100,
    "title": "Example Video",
    "output_format": "mp4",
    "file_size": 12345678,
    "created_at": "2026-07-04T00:00:00Z",
    "completed_at": "2026-07-04T00:05:00Z"
  },
  "error": null
}
```

---

## GET `/downloads`

List current user's jobs.

Query params:

- `status`
- `q`
- `limit`
- `offset`

---

## POST `/downloads/{job_id}/cancel`

Cancel a queued or running job when possible.

---

## POST `/downloads/{job_id}/retry`

Retry a failed job.

---

## DELETE `/downloads/{job_id}`

Delete job history. Optional query can delete file too.

---

## POST `/downloads/{job_id}/signed-url`

Generate a temporary signed URL for a completed file.

### Response

```json
{
  "ok": true,
  "data": {
    "signed_url": "https://...",
    "expires_in": 300
  },
  "error": null
}
```

Never log signed URLs in production logs.
