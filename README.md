# Media Loader

<p align="center">
  <img src="apps/web/public/brand/media-loader-mark.svg" alt="Media Loader logo" width="112">
</p>

<p align="center"><strong>Rights-aware media processing for personal use.</strong></p>

<p align="center">
  Analyze supported media URLs, review available formats, queue authorized jobs,
  and manage completed files through one web application.
</p>

<p align="center">
  <a href="docs/en/DEVELOPER_GUIDE.md">Developer guide</a> ·
  <a href="docs/en/ARCHITECTURE.md">Architecture</a> ·
  <a href="docs/en/VERCEL_SETUP.md">Deployment</a>
</p>

<p align="center"><strong>English</strong> · <a href="README.th.md">ภาษาไทย</a></p>

---

## Overview

Media Loader is a personal-use web application for analyzing eligible media
URLs and managing authorized media processing. The web interface sends requests
to a policy-aware API, while a separate worker handles media processing. Supabase
provides authentication and PostgreSQL storage.

The application follows a rights-aware workflow:

```text
URL input → Validation → Policy check → Analysis → Rights confirmation → Queue → Worker
```

## Principles

- **Respect rights and access controls.** Process only media you are authorized
  to use. The application does not bypass DRM, login walls, or other protections.
- **Keep services isolated.** The API validates URLs and policy; the worker
  handles media processing; the web app presents the user interface.
- **Protect user data.** Authenticated operations are scoped to the user, with
  PostgreSQL Row Level Security (RLS) supporting data isolation.

## Architecture

| Component | Responsibility | Deployment |
| --- | --- | --- |
| `apps/web` | Next.js web application | Vercel |
| `apps/api` | FastAPI URL analysis, policy checks, and job creation | Separate container host |
| `apps/worker` | Queue polling and media processing with yt-dlp and FFmpeg | Worker host with access to its media volume |
| `supabase` | Authentication, PostgreSQL, and Row Level Security | Supabase |

Vercel hosts the frontend only. The API and worker run separately; the worker
does not run inside Vercel Functions.

<p align="center">
  <a href="docs/diagrams/media-loader-architecture.svg">
    <img src="docs/diagrams/media-loader-architecture.svg" alt="Media Loader architecture diagram" width="100%">
  </a>
</p>

## Getting Started

### Prerequisites

- Node.js 22.13 or later and pnpm 11 or later
- Python 3.12 and `uv`
- FFmpeg
- Supabase project configuration for the services you plan to run

### Install dependencies

Run these commands from the repository root:

```bash
pnpm install
pnpm setup:py
```

### Configure the environment

Create a local environment file from the example and set the values described
in the [environment variables guide](docs/en/ENVIRONMENT_VARIABLES.md).

```bash
# macOS and Linux
cp .env.example .env.local

# PowerShell
Copy-Item .env.example .env.local
```

Validate the configuration with `pnpm check-env`. Keep local environment files
and credentials out of version control.

### Run the application

Start the web app, API, and worker from the repository root:

```bash
pnpm dev
```

The web app runs at `http://localhost:3000` and the API runs at
`http://localhost:8000`. For service-specific commands and setup details, see
the [developer guide](docs/en/DEVELOPER_GUIDE.md).

## Development Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the web app, API, and worker for local development |
| `pnpm dev:web` | Start only the Next.js web app |
| `pnpm dev:api` | Start only the FastAPI service |
| `pnpm dev:worker` | Start only the media worker |
| `pnpm lint` | Run lint checks across the repository |
| `pnpm deadcode` | Audit unused code across the repository |
| `pnpm build` | Build the Next.js web app |
| `pnpm test:web` | Run web unit tests |
| `pnpm test:api` | Run API tests |
| `pnpm test:worker` | Run worker tests |

## Documentation

- [Developer guide](docs/en/DEVELOPER_GUIDE.md)
- [System architecture](docs/en/ARCHITECTURE.md)
- [API specification](docs/en/API_SPEC.md)
- [Database schema](docs/en/DATABASE_SCHEMA.md)
- [Security and rights policy](docs/en/SECURITY_AND_POLICY.md)
- [Supabase Row Level Security](docs/en/SUPABASE_RLS_POLICY.md)
- [Environment variables](docs/en/ENVIRONMENT_VARIABLES.md)
- [Vercel deployment](docs/en/VERCEL_SETUP.md)
- [Cloudflare Tunnel setup](docs/en/CLOUDFLARE_TUNNEL_GUIDE.md)

## Responsible Use

Use Media Loader only with content you have permission to process, and follow
the applicable platform terms and laws. The application does not use browser
cookies to access restricted content or implement protection bypasses.
