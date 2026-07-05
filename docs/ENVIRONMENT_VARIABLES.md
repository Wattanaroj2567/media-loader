# Environment Variables

Use `.env.example` for placeholders only.

Use `.env.local` for real local values.

Never commit real secrets.

---

## Frontend Variables

These can be used by Next.js client code:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_FASTAPI_BASE_URL=
```

These are public-facing config values. Do not place private secrets in variables starting with `NEXT_PUBLIC_`.

---

## Backend Variables

Used by FastAPI only:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
DATABASE_URL=
CORS_ORIGINS=
```

---

## Worker Variables

Used by Python worker only:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
MEDIA_STORAGE_BUCKET=media-downloads
WORKER_SECRET=
WORKER_ID=local-worker-1
MAX_FILE_SIZE_MB=500
TEMP_DIR=.tmp/media-loader
```

---

## Optional Variables

```env
LOG_LEVEL=info
ENABLE_SUPABASE_REALTIME=false
DEFAULT_AUDIO_QUALITY=192kbps
DEFAULT_VIDEO_QUALITY=720p
AUTO_CLEANUP_DAYS=7
```

---

## Validation Rules

The validation script must check:

- variable exists
- variable is not empty
- public variable is not accidentally set to a service role key pattern
- service role key is not available in frontend bundle

The script must not print actual values.
