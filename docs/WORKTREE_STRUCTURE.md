# Worktree Structure

This is the recommended final project structure after implementation.

The real project must be generated inside the work package as `./media-loader`. Do not mix generated source code with the planning documents at the work package root.

```text
media-loader-agent-workpack/
└─ media-loader/
   ├─ docker-compose.yml
   ├─ .dockerignore
   ├─ apps/
   │  ├─ web/
   │  │  ├─ app/
   │  │  │  ├─ (auth)/
   │  │  │  ├─ dashboard/
   │  │  │  ├─ history/
   │  │  │  ├─ settings/
   │  │  │  └─ page.tsx
   │  │  ├─ components/
   │  │  │  ├─ ui/
   │  │  │  ├─ layout/
   │  │  │  └─ shared/
   │  │  ├─ features/
   │  │  │  ├─ auth/
   │  │  │  ├─ analyzer/
   │  │  │  ├─ downloads/
   │  │  │  ├─ history/
   │  │  │  └─ settings/
   │  │  ├─ lib/
   │  │  │  ├─ supabase/
   │  │  │  ├─ api/
   │  │  │  ├─ validators/
   │  │  │  └─ utils/
   │  │  └─ package.json
   │  │
   │  ├─ api/
   │  │  ├─ app/
   │  │  │  ├─ main.py
   │  │  │  ├─ api/
   │  │  │  │  └─ routes/
   │  │  │  ├─ core/
   │  │  │  ├─ schemas/
   │  │  │  ├─ services/
   │  │  │  └─ tests/
   │  │  ├─ Dockerfile
   │  │  └─ pyproject.toml
   │  │
   │  └─ worker/
   │     ├─ worker/
   │     │  ├─ main.py
   │     │  ├─ config.py
   │     │  ├─ services/
   │     │  ├─ tasks/
   │     │  └─ tests/
   │     ├─ Dockerfile
   │     └─ pyproject.toml
   │
   ├─ supabase/
   │  ├─ migrations/
   │  ├─ schema.sql
   │  └─ rls_policies.sql
   │
   ├─ docs/
   ├─ prompts/
   ├─ scripts/
   ├─ examples/
   ├─ README.md
   ├─ AGENTS.md
   ├─ TODO.md
   ├─ .env.example
   └─ package.json
```

---

## Folder Rules

### `apps/web`

Only frontend code.

Do not place server secrets here unless they are used in server-only runtime and never exposed to the browser.

### `apps/api`

FastAPI service for API logic. This service runs locally in Docker during development and exposes `http://localhost:8000`.

### `apps/worker`

Media worker only. This service runs locally in Docker and must not be exposed publicly.

### `supabase`

SQL schema, migrations, seed, and RLS policy files.

### `docs`

Human and Agent documentation.

### `prompts`

Role-specific AI Agent instructions.

### `docker-compose.yml`

Defines local Docker services for `api` and `worker`. Do not add Supabase keys directly inside this file; read them from `.env.local`.
