# Developer Onboarding & Architecture Guide

> **Language:** **English** · [ภาษาไทย](../th/DEVELOPER_GUIDE.md)

Welcome to the Media Loader developer documentation hub. This guide provides a comprehensive overview for developers working on or contributing to the codebase.

---

## 1. Project Architecture Overview

Media Loader is structured as a decoupled monorepo:

```text
media-loader/
├── apps/
│   ├── web/                 # Next.js 16 Frontend (App Router, Tailwind, Drizzle)
│   ├── api/                 # FastAPI Backend Service (URL analysis & Policy engine)
│   └── worker/              # Python Media Worker (Queue listener, yt-dlp, FFmpeg)
├── apps/web/lib/db/
│   └── schema.ts            # Source of truth for application tables and columns
├── supabase/
│   ├── rls_policies.sql     # Supabase Row Level Security policies
│   ├── profile_trigger.sql  # Auth-to-profile PostgreSQL function and trigger
│   └── migrations/          # Historical bootstrap migrations; do not extend
└── docs/                    # Architectural specs and setup guides
```

### Data Flow Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Web as Web App (Next.js)
    participant API as FastAPI Backend
    participant DB as Supabase DB (Postgres)
    participant Worker as Media Worker (Python)
    participant Storage as Supabase Storage / Local Temp

    User->>Web: Paste Media URL
    Web->>API: POST /media/analyze (URL)
    API->>API: Run SSRF & Policy Checks
    API-->>Web: Return Media Formats & Metadata
    User->>Web: Select Format, confirm rights, and queue
    Web->>API: POST /downloads
    API->>API: Revalidate URL, policy, analysis, and format
    API->>DB: Insert Job (Status: QUEUED, target worker pool)
    Worker->>DB: Claim a QUEUED Job from its pool
    Worker->>Worker: Download & Process via yt-dlp / FFmpeg
    Worker->>Storage: Store Output in Local Temp / Optional Storage
    Worker->>DB: Update Job (Status: COMPLETED)
    Web->>API: Request authenticated file delivery
    API->>User: Stream owner-scoped completed file
```

---

## 2. Developer Command Reference

All primary development tasks can be run directly from the repository root directory using `pnpm`:

### Environment & Dependencies

```bash
# Copy local environment template
cp .env.example .env.local

# Install Node & Python dependencies across monorepo
pnpm install
pnpm setup:py

# Validate environment variables without printing secrets
pnpm check-env
```

### Running Local Development Servers

```bash
# Default: Web, FastAPI with reload, and Worker in one terminal
pnpm dev

# Same stack, but tee all service logs into tmp/dev.log (git-ignored)
# so AI agents can tail them later: pnpm dev:log
```

Use `pnpm dev:web`, `pnpm dev:api`, or `pnpm dev:worker` only when isolating a
service. After a change is stable, run `pnpm docker:up` for a production-like
API/worker integration check. Docker is not the default edit loop.

### Testing

```bash
# Run unit tests across services
pnpm test:web       # Next.js frontend (Node test runner)
pnpm test:api       # FastAPI backend (pytest)
pnpm test:worker    # Python Media Worker (pytest)

# Run E2E tests
pnpm test:e2e       # Frontend mock E2E (Playwright)
pnpm test:api:e2e   # Python API/Worker integration script
```

### Code Quality (Linting & Formatting)

```bash
# Run lint checks across all services (ESLint + Ruff + Markdownlint)
pnpm lint

# Or run per-service:
pnpm lint:web       # Next.js (ESLint)
pnpm lint:api       # FastAPI (Ruff)
pnpm lint:worker    # Media Worker (Ruff)
pnpm lint:md        # Markdown files (markdownlint-cli2)
pnpm lint:md:fix    # Auto-fix Markdown formatting

# Format code automatically (Prettier + Ruff Format)
pnpm format
pnpm format:web     # Prettier
pnpm format:api     # Ruff format
pnpm format:worker  # Ruff format
```

### Dead Code Audit

```bash
# Audit unused files, exports, and functions (Knip + Vulture)
pnpm deadcode

# Or run per-service:
pnpm deadcode:web     # Next.js (Knip: unused files/exports/packages)
pnpm deadcode:api     # FastAPI (Vulture: unused functions/classes/variables)
pnpm deadcode:worker  # Worker (Vulture)
```

### Database Operations (Drizzle ORM)

```bash
# Push schema updates to Supabase / PostgreSQL
pnpm --filter web db:push
```

---

## 3. Documentation Index

Detailed domain-specific specifications are available in this directory:

| Document | Purpose |
| :--- | :--- |
| **[USER_SETUP_GUIDE.md](USER_SETUP_GUIDE.md)** | Step-by-step instructions for getting credentials from Supabase & Google Cloud. |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | Complete system design, component boundaries, and security model. |
| **[API_SPEC.md](API_SPEC.md)** | FastAPI REST API endpoints, request schemas, and response formats. |
| **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)** | Database tables, relationships, status models, and Drizzle ORM setup. |
| **[SECURITY_AND_POLICY.md](SECURITY_AND_POLICY.md)** | Non-bypass rights validation rules, SSRF protection, and policy engine specs. |
| **[SUPABASE_RLS_POLICY.md](SUPABASE_RLS_POLICY.md)** | Row Level Security (RLS) policies for user data isolation. |
| **[ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md)** | Full listing of required and optional environment variables. |
| **[GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md)** | Guide to configuring Google OAuth in Supabase Dashboard. |
| **[VERCEL_SETUP.md](VERCEL_SETUP.md)** | Guide to deploying the Next.js frontend to Vercel. |
| **[SECRETS_PROTOCOL.md](SECRETS_PROTOCOL.md)** | Zero-secret leakage protocol for developers and AI agents. |

---

## 4. Status Model Lifecycle

Jobs in Media Loader follow a strict state transition flow:

```text
PENDING ──> ANALYZING ──> READY ──> QUEUED ──> DOWNLOADING ──> CONVERTING ──> UPLOADING ──> COMPLETED

ANY STATUS ──> FAILED
ANY STATUS ──> BLOCKED
QUEUED / DOWNLOADING / CONVERTING ──> CANCELLED
```

---

## 5. Development Rules & Guidelines

1. **Package Managers**:
   - Always use `pnpm` for Node.js package management and script execution.
   - Always use `uv` for Python package installation, virtualenv management, and running Python scripts (`uv venv`, `uv pip install`, `uv run`).
2. **Secrets Handling**:
   - Never print or log secret credential values (e.g., `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_SECRET`).
   - Never commit `.env.local` to git repository.
3. **Rights Compliance**:
   - Never implement DRM bypass, paywall bypass, or login-wall bypassing logic.
   - All URLs must pass policy validation before analysis or downloading.
