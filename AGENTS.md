# AGENTS.md

Project entry point for AI agents working in Media Loader. Read this file before making changes.

## Project

Media Loader is a rights-aware personal media loading web application. Source code lives at the repository root: `apps/web/` (Next.js 16, React 19, Tailwind v4, Drizzle), `apps/api/` (FastAPI), `apps/worker/` (Python worker), `supabase/` (database policies/functions/migrations), and `docs/` (project documentation). Do not create nested repository copies.

## Rules that always apply

- Preserve the rights-aware flow: URL input → validation → policy check → analysis → rights confirmation → queue → worker. Never implement direct downloads, DRM bypass, login-wall circumvention, or access to restricted content using browser cookies.
- Never directly open, print, search, edit, copy, or commit real `.env` files or files containing actual credentials; never log or expose secret values. Normal build, test, and development commands may load them automatically when required; do not inspect or print loaded values. Placeholder-only examples such as `.env.example` may be read or edited. Frontend code must not contain service-role keys or OAuth client secrets, and secrets must never use the `NEXT_PUBLIC_` prefix.
- Use `pnpm` for Node.js and `uv` for Python. Do not use `npm`, `yarn`, or direct `pip` commands.
- `apps/web/lib/db/schema.ts` is the application database schema source of truth. Do not create or alter application tables using raw SQL.
- Never stage or commit without explicit user instruction. Keep changes unstaged.
- For every task that changes project files, update the root `CHANGELOG.md` in the same task before completion, summarizing the full change set under applicable categories; skip only edits that change the changelog alone. When editing Markdown, run `pnpm lint:md`. When editing code, run `pnpm deadcode` and the relevant checks. Before final handoff, run the full verification suite listed in `docs/AGENT_GUIDELINES.md`; during rapid UI iteration, defer heavy tests until the milestone or an explicit request.

## Read more when relevant

Open [docs/AGENT_GUIDELINES.md](docs/AGENT_GUIDELINES.md) for the detailed project rules and documentation map. Read the sections relevant to the task:

- Architecture, API, database, security, RLS, environment, or deployment changes: consult the linked specification listed there before editing.
- Any UI implementation, redesign, responsive/accessibility change, or UI review: read `.agents/skills/ui-styling/SKILL.md`; also read `.agents/skills/ui-ux-pro-max/SKILL.md` and `.agents/skills/taste-skill/SKILL.md` when design direction, aesthetic constraints, or UX research will help. Follow project components and tokens first.
- Debugging, verification, security audits, or workspace skills management: use workspace skills in `.agents/skills/` (`systematic-debugging`, `verification-before-completion`, `security-audit`, `skill-creator`).
- Work in `apps/web/`: also follow its local `AGENTS.md`, including the Next.js documentation requirement.

Detailed guidance supplements this file. If instructions conflict, preserve the always-applicable rules above and the user's current request.
