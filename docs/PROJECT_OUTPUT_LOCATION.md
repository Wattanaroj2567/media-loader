# Project Root Location

## Current layout

This repository root **is** the Media Loader application. All source code lives here:

```text
media-loader/                 ← repo root (you are here)
├─ apps/
│  ├─ web/                    # Next.js frontend
│  ├─ api/                    # FastAPI backend
│  └─ worker/                 # Python worker
├─ supabase/
├─ docs/
├─ docker-compose.yml
├─ .env.example
└─ package.json
```

There is no separate nested `./media-loader` folder to create. Agents and contributors should edit files under this root.

---

## Verification

Before starting work, confirm:

```text
Current directory: media-loader (repo root)
apps/web exists: OK
apps/api exists: OK
docker-compose.yml exists: OK
```

---

## Historical note

Earlier versions of this project described a "work package" that generated code into a child `./media-loader` directory. That layout is **deprecated**. The monorepo was consolidated to the repo root for simpler daily development and deployment.

If you see old docs referencing `media-loader-agent-workpack/` or "create the real project inside `./media-loader`", treat them as outdated and follow this file instead.
