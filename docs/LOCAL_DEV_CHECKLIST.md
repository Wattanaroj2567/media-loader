# Local Development Checklist

Use this checklist before relying on Media Loader for real downloads.

Do not paste secret values into chat or commit `.env.local`.

---

## Before Running

- [ ] You are at the **repo root** (folder contains `apps/`, `docker-compose.yml`)
- [ ] `pnpm install` run at repo root (or in `apps/web`)
- [ ] `.env.local` created from `.env.example` with Supabase + OAuth values
- [ ] Supabase migrations applied (`supabase/migrations/`)
- [ ] No real secrets committed to git

---

## Frontend Check

From repo root:

```bash
cd apps/web
pnpm dev
```

Expected:

- Landing page at `http://localhost:3000`
- Dark UI, Google login button
- No service role key in browser bundle or `NEXT_PUBLIC_*` vars

---

## Supabase Auth Check

Expected:

- Google login redirects correctly
- Callback returns to the app
- Authenticated user reaches `/dashboard`
- Unauthenticated user cannot access `(app)/` routes

---

## FastAPI Check (Docker — recommended)

From repo root:

```bash
docker compose up --build api
curl http://localhost:8000/health
```

Expected:

```json
{"ok":true,"data":{"status":"healthy"},"error":null}
```

Optional: analyze a public direct media URL via dashboard or:

```bash
curl -X POST http://localhost:8000/media/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <Supabase access token>" \
  -d '{"url":"https://example.com/sample.mp4"}'
```

---

## Worker Check

From repo root:

```bash
docker compose --profile worker up --build
```

Expected:

- Worker container starts
- Picks up `QUEUED` jobs from Supabase in FIFO order
- Writes output under `./tmp`
- Updates progress and respects cancellation
- Does not log secret values

---

## End-to-End Daily Use Check (target state)

- [ ] Paste allowed URL → analyze shows formats
- [ ] Create job → status moves past `QUEUED`
- [ ] Save finished file from History; browser opens Save dialog/Explorer when supported
- [ ] After file delivery, the local temp file is removed and history metadata remains
- [ ] Job appears in history with correct status

---

## Supabase Data Check

Expected:

- Tables exist (`profiles`, `download_jobs`, `policy_logs`, …)
- RLS enabled on user-owned tables
- User reads only own rows
- Optional Storage bucket configured only if using future/cloud file mode

---

## Safe Env Check Output

Correct example:

```text
NEXT_PUBLIC_SUPABASE_URL: OK
NEXT_PUBLIC_SUPABASE_ANON_KEY: OK
SUPABASE_SERVICE_ROLE_KEY: OK
DATABASE_URL: OK
No secret values were printed.
```

Do not output actual values.
