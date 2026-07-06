# Roadmap

This roadmap is written as implementation milestones, not product version numbers.

Use it as a high-level guide after following `TODO.md`. The detailed work order is still controlled by `TODO.md`.

---

## Milestone 0 — Repository Foundation

Goal: Single monorepo at repo root, ready to run locally.

- Monorepo at repo root (`apps/web`, `apps/api`, `apps/worker`)
- Docker Compose for API and worker
- Base README, AGENTS, TODO, docs, env example
- Supabase migrations in `supabase/`

Done when: `docker compose up api` and `pnpm dev` in `apps/web` both work with configured env.

**Status: complete**

---

## Milestone 1 — Frontend and Auth Foundation

Goal: Build the first usable web shell.

- Next.js app structure
- Dark modern UI foundation
- Supabase client setup
- Google login flow
- Protected dashboard shell
- Landing page
- Basic navigation

Done when: the user can sign in with Google and reach a protected dashboard.

**Status: complete**

---

## Milestone 2 — Supabase Data Layer

Goal: Prepare persistent user-owned data.

- Create Supabase tables
- Enable Row Level Security
- Add RLS policies
- Create private Storage bucket
- Add profile bootstrap logic
- Add download job schema

Done when: users can only access their own rows and completed files remain private.

**Status: complete**

---

## Milestone 3 — URL Analyzer and Policy Layer

Goal: Analyze URLs safely before any processing.

- URL input form
- URL validation
- Domain/platform detection
- SSRF protection
- Policy decision result
- Rights confirmation flow
- Metadata/format response shape

Done when: unsafe URLs are blocked and safe URLs can move to analysis.

**Status: complete**

---

## Milestone 4 — Local Docker FastAPI and Job Creation

Goal: Add server-side API logic.

- FastAPI app foundation
- `/health`
- `/media/analyze`
- `/downloads`
- Common response format
- Supabase server-side integration
- Safe error handling

Done when: the frontend can create a queued download job through FastAPI.

**Status: complete**

---

## Milestone 5 — Docker Worker and Media Processing

Goal: **Critical path for daily use** — process queued jobs and produce downloadable files.

- Python worker structure
- Job polling and locking
- Restricted yt-dlp download
- FFmpeg conversion service
- Progress updates
- Temp file cleanup in `./tmp`
- Optional Supabase Storage upload (not default for large files)

Done when: a queued allowed job completes and the owner can download the output file.

**Status: complete**

---

## Milestone 6 — History, File Access, and Settings

Goal: Make the app feel complete for personal use.

- Download history page
- Status filters and search
- Authenticated local file delivery
- Delete file/history actions
- Account page
- Account deletion

Done when: the user can manage previous jobs and downloaded files from the dashboard.

**Status: complete**

---

## Milestone 7 — Deployment and Production Use

Goal: Run the app for real use — frontend on Vercel, backend at home or a trusted host.

- Vercel deployment for `apps/web`
- Supabase production callback URLs
- Environment variable review
- Security and RLS review
- End-to-end test: login → analyze → download → history

Done when: the owner uses Media Loader outside local dev without manual workarounds.

**Status: setup documented; live production verification still pending**
