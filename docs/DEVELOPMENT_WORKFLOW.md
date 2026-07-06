# Development Workflow

## Working Principle

Ship features the owner will **use in production**, in small steps.

Focus on keeping the daily-use flow reliable: Google auth → policy-aware analysis → real formats → queue/worker → local file delivery → history/account. Keep policy and security rules non-negotiable; skip tutorial-only polish unless it unblocks real usage.

---

## Recommended Loop

```text
1. Read AGENTS.md and TODO.md — pick the next unchecked task toward daily use
2. Make a small, testable change
3. Run local verification (docker compose, pnpm dev, curl /health)
4. Update TODO.md when the task is done
5. Move to the next task
```

When keys or dashboard settings are needed, pause and follow `docs/USER_SETUP_GUIDE.md`. Never paste secrets into chat.

---

## When Keys Are Needed

Say:

```text
This step needs a key or dashboard setting.
Please follow docs/USER_SETUP_GUIDE.md section X.
Add the value to .env.local or your deployment dashboard.
After adding it, tell me "added". I will validate without reading the value.
```

---

## What the Owner Does

- Create and maintain Supabase project
- Configure Google OAuth
- Copy keys into `.env.local` (and Vercel env when deploying)
- Run Docker and frontend locally
- Confirm when setup steps are complete

---

## What Contributors / Agents Do

- Implement the remaining verified items in `TODO.md`
- Keep docs accurate when behavior changes
- Run health checks and safe env validation (OK / Missing / Invalid only)
- Never print secret values

---

## Safe Validation Output

Correct:

```text
NEXT_PUBLIC_SUPABASE_URL: OK
NEXT_PUBLIC_SUPABASE_ANON_KEY: OK
SUPABASE_SERVICE_ROLE_KEY: OK
No secret values were printed.
```

Incorrect:

```text
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

---

## Branching Suggestion

```text
main
feature/quality-polish
feature/deploy-validation
feature/cloud-storage-optional
```

---

## Commit Style

```text
feat(web): refine history save flow
feat(api): add retry endpoint
fix(worker): preserve cancelled status during cleanup
```

---

## Local runtime

Default development stack:

```bash
# API (required for analyze + jobs)
docker compose up --build api

# Frontend
cd apps/web && pnpm dev

# Worker
docker compose --profile worker up --build
```

- Frontend: `http://localhost:3000`
- API: `http://localhost:8000`
- Media temp files: `./tmp` (Docker volume)

Do not deploy the backend to Vercel. Vercel is for the Next.js frontend only.
