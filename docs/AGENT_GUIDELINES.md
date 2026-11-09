# Media Loader Agent Guidelines

Detailed project rules referenced by the root `AGENTS.md`. Read the sections that match your task; consult the documentation map before changing a domain-specific system.

## Architecture and project boundaries

- `apps/web/`: Next.js 16 frontend, React 19, Tailwind v4, Drizzle ORM.
- `apps/api/`: FastAPI backend for URL analysis and policy enforcement.
- `apps/worker/`: Python queue worker using yt-dlp and FFmpeg within the rights-aware policy.
- `supabase/`: RLS policies, triggers, functions, and migrations.
- `docs/`: architecture, API, setup, and operational documentation.
- Keep source at the repository root. Do not create nested repository copies.

## Rights-aware policy and secrets

- Every URL follows: input → validation → policy check → analysis → rights confirmation → queue → worker.
- Never bypass DRM, login walls, or access controls. Do not use browser cookies to retrieve restricted content. Do not implement direct downloads outside the required queue and rights-confirmation flow.
- Never directly open, print, search, edit, copy, or commit real `.env` files or files containing actual credentials. Do not log or expose secret values. Normal build, test, and development commands may load environment files automatically when required; do not inspect or print loaded values. Placeholder-only examples such as `.env.example` may be read or edited; never put real values in them.
- Never place Supabase service-role keys or OAuth client secrets in frontend code or variables prefixed with `NEXT_PUBLIC_`; Next.js inlines those public variables into browser JavaScript during build.

## Package managers and database source of truth

- Python commands and dependency management use `uv` (`uv run`, `uv sync`, `uv pip`, `uv lock`). Do not invoke `pip` directly.
- Node.js commands and dependency management use `pnpm`. Do not use `npm` or `yarn`.
- `apps/web/lib/db/schema.ts` defines application tables and columns. Use Drizzle and the repository's migration workflow for application schema changes. Raw SQL in `supabase/` is limited to policies, triggers, and PostgreSQL functions.

## UI implementation

- Reuse components from `apps/web/components/ui/` and shared components before creating new ones. If an interaction pattern appears on multiple pages, extract a shared component.
- Keep focus, hover, active, and icon micro-interaction states consistent. Use semantic buttons or `<summary>` for disclosures; navigation links may use navigation hover cues. Do not style disclosures as links.
- Interactive pills use the project's consistent transition, hover, and focus-ring treatment. Inputs and textareas disable resizing; place character counters so they do not overlap entered text.
- Follow existing app tokens in `apps/web/app/globals.css`; do not introduce a parallel design-token system or arbitrary one-off styles.
- For UI work, read `.agents/skills/ui-styling/SKILL.md`. Use `.agents/skills/ui-ux-pro-max/SKILL.md` and `.agents/skills/taste-skill/SKILL.md` when they help with design direction, aesthetic constraints, UX review, or broader improvements. These are workspace skills; unrelated skills are not required.
- During rapid UI iteration, prioritize relevant quick checks such as `pnpm lint:web` and `pnpm build:web`. Defer full test suites until a milestone or explicit user request. At milestone handoff, run the applicable full verification suite.

## Documentation map

Before changing a domain, read its specification. Thai equivalents are under `docs/th/`.

| Domain                           | Specification                                                       |
| -------------------------------- | ------------------------------------------------------------------- |
| Architecture and system flow     | [docs/en/ARCHITECTURE.md](en/ARCHITECTURE.md)                       |
| API endpoints and contracts      | [docs/en/API_SPEC.md](en/API_SPEC.md)                               |
| Database schema and migrations   | [docs/en/DATABASE_SCHEMA.md](en/DATABASE_SCHEMA.md)                 |
| Security and policy rules        | [docs/en/SECURITY_AND_POLICY.md](en/SECURITY_AND_POLICY.md)         |
| Supabase RLS                     | [docs/en/SUPABASE_RLS_POLICY.md](en/SUPABASE_RLS_POLICY.md)         |
| Development commands and tests   | [docs/en/DEVELOPER_GUIDE.md](en/DEVELOPER_GUIDE.md)                 |
| Tunnel and deployment            | [docs/en/CLOUDFLARE_TUNNEL_GUIDE.md](en/CLOUDFLARE_TUNNEL_GUIDE.md) |
| Environment variable definitions | [docs/en/ENVIRONMENT_VARIABLES.md](en/ENVIRONMENT_VARIABLES.md)     |
| Secrets protocol                 | [docs/en/SECRETS_PROTOCOL.md](en/SECRETS_PROTOCOL.md)               |
| Google OAuth                     | [docs/en/GOOGLE_OAUTH_SETUP.md](en/GOOGLE_OAUTH_SETUP.md)           |
| Vercel deployment                | [docs/en/VERCEL_SETUP.md](en/VERCEL_SETUP.md)                       |

## Verification and completion

- For every task that changes project files, update the root `CHANGELOG.md` in the same task with the complete change set, grouped under applicable standard categories. Skip only edits that change the changelog alone.
- Never claim a change is complete without fresh verification evidence. Check exit codes and relevant output; follow `.agents/skills/verification-before-completion/SKILL.md`. For bug diagnosis, follow `.agents/skills/systematic-debugging/SKILL.md`. For security evaluations, follow `.agents/skills/security-audit/SKILL.md`. For managing repository skills, follow `.agents/skills/skill-creator/SKILL.md`.
- Every code change requires `pnpm deadcode` plus relevant format, lint, build, and tests. Markdown edits require `pnpm lint:md`.
- Before final task handoff or milestone completion, run the repository-wide suite: `pnpm deadcode`, `pnpm format`, `pnpm lint`, `pnpm lint:md`, `pnpm build`, `pnpm test:web`, `pnpm test:api`, and `pnpm test:worker`. Report any command that cannot run or fails; do not claim full verification passed unless all applicable commands pass.
- During rapid user-directed UI iteration, run quick checks such as `pnpm lint:web` and `pnpm build:web`; defer heavy test suites until the milestone or an explicit user request.
- Continuous integration employs path filtering: documentation-only changes skip heavy build and test pipelines to accelerate review and merge workflows.

## Git safety and commit format

- This project follows GitHub Flow with `master` as the primary integration and release branch. Create short-lived topic branches (e.g. `feat/*`, `fix/*`, `chore/*`) from `master`, open a pull request targeting `master`, and merge once checks pass. Delete topic branches after merging.
- CI, CodeQL, and Dependabot pull requests target `master`.
- Do not stage or commit unless the user explicitly instructs it. Editing code does not imply commit approval.
- When explicitly asked to commit, use Conventional Commits: `<type>(<scope>): <subject>`, lowercase, imperative, concise (72 characters or fewer). Allowed types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`. Allowed scopes: `web`, `api`, `worker`, `db`, `deploy`, `deps`, `ci`, `docs`.
- When creating pull requests via CLI, always supply descriptions using `--body-file` to avoid shell escape-character corruption (such as `\t` or `\v` inside backticks). Always include relevant metadata: assign the author (`--add-assignee "@me"`) and attach appropriate labels (e.g. `documentation`, `enhancement`, `bug`, `dependencies`). Format descriptions cleanly with structured tables and checklists, and verify all required CI/CD status checks pass before merging.
