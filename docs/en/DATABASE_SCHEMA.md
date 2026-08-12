# Database Schema

Supabase PostgreSQL is the main database.

All user-owned tables must use `user_id uuid references auth.users(id)` and Row Level Security.

---

## `profiles`

Stores public user profile data copied from Supabase Auth metadata.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key, references auth.users(id) |
| email | text | User email |
| full_name | text | Display name |
| avatar_url | text | Profile image |
| created_at | timestamptz | Created timestamp |
| updated_at | timestamptz | Updated timestamp |

---

## `download_jobs`

Stores each media job.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| original_url | text | Submitted URL |
| platform | text | direct, youtube, tiktok, etc. |
| title | text | Media title |
| uploader | text | Creator/uploader name returned by analysis |
| source_domain | text | Source domain returned by analysis |
| thumbnail_url | text | Optional thumbnail |
| duration_seconds | integer | Media duration in seconds |
| media_type | text | video, audio, unknown |
| selected_format_id | text | Selected extractor format |
| selected_quality | text | Human readable quality |
| selected_has_audio | boolean | Selected video format already contains audio |
| output_format | text | mp4, mp3, original |
| status | text | Job status |
| progress | integer | 0-100 |
| error_message | text | Safe error message |
| storage_bucket | text | Optional Supabase bucket for future/cloud mode |
| storage_path | text | Local temp output path by default; optional Storage path in cloud mode |
| file_size | bigint | Completed file size |
| rights_confirmed | boolean | User confirmation |
| locked_at | timestamptz | Worker lock timestamp |
| locked_by | text | Worker identifier |
| created_at | timestamptz | Created timestamp |
| updated_at | timestamptz | Updated timestamp |
| completed_at | timestamptz | Completed timestamp |

---

## `media_formats`

Stores available formats discovered during analysis.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| job_id | uuid | Related job or analysis record |
| user_id | uuid | Owner |
| format_id | text | Extractor format ID |
| extension | text | mp4, webm, m4a, etc. |
| resolution | text | 1080p, 720p, source |
| fps | integer | Frame rate |
| video_codec | text | Video codec |
| audio_codec | text | Audio codec |
| bitrate | integer | Bitrate |
| filesize | bigint | Estimated size |
| is_video | boolean | Has video |
| is_audio | boolean | Has audio |
| created_at | timestamptz | Created timestamp |

---

## `policy_logs`

Stores policy decisions for audit and debugging.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| url | text | Original URL |
| platform | text | Detected platform |
| decision | text | allowed, blocked, needs_confirmation |
| reason | text | Human readable reason |
| created_at | timestamptz | Created timestamp |

---

## `user_settings`

Stores personal preferences.

| Column | Type | Notes |
|---|---|---|
| user_id | uuid | Primary key, references auth.users(id) |
| default_video_quality | text | e.g. 1080p |
| default_audio_quality | text | e.g. 320kbps |
| auto_cleanup_days | integer | cleanup age |
| max_file_size_mb | integer | max file size |
| created_at | timestamptz | Created timestamp |
| updated_at | timestamptz | Updated timestamp |
