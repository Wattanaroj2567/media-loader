# Architecture Decision Record (ADR)

## ADR 01: Choice of Supabase Client & Raw SQL over Prisma ORM

### Context & Requirements
The Media Loader application is a multi-language monorepo:
1. **Frontend (`apps/web`):** Next.js (TypeScript) running on Vercel Serverless environment.
2. **Backend API (`apps/api`):** FastAPI (Python) orchestration layer running inside a local Docker container.
3. **Processing Worker (`apps/worker`):** Python worker service managing heavy processing (yt-dlp, FFmpeg transitions).
4. **Database:** Supabase PostgreSQL with strict Row Level Security (RLS) policies.

---

### Decision
We choose **Supabase JS Client** (frontend) and **Raw SQL schema migrations** (database management) over Prisma ORM.

---

### Consequences & Rationale

#### 1. Language Interoperability (Python + TypeScript)
- **Problem with Prisma:** Prisma is native to the Node.js/JS ecosystem. If database schemas are managed inside `schema.prisma`, syncing these structures with python backend models (SQLAlchemy/SQLModel) introduces duplication, sync lag, and engine dependency bloat.
- **Our Solution:** Managing schemas via standard SQL (`schema.sql` and `rls_policies.sql`) allows the migration path to remain language-independent. Both Python backend models and Next.js can reference the same database setup.

#### 2. Native RLS Policy Enforcement
- **Problem with Prisma:** Prisma connects to PostgreSQL using direct connection strings, bypassing Supabase Row Level Security by default because it logs in as a superuser/admin role. Obeying RLS inside Prisma requires custom raw transaction context setters for every query, increasing security risks.
- **Our Solution:** Supabase JS Client integrates directly with Supabase Auth, passing the user's JWT automatically. PostgreSQL validates `auth.uid() = user_id` natively on every single operation.

#### 3. Connection Limits in Serverless
- **Problem with Prisma:** Prisma holds direct TCP connection pools. In Serverless environments like Vercel, this quickly exhausts PostgreSQL connection limits (which are restricted on Supabase's Free Tier).
- **Our Solution:** Supabase client queries go through an API Gateway (PostgREST) over stateless HTTP/HTTPS requests, bypassing pool exhaustion limits entirely.

#### 4. Type Safety
- Instead of Prisma Client, we will run the **Supabase CLI Type Generator** to generate compile-time TypeScript models directly from the database schema:
  ```bash
  npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts
  ```
  This yields type safety identical to Prisma without connection or runtime overhead.

---

## ADR 02: Product focus — daily use over learning scaffold

### Context

Early docs described Media Loader as a learning project with a separate "work package" generating code into `./media-loader`. The repo now holds the full app at the root; the owner wants to **use the app**, not treat it as a tutorial.

### Decision

- Repo root is the single source of truth (`apps/` at root).
- Documentation prioritizes setup, daily-use checklist, and production validation after the local workflow is implemented.
- Deprecate nested work-package layout and "AI Agent Work Package" framing in user-facing README content.

### Consequences

- `docs/PROJECT_OUTPUT_LOCATION.md` documents repo-root layout only.
- `TODO.md` and `ROADMAP.md` mark the core local workflow complete and leave live deployment checks explicit.
- Contributors should keep policy, auth, worker, local delivery, and docs aligned before cosmetic or experimental work.
