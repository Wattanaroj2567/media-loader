# Worktree Structure

Current monorepo layout at the **repository root**:

```text
media-loader/
├─ docker-compose.yml
├─ .dockerignore
├─ apps/
│  ├─ web/                    # Next.js frontend (Vercel)
│  │  ├─ app/
│  │  │  ├─ (app)/            # Protected: dashboard, queue, history, account
│  │  │  ├─ (marketing)/      # Landing page
│  │  │  └─ auth/             # OAuth callback, signout
│  │  ├─ components/
│  │  ├─ lib/
│  │  └─ utils/supabase/
│  │
│  ├─ api/                    # FastAPI (Docker, port 8000)
│  │  ├─ app/
│  │  │  ├─ main.py
│  │  │  ├─ routers/
│  │  │  ├─ url_policy.py
│  │  │  ├─ yt_dlp_service.py
│  │  │  └─ job_service.py
│  │  ├─ Dockerfile
│  │  └─ pyproject.toml
│  │
│  └─ worker/                 # Python worker (Docker)
│     ├─ Dockerfile
│     └─ pyproject.toml
│
├─ supabase/
│  ├─ migrations/
│  ├─ schema.sql
│  └─ rls_policies.sql
│
├─ docs/
├─ prompts/                   # Optional role prompts for coding agents
├─ scripts/
├─ examples/
├─ tmp/                       # Local media output (gitignored, Docker volume)
├─ README.md
├─ AGENTS.md
├─ TODO.md
├─ .env.example
└─ package.json
```

There is no nested `./media-loader` directory. See `docs/PROJECT_OUTPUT_LOCATION.md` if you encounter older docs.

---

## Folder Rules

### `apps/web`

Frontend only. No yt-dlp, FFmpeg, or service role key in browser code.

### `apps/api`

Policy, analysis, job creation. Runs in Docker locally; exposes `http://localhost:8000`.

### `apps/worker`

Heavy media processing. Runs in Docker; not exposed publicly. Polls Supabase for `QUEUED` jobs.

### `supabase`

SQL schema, migrations, RLS. Apply to your Supabase project for production use.

### `docs`

Setup guides, architecture, API spec, security policy.

### `docker-compose.yml`

Local services for `api` and `worker`. Secrets come from `.env.local`, never baked into images.
