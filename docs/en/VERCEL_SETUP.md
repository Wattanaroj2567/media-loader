# Vercel Setup

> **Language:** **English** · [ภาษาไทย](../th/VERCEL_SETUP.md)

This guide deploys the Next.js frontend. The FastAPI API and media worker must
run separately on infrastructure that supports the application's runtime and
shared media-file storage.

---

## Deployment Layout

```text
apps/web    → Vercel (Next.js frontend)
apps/api    → Separate HTTPS-capable container host (FastAPI)
apps/worker → Worker host with access to the same media volume as the API
Supabase    → Authentication and PostgreSQL
```

Vercel does not run this repository's Docker Compose services. Do not use
Vercel Functions for long-running media downloads, conversion, or file storage.
The API and worker need access to the same output directory so the API can serve
completed files produced by the worker.

---

## Before You Deploy

- A Vercel account connected to this Git repository.
- A configured Supabase project and Google OAuth provider, if using Google sign-in.
- A separately deployed API and worker with a shared media volume.
- A public HTTPS URL for the API and the production frontend origin for API CORS.

Do not expose backend credentials in Vercel frontend variables. See
[Environment Variables](ENVIRONMENT_VARIABLES.md) and
[Secrets Protocol](SECRETS_PROTOCOL.md).

---

## Create the Vercel Project

1. Import the GitHub repository into Vercel.
2. Set **Root Directory** to the repository root (leave the field at its
   default). The root `vercel.json` and pnpm workspace configure this monorepo.
3. Use the **Next.js** framework preset or let Vercel detect it.
4. Do not set a custom Output Directory; let the Next.js preset handle it.
5. Keep the build and install commands from the repository's `vercel.json`.

The checked-in configuration pins pnpm 12.6.0 for install and runs the root
`build` script, which builds `apps/web`. Its `ignoreCommand` exits with status
1 so Vercel does not skip the deployment. Vercel project-level build settings
can be overridden by `vercel.json`; keep them aligned if you change either.

Do not set Root Directory to `apps/web`: that would exclude the root workspace
configuration and the deployment configuration used by this project.

---

## Configure Vercel Environment Variables

Add these public values under Vercel Project Settings → Environment Variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
NEXT_PUBLIC_FASTAPI_BASE_URL=https://api.example.com
```

Replace the examples with values from your own services. For Production,
`NEXT_PUBLIC_FASTAPI_BASE_URL` must be the publicly reachable HTTPS API URL; a
`localhost` URL only works during local development. `NEXT_PUBLIC_` values are
embedded in the frontend build, so redeploy after changing them.

Never add `SUPABASE_SERVICE_ROLE_KEY`, Google OAuth Client Secret, database
credentials, or worker credentials to the Vercel frontend project. Configure
private credentials only on the backend host that needs them.

---

## Deploy and Configure Supabase Auth

1. Deploy the Vercel project and note its production domain, such as
   `https://media-loader.example.com`.
2. In Supabase Dashboard → **Authentication** → **URL Configuration**, set the
   **Site URL** to the production frontend origin.
3. Add the production callback URL to **Redirect URLs**:
   `https://media-loader.example.com/auth/callback`.
4. Keep the local callback URL in **Redirect URLs** for development:
   `http://localhost:3000/auth/callback`.
5. In the Google Cloud OAuth client, the authorized redirect URI is the
   Supabase callback URL shown in Supabase Auth, not the app's `/auth/callback`
   URL. See [Google OAuth Setup](GOOGLE_OAUTH_SETUP.md).

---

## Configure the Backend

- Set the API's `CORS_ORIGINS` to include the exact production frontend origin.
- Configure Supabase and worker credentials on the backend host only.
- Set the same `MEDIA_URL_ENCRYPTION_KEY` on API and worker; keep it private and
  back it up so queued URLs remain decryptable.
- Deploy the updated worker before the updated API. The new worker remains
  compatible with legacy plaintext jobs during rollout. After both services are
  updated, run the one-time legacy URL migration.
- Route all API/worker requests derived from submitted URLs through the SSRF
  egress proxy. The Docker Compose setup provides this proxy and blocks direct
  internet egress; a separate backend host must provide equivalent network
  isolation and connection-time public-IP validation.
- Run the legacy URL migration in [Environment Variables](ENVIRONMENT_VARIABLES.md)
  before sharing a database that contains plaintext URLs.
- Ensure API and worker containers mount the same persistent/shared output
  volume and agree on `TEMP_DIR`.
- Check the hosting provider's terms and limits for media processing, bandwidth,
  and file delivery before using it for production traffic.

Cloudflare Quick Tunnels are for testing and development. Cloudflare also has
service-specific terms for serving video and large files through tunnels. Read
the [Cloudflare Tunnel guide](CLOUDFLARE_TUNNEL_GUIDE.md) before choosing a
production backend route.

---

## Production Verification

- The Vercel deployment builds and the homepage loads over HTTPS.
- Google sign-in returns to the deployed app, if enabled.
- API requests reach the deployed HTTPS endpoint without CORS errors.
- The API can access completed output files from the worker's shared volume.
- An authorized completed file can be served, and unauthenticated requests do
  not gain access to another user's job or file.

---

## Troubleshooting

### Build fails

- Confirm **Root Directory** is the repository root.
- Check Vercel build logs for the pnpm install or root `build` script failure.
- Verify the Vercel project has not overridden the repository's build settings.

### Google sign-in fails

- Confirm the production Site URL and callback URL in Supabase.
- Confirm the Supabase callback URI is registered in the Google OAuth client.
- Confirm the Google provider is enabled in Supabase Auth.

### API calls fail

- Confirm `NEXT_PUBLIC_FASTAPI_BASE_URL` is the reachable HTTPS API origin and
  redeploy after changing it.
- Add the exact Vercel frontend origin to the API's `CORS_ORIGINS`.
- Confirm the API and worker share the output volume and agree on `TEMP_DIR`.
