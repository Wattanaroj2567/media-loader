# AGENTS.md

Central rules, constitution, and documentation index for every AI Agent working on the Media Loader project.

All agents must read this file before making any changes.

---

## 1. Project Identity & Architecture Root

Media Loader is a personal, rights-aware media loading web application for daily use.

Source code lives strictly at the repository root:

```text
apps/web/      → Next.js 16 frontend (React 19, Tailwind v4, Drizzle ORM)
apps/api/      → FastAPI backend (Python 3.12, URL analysis & policy engine)
apps/worker/   → Python media worker (Queue polling, yt-dlp, FFmpeg conversion)
supabase/      → PostgreSQL schema, RLS policies, and database migrations
docs/          → Comprehensive architectural, API, and setup documentation
```

Do not create nested repository copies. Edit files in place under this repo root.

---

## 2. Non-Negotiable Core Rules (Constitution)

Every agent must strictly adhere to these 4 non-negotiable rules:
Every agent must strictly adhere to these non-negotiable rules:

### A. Non-Bypass & Rights-Aware Policy

- **Never bypass protections**: No DRM bypass, no login wall circumvention, no private/copyrighted content downloading without permission.
- **No browser cookies**: Never use browser cookies to access restricted content.
- **Strict Flow**: Every URL must follow: `URL input → Validation → Policy Check → Analysis → Rights Confirmation → Queue → Worker`. Never implement direct downloads.

### B. Zero Secret Leakage Policy

- **Strictly deny access to `.env` files**: Never read, print, view, edit, or commit any `.env*` file or secret token.
- Never log or print secret keys in chat, console logs, or artifacts.
- Frontend code must never contain `SUPABASE_SERVICE_ROLE_KEY` or OAuth client secrets.

### C. Package Manager Constraints

- **Python**: Always use `uv` (`uv venv`, `uv pip install`, `uv run`, `uv lock`, `uv sync`). **Never use `pip` directly**.
- **Node.js**: Always use `pnpm` (`pnpm install`, `pnpm dev`, `pnpm --filter ...`). **Never use `npm` or `yarn`**.

### D. Database Single Source of Truth

- `apps/web/lib/db/schema.ts` is the **single source of truth** for database tables and columns using **Drizzle ORM**.
- Never create or alter application tables with raw SQL. Raw SQL in `supabase/` is reserved only for RLS policies, triggers, and PostgreSQL functions.

### E. Markdown Linting Mandate

- Whenever creating or editing Markdown files (`*.md`), agents **MUST** run `pnpm lint:md` (or `pnpm lint:md:fix`) to verify and auto-format clean markdown syntax.
- Never commit Markdown files with missing blank lines around headings, bad list indentation, or broken tables.

### F. Dead Code Elimination Mandate

- Whenever creating, editing, or refactoring code, agents **MUST** run `pnpm deadcode` (`knip` for Web, `vulture` for API & Worker) to detect and remove dead code.
- Never leave behind unused exports, orphaned variables, unreferenced helper functions, or dead imports. Clean them up immediately.

### G. Verification Before Completion Mandate

- **No completion claims without fresh verification evidence**: Never claim a task, fix, or refactor is complete without running the corresponding verification commands in the current turn.
- Always inspect exit codes and error logs. Never assume code "should work" or "looks right". Prove it with execution.

---

## 3. 🗺️ AI Documentation Map (Progressive Disclosure Router)

Before starting work in any domain, agents **MUST** inspect the relevant specification below:

| Domain / Task | Specification File | Purpose & Contents |
|---|---|---|
| **System Overview & Flow** | [docs/en/ARCHITECTURE.md](docs/en/ARCHITECTURE.md) | Blueprint, component boundaries, request flows, status model |
| **API Endpoints & Contracts** | [docs/en/API_SPEC.md](docs/en/API_SPEC.md) | FastAPI route schemas, request/response models |
| **Database & Migrations** | [docs/en/DATABASE_SCHEMA.md](docs/en/DATABASE_SCHEMA.md) | Table structures, column definitions, Drizzle vs Supabase rules |
| **Security & Policy Rules** | [docs/en/SECURITY_AND_POLICY.md](docs/en/SECURITY_AND_POLICY.md) | SSRF prevention, restricted yt-dlp parameters, platform policies |
| **Row Level Security** | [docs/en/SUPABASE_RLS_POLICY.md](docs/en/SUPABASE_RLS_POLICY.md) | Supabase PostgreSQL user isolation and RLS policies |
| **Dev Commands & Testing** | [docs/en/DEVELOPER_GUIDE.md](docs/en/DEVELOPER_GUIDE.md) | Local run commands (`pnpm dev`), linting, and testing workflows |
| **Tunnel & Deployment** | [docs/en/CLOUDFLARE_TUNNEL_GUIDE.md](docs/en/CLOUDFLARE_TUNNEL_GUIDE.md) | Cloudflare Tunnel setup, Docker Compose, production container rules |
| **Environment Variables** | [docs/en/ENVIRONMENT_VARIABLES.md](docs/en/ENVIRONMENT_VARIABLES.md) | Environment variable definitions, defaults, and validation |
| **Secrets Protocol** | [docs/en/SECRETS_PROTOCOL.md](docs/en/SECRETS_PROTOCOL.md) | Zero-leakage protocol and secret handling guidelines |
| **Google OAuth Setup** | [docs/en/GOOGLE_OAUTH_SETUP.md](docs/en/GOOGLE_OAUTH_SETUP.md) | Supabase Google Auth configuration steps |
| **Vercel Deployment** | [docs/en/VERCEL_SETUP.md](docs/en/VERCEL_SETUP.md) | Frontend Next.js deployment to Vercel |

*(For Thai documentation, see corresponding files in `docs/th/`)*

---

## 4. Git Commit Guidelines

### Explicit Commit Approval Rule (Strict)

- **Never commit automatically**: Agents must **NEVER** stage or commit changes without explicit instruction or approval from the user (e.g. user explicitly says "commit", "บันทึก commit", or "สั่งให้ commit").
- **Editing code != committing code**: Making code edits, refactors, or bug fixes does NOT mean committing right away.
- **Unauthorized commit cancellation**: If an agent commits changes without explicit user approval, the commit must be immediately undone/reset (`git reset`). Always wait for the user's explicit command.

### Format & Conventions

All agents must follow the Conventional Commits format:

```text
<type>(<scope>): <subject>

[optional body]
```

- **Allowed Types**: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`
- **Allowed Scopes**: `(web)`, `(api)`, `(worker)`, `(db)`, `(deploy)`, `(deps)`, `(ci)`, `(docs)`
- **Rules**: Lowercase, imperative mood, concise (≤ 72 chars), atomic domain commits.

---

## 5. Definition of Done

A task is done only when:

1. Code matches the system architecture and design guidelines.
2. No secrets are exposed or committed.
3. Policy and non-bypass checks are strictly preserved.
4. Error handling is clear and user-facing behavior is verified.
5. Relevant documentation under `docs/` is updated if behavior changes.
6. **Code Quality & Verification Commands must pass with verified evidence**:
   - `pnpm lint` (ESLint for Web, Ruff for API & Worker, Markdownlint for Docs)
   - Formatting is clean (`prettier` and `ruff format`)
6. **Code Quality, Formatting, & Dead Code Verification commands must pass with verified evidence**:
   - `pnpm deadcode` (Knip for Web, Vulture for API & Worker: 0 dead code/unused exports)
   - `pnpm format` (Prettier and Ruff format: clean code style across all services)
   - `pnpm lint` (ESLint for Web, Ruff for API & Worker, Markdownlint for Docs: 0 errors)
   - `pnpm lint:md` (Markdown files pass clean linting: 0 issues)
   - `pnpm build` (TypeScript compilation and Next.js build pass with zero errors)
   - Automated tests pass (`pnpm test:api`, `pnpm test:worker`, `pnpm test:web`)
   - Automated tests pass (`pnpm test:web`, `pnpm test:api`, `pnpm test:worker`)
7. **Git safety confirmed**: Changes remain unstaged until the user explicitly commands a commit.
