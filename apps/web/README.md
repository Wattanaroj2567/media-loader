# Media Loader Web

Next.js 16 frontend for Media Loader. It owns authentication UI, URL submission,
format selection, job progress, history, settings, and authenticated file delivery.
Media analysis and job creation always go through FastAPI; the browser does not
write server-managed queue or policy records directly.

## Development

Run commands from the repository root:

```bash
pnpm dev:web
pnpm --filter web lint
pnpm --filter web test
pnpm --filter web test:e2e:mock
pnpm --filter web build
```

Use `pnpm dev` when the web app, API, and worker should run together.

## Key Paths

- `app/` — App Router pages, layouts, and route handlers
- `components/` — shared interface components
- `lib/api-client.ts` — authenticated FastAPI client and contracts
- `lib/i18n/` — English and Thai locale configuration
- `lib/db/schema.ts` — single source of truth for application tables and columns
- `e2e/` — Playwright browser tests

## Database Changes

Define application tables, columns, constraints, and indexes in
`lib/db/schema.ts`. Use Drizzle commands from the repository root:

```bash
pnpm --filter web db:push
pnpm --filter web db:generate
```

Raw SQL under `supabase/` is reserved for Row Level Security policies,
PostgreSQL functions, triggers, and extensions.

## Documentation

- [Developer guide](../../docs/en/DEVELOPER_GUIDE.md)
- [Architecture](../../docs/en/ARCHITECTURE.md)
- [API specification](../../docs/en/API_SPEC.md)
- [Database schema](../../docs/en/DATABASE_SCHEMA.md)
- [Security and policy](../../docs/en/SECURITY_AND_POLICY.md)
