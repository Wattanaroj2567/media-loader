# Media Loader

[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2016-black?style=flat-square&logo=next.dot.js)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)
[![Docker](https://img.shields.io/badge/Runtime-Docker%20Compose-2496ED?style=flat-square&logo=docker)](https://www.docker.com)
[![License](https://img.shields.io/badge/License-Private-red?style=flat-square)](#)

[English](README.md) | [ภาษาไทย](README.th.md)

A premium, private, rights-aware media downloader & converter application built for personal daily use. Analyze media URLs, select video/audio quality, queue download/conversion tasks, and manage files securely via a modern dark command-center interface.

---

## Quick Start

Get the entire monorepo stack running locally in simple steps:

### 1. Prerequisites
Ensure you have Node.js (v18+), pnpm (`npm install -g pnpm`), Python 3.12+, `uv`, and FFmpeg installed.

### 2. Setup Environment & Dependencies
```bash
# 1. Copy environment template
cp .env.example .env.local

# 2. Install Node & Python dependencies (from monorepo root)
pnpm install
pnpm setup:py
```

### 3. Run Development Servers

#### Option A: Local Development Mode (3 Terminals)
Run the services in separate terminal windows at the repository root:

```bash
# Terminal 1: Next.js Web UI (http://localhost:3000)
pnpm dev:web

# Terminal 2: FastAPI Backend API (http://localhost:8000)
pnpm dev:api

# Terminal 3: Python Media Worker
pnpm dev:worker
```

#### Option B: Local Docker Backend Mode
Run the FastAPI backend and Media Worker via Docker Compose:

```bash
# Run API and Worker in local Docker containers
docker compose --profile worker up --build
```

> [!TIP]
> Run `pnpm check-env` at any time to validate your environment configuration without leaking secret values.

---

## Key Features

* **Command Center UI**: Modern dark dashboard with sharp typography (Inter/Outfit), responsive design, and Google OAuth login via Supabase Auth.
* **Smart URL Analyzer**: SSRF-safe URL validation, live format extraction, size estimation, and quality previews.
* **Decoupled Media Processing**: Isolated daemon worker handling downloads and FFmpeg audio/video transcoding with real-time speed tracking.
* **Privacy & Rights Guard**: Strict non-bypass policy enforcing rights checks, Postgres Row Level Security (RLS), and zero-secret leakage protocols.

---

## Architecture

```mermaid
graph TD
    User([User]) <--> WebApp["Next.js Frontend (Vercel)"]
    WebApp <--> Supabase["Supabase (Auth / PostgreSQL / Storage)"]
    WebApp <--> API["FastAPI API (Local / Docker)"]
    API <--> Supabase
    API <--> Queue[("Job Queue / DB")]
    Queue <--> Worker["Python Media Worker (Local / Docker)"]
    Worker <--> Tooling["yt-dlp / FFmpeg"]
    Worker --> Supabase
```

---

## Tech Stack

| Layer | Technology | Monorepo Path |
| :--- | :--- | :--- |
| **Frontend** | Next.js 16 (App Router), TypeScript, TailwindCSS | [`apps/web`](apps/web) |
| **Backend API** | FastAPI, Uvicorn, Python 3.12 | [`apps/api`](apps/api) |
| **Media Worker** | Python 3.12, yt-dlp, FFmpeg | [`apps/worker`](apps/worker) |
| **Database & Auth**| Supabase PostgreSQL, Supabase Auth | [`supabase`](supabase) |
| **Tooling** | `pnpm` (Node.js), `uv` (Python) | Monorepo Root |

---

## Documentation & Guides

Detailed guides are available in the [`docs/en/`](docs/en/DEVELOPER_GUIDE.md) directory:

* **[Developer Onboarding Guide](docs/en/DEVELOPER_GUIDE.md)** — Comprehensive architecture, command reference, sequence flow, and doc index.
* **[User Setup Guide](docs/en/USER_SETUP_GUIDE.md)** — Step-by-step Supabase & Google OAuth credentials setup.
* **[System Architecture](docs/en/ARCHITECTURE.md)** — In-depth blueprint, security boundary, and data flows.
* **[Vercel Deployment Guide](docs/en/VERCEL_SETUP.md)** — Host the frontend monorepo on Vercel.
* **[Secrets Protocol](docs/en/SECRETS_PROTOCOL.md)** — Zero-leakage protocol guidelines for developers and AI agents.

---

## License & Policy

* **Private Repository**: For personal use only.
* **Rights Compliance**: Respects platform Terms of Service and enforces rights checking at the policy layer.
