# Architecture

> **Language:** **English** · [ภาษาไทย](../th/ARCHITECTURE.md)

## Overview

Media Loader separates the web app, API, worker, and checked egress proxy so
each service has a clear responsibility.

```text
apps/web      → Next.js frontend on Vercel
apps/api      → FastAPI URL policy, analysis, job, and file API
apps/worker   → Python worker for queued media processing
apps/proxy    → Public-IP egress proxy for user-derived requests
supabase      → Auth and PostgreSQL tables protected by RLS
```

The API and worker use the same local media-output volume in the default
`local_temp` mode. In Docker Compose, both containers mount the named
`media-output` volume. A worker on a different host must not claim jobs whose
files it cannot share with the API.

See the [architecture diagram](../diagrams/media-loader-architecture.html) or
[dark-mode diagram](../diagrams/media-loader-architecture-dark.html).

## Runtime modes

During local development, `pnpm dev` starts all three services from the
repository. Next.js and FastAPI reload after source changes.

```text
Next.js local dev → localhost:3000
FastAPI local dev → localhost:8000
Worker local dev  → polls and processes queued jobs
```

Docker Compose runs the API, worker, and egress proxy for production-like
integration or deployment on a container host. The API and worker run as the
non-root `media-loader` user, share a named media-output volume, and have no
direct internet route. User-derived requests go through the proxy, which checks
all DNS answers and connects to a validated public IP. Compose also runs a
one-shot, network-isolated output initializer before the API so the directory
is owned by UID/GID `10001`. Vercel hosts only the Next.js app and calls the API
over HTTPS.

```text
apps/web on Vercel       → HTTPS → containerized FastAPI
containerized API        → checked egress proxy → public source hosts
containerized worker     → checked egress proxy → public source hosts
containerized worker     → polls Supabase and writes to shared media output
containerized FastAPI    → serves authorized files from the same volume
```

## Why split the worker?

Media processing can take time and use substantial CPU, memory, and disk space.
The worker handles:

- yt-dlp extraction and media processing
- FFmpeg conversion and merging
- Temporary output files
- Job progress and status updates
- Retention cleanup for expired local outputs

This keeps heavy processing out of Vercel Functions and Supabase Edge Functions.

## Request flow

### Authentication

```text
User → Next.js → Supabase Auth → Dashboard
```

Signed-in API requests use the current Supabase access token.

Supabase Auth remains the authority for accounts and sessions. The web app offers
email/password login at `/auth/login` and registration at `/auth/register`.
Registration accepts an optional display name stored as `full_name` metadata;
it is not a username credential. Email signup stores the selected interface
language as `language` user metadata. When changed, the interface language is
persisted in localStorage and a one-year cookie. Successful password sign-in and auth
callback exchanges sync the account preference from that cookie, defaulting to
Thai when it is missing or invalid. The existing database trigger creates the
user profile. A signup with a session opens `/dashboard`; when email confirmation
is required, the page asks the user to check their email first.

Google sign-in is available on both pages. Google and email callbacks return to
`/auth/callback`, which exchanges the authorization code for a Supabase session.
The callback accepts a same-origin `next` destination only for `/dashboard`,
`/history`, `/settings`, `/downloads`, or `/auth/reset-password`, strips its query
and fragment, and otherwise falls back to `/dashboard`. Callback failures show a
safe error on the login or recovery page.

### Password recovery and sign-out

`/auth/forgot-password` requests a recovery email and always shows the same
neutral confirmation, including when the provider fails. The email link returns
through `/auth/callback?next=/auth/reset-password`. Open it in the browser that
requested recovery so the PKCE exchange can use that browser's verifier. The
recovery redirect includes only `next=/auth/reset-password`; it does not pass a
locale query parameter. The app does not select a language for the hosted
Supabase email template.

`/auth/reset-password` requires a verified authenticated session before updating
the password. After the update, the app signs out globally and opens
`/auth/login?reset=success` with a full navigation. If sign-out fails after the
password was changed, retry signs out again without repeating the password update.

`POST /auth/signout` always asks Supabase to sign out. It redirects to `/` with
status `303` on success; a provider failure returns `503` with a safe error code
and does not report a successful logout.

### Page access and provider setup

Middleware redirects anonymous visitors from `/dashboard`, `/history`,
`/downloads`, and `/settings` to `/`. Signed-in visitors to `/`, `/auth/login`,
`/auth/register`, and `/auth/forgot-password` go to `/dashboard`. Recovery remains
accessible and callback errors remain visible. Session cookies are preserved on
middleware redirects.

In the Supabase dashboard, enable the Email/Password and Google providers and
allowlist these exact redirect URLs for each web origin (replace the example
origin with the deployed origin):

- `http://localhost:3000/auth/callback`
- `http://localhost:3000/auth/callback?next=/auth/reset-password`

Provider setup is a manual dashboard prerequisite. The public flow is paste,
explicit sign-in action, authentication, restored link, analysis, format selection,
rights confirmation button, and queue creation. Same-tab session storage preserves the link
without placing it in authentication redirect query parameters.

### Analyze URL

```text
User submits URL
  ↓
Next.js calls FastAPI /media/analyze
  ↓
FastAPI validates URL, resolves both IP families, and applies policy
  ↓
FastAPI fetches source metadata through the checked egress proxy
  ↓
FastAPI extracts source metadata and available formats when allowed
  ↓
FastAPI returns the analysis result
```

Analysis requires a verified account before policy processing or source requests.
Policy decisions are associated with that account.

### Create job

```text
User chooses an available format and confirms rights
  ↓
Next.js calls FastAPI /downloads
  ↓
FastAPI revalidates URL, policy, analysis, format, and rights confirmation
  ↓
FastAPI encrypts the source URL and creates a QUEUED row with the target worker pool
  ↓
A worker in that pool claims the job
```

New jobs are scoped to the verified user's ID. Legacy guest jobs retain
owner-checked access but cannot resume anonymously. In local-temp mode, queue affinity prevents a worker from
claiming a job when it cannot share its filesystem with the API.

### Process job

```text
Worker claims job
  ↓
Worker decrypts the source URL and processes allowed media through the egress proxy
  ↓
Worker writes output to the shared local temp volume by default
  ↓
Worker updates job status and progress
```

### Deliver file

For signed-in users, the desktop download route authenticates with the
Next.js session cookie and streams the FastAPI response. Legacy guest jobs can
request a short-lived download token and use it to stream their own completed file.

A successful download does not immediately delete the output. The worker's
retention cleanup removes expired files after the configured period, which
defaults to 60 minutes. The owner can also delete an output explicitly. Job
history metadata remains after the file is removed.

On supported mobile devices, the app can fetch a completed file for the native
share sheet. The same-origin download route remains available to signed-in
users.

## Core components

### Next.js web app

- Authentication and dashboard UI
- URL analysis and format selection
- Queue, history, and settings pages
- Queue cards use compact 112 px thumbnails on mobile and show the localized
  creation date and time; history cards show the download date.
- Authenticated same-origin file streaming for signed-in users

### FastAPI

- URL validation and policy decisions
- Metadata analysis and available format responses
- Account-owned job creation and owner-checked legacy guest job actions
- Owner-checked streaming and cleanup of local files
- Account deletion
- Encrypts source URLs before storing jobs and uses the checked egress proxy

### Worker

- Claims jobs for its configured worker pool
- Processes media and updates progress
- Writes output to shared local temp storage by default
- Removes expired temporary outputs
- Decrypts queued source URLs and routes source requests through the proxy

### SSRF proxy

- Resolves each destination and rejects any non-public DNS answer
- Connects to the numeric address that was checked, preventing DNS rebinding
- Carries HTTP redirects and HTTPS CONNECT traffic through the same validation

### Supabase

- Authentication and user profiles
- Job records and policy logs
- RLS policies for user-owned records

Analyzed format choices are returned by the API. The selected format and
related job metadata are stored on `download_jobs`; there is no separate
`media_formats` table in the current schema.

## Data ownership

New job rows are scoped to `user_id`. Legacy guest jobs have a nullable
`user_id` and are scoped by `guest_session_id` through the API. Browser clients
cannot mutate server-managed queue or policy-log rows directly; FastAPI and the
worker perform trusted writes.

RLS protects user-owned Supabase rows. The service-role key can bypass RLS and
must remain in trusted server-side API/worker environments.

## Job status lifecycle

```text
PENDING → ANALYZING → READY → QUEUED → DOWNLOADING → CONVERTING → UPLOADING → COMPLETED
PAUSABLE: PENDING / READY / QUEUED / DOWNLOADING / CONVERTING → PAUSED → QUEUED
CANCELLABLE: PENDING / ANALYZING / READY / QUEUED / DOWNLOADING / CONVERTING / UPLOADING / PAUSED → CANCELLED
ANY STATUS → FAILED
ANY STATUS → BLOCKED
```

The API allows pause only for the listed pausable states. A paused job resumes
to `QUEUED` and is picked up by a worker in its target pool.

## Important constraints

- Validate every URL before network access and apply policy before analysis.
- Send every user-derived network request through the egress proxy; block direct
  egress from API and worker deployments.
- Set the same protected `MEDIA_URL_ENCRYPTION_KEY` on API and worker.
- Require rights confirmation when creating a job.
- Keep media processing in the worker, outside Vercel Functions.
- Keep the API and worker on the same shared output volume in local-temp mode.
- Scope every new job and file operation to its signed-in owner; retain
  owner-checked access for legacy guest sessions.
- Do not expose service-role keys to browser code.
- Keep output in `local_temp`; complete cloud object storage and delivery are not implemented.
