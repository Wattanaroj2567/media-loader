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

### 3. Run All Services with One Command

Run Next.js Web UI, FastAPI Backend, and Python Media Worker all together in a single terminal window:

```bash
# Run all 3 services concurrently in 1 terminal
pnpm dev
```

> **Prefer separate terminals or Docker?**
> * **Separate Terminals**: Run `pnpm dev:web`, `pnpm dev:api`, or `pnpm dev:worker` individually.
> * **Docker Mode**: Run `docker compose --profile worker up --build`.

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

<p align="center">
  <a href="docs/diagrams/media-loader-architecture.svg" target="_blank">
    <img alt="Media Loader System Architecture" src="docs/diagrams/media-loader-architecture.svg" width="100%">
  </a>
</p>
<p align="center"><sub>💡 <em>Click on the diagram to open full-resolution vector SVG</em></sub></p>

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
* **[Oracle Cloud Deployment Guide](docs/en/OCI_DEPLOYMENT_GUIDE.md)** — Run Backend & Worker 100% free on OCI Always Free with Keep-Alive.
* **[Secrets Protocol](docs/en/SECRETS_PROTOCOL.md)** — Zero-leakage protocol guidelines for developers and AI agents.

---

## License & Policy

* **Private Repository**: For personal use only.
* **Rights Compliance**: Respects platform Terms of Service and enforces rights checking at the policy layer.
