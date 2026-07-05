# Media Loader

A personal, rights-aware media downloader and converter.

## Project Structure

This project is set up as a monorepo using **pnpm workspaces**:

- `apps/web` - Next.js frontend application (Vercel deployment)
- `apps/api` - FastAPI backend application running locally in Docker
- `apps/worker` - Python-based media worker running locally in Docker

## Setup

1. Copy `.env.example` to `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

2. Fill in local variables in `.env.local` (do not commit this file).

3. Install frontend dependencies:

   ```bash
   pnpm install
   ```

4. Start backend services via Docker Compose:

   ```bash
   docker compose up --build
   ```

5. Verify environment setup:

   ```bash
   pnpm run check-env
   ```

## Reference Documentation

Refer to the local docs in `./docs` for details on database schemas, RLS policies, secrets handling, and setup guides.
