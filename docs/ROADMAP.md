# Roadmap

This roadmap is written as implementation milestones, not product version numbers.

Use it as a high-level guide after following `TODO.md`. The detailed work order is still controlled by `TODO.md`.

---

## Milestone 0 — Work Package and Project Foundation

Goal: Prepare the real implementation project in the correct location.

- Confirm the work package root
- Create the real project inside `./media-loader`
- Initialize monorepo structure
- Add base README, AGENTS, TODO, docs, scripts, and env example
- Confirm no application code is created in the work package root

Done when: the generated project has a clean folder structure and can be opened independently.

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

---

## Milestone 5 — Docker Worker and Media Processing

Goal: Process queued jobs outside the frontend.

- Python worker structure
- Job polling and locking
- Restricted yt-dlp service
- FFmpeg conversion service
- Progress updates
- Temp file cleanup
- Supabase Storage upload

Done when: a queued allowed job can produce an output file and update status to `COMPLETED`.

---

## Milestone 6 — History, File Access, and Settings

Goal: Make the app feel complete for personal use.

- Download history page
- Status filters and search
- Signed download URLs
- Delete file/history actions
- Retry failed jobs
- Settings page
- Default quality preferences
- Auto cleanup rules

Done when: the user can manage previous jobs and downloaded files from the dashboard.

---

## Milestone 7 — Deployment and Review

Goal: Prepare for real use and handoff.

- Vercel deployment
- Supabase production callback URLs
- Environment variable review
- Security review
- RLS review
- UI consistency review
- Testing checklist
- Final README update

Done when: the project has clear setup instructions, no exposed secrets, and a working deployment path.
