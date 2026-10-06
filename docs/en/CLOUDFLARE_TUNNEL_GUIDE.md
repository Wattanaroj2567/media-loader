# Cloudflare Tunnel Guide

> **Language:** **English** · [ภาษาไทย](../th/CLOUDFLARE_TUNNEL_GUIDE.md)

This guide explains how to connect the local Docker API and worker to a
Next.js frontend through Cloudflare Tunnel. The tunnel provides an HTTPS route
to the API without router port forwarding.

## Architecture

```text
Vercel frontend
    ↓ HTTPS API request
Cloudflare public hostname
    ↓ encrypted outbound tunnel
cloudflared → Docker API on port 8000
                 ↕ shared media-output volume
              Docker worker
                 ↓
              Supabase
```

The API and worker share the same local output volume. The tunnel exposes the
API only; it does not expose the worker container directly.

## Before using this setup in production

Quick Tunnels are for testing and development. They use a temporary hostname,
have no uptime guarantee, support up to 200 in-flight requests, and do not
support Server-Sent Events. Anyone with the Quick Tunnel URL can reach the
local service. Use a named tunnel for a stable hostname and do not treat a
Quick Tunnel as a production deployment. See [Cloudflare Quick Tunnel
limitations](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).

Cloudflare states that public-hostname routes on Free, Pro, and Business plans
must use a specific paid Cloudflare service to serve video and other large
files. Media Loader streams processed media through the API, so confirm that
your intended delivery path complies with the current
[Cloudflare Tunnel routing guidance](https://developers.cloudflare.com/tunnel/concepts/routing/)
and [service-specific terms](https://www.cloudflare.com/service-specific-terms-application-services/)
before publishing. If it does not fit, use a backend or file-delivery provider
whose terms support this traffic.

Cloudflare Tunnel is available on all plans, but that does not make the origin
host, internet connection, or media delivery cost-free.

## Benefits

1. No inbound router ports need to be opened.
2. The origin does not need a public static IP.
3. A named tunnel can provide a stable hostname with HTTPS.
4. The tunnel establishes outbound connections from the origin.

## Option 1: Quick Tunnel for temporary testing

A Quick Tunnel creates a temporary public HTTPS URL such as
`https://random-words.trycloudflare.com` for a local service. Do not use it as
the production endpoint for the public application.

Start the API locally or with Docker, then run:

```powershell
cloudflared tunnel --url http://localhost:8000
```

Copy the generated URL from the terminal. Anyone who has this URL can reach
the API. The URL changes when the process stops and starts again.

To test through Vercel, set the URL as `NEXT_PUBLIC_FASTAPI_BASE_URL` in the
Vercel project and redeploy. This public variable is included in the frontend
build.

## Option 2: Named Tunnel for a stable hostname

Use a domain managed by Cloudflare and create a named tunnel. For a new
production deployment, Cloudflare currently recommends remotely-managed
tunnels; review its current dashboard instructions before setup.

For a locally-managed tunnel, the basic CLI flow is:

```powershell
cloudflared tunnel login
cloudflared tunnel create media-loader
cloudflared tunnel route dns media-loader api.yourdomain.com
```

The command creates local tunnel credentials. Keep the credentials file private
and do not commit it.

A locally-managed tunnel configuration can route the hostname to the API:

```yaml
tunnel: <TUNNEL_ID>
credentials-file: C:\Users\<USERNAME>\.cloudflared\<TUNNEL_ID>.json

ingress:
  - hostname: api.yourdomain.com
    service: http://localhost:8000
  - service: http_status:404
```

Run it with:

```powershell
cloudflared tunnel run media-loader
```

Use the Cloudflare dashboard or official setup instructions to create and run a
remotely-managed tunnel. Never paste its token into chat, source code, or logs.

## Option 3: Docker Compose

The Compose service is configured as a temporary Quick Tunnel. Start it only
for testing:

```powershell
docker compose --profile tunnel up -d tunnel
docker compose logs tunnel
```

Copy the generated HTTPS URL and set it as `NEXT_PUBLIC_FASTAPI_BASE_URL` in
Vercel. Redeploy the frontend after changing this value.

### Use a remotely-managed tunnel with Compose

The tunnel service reads `.env.local` through its Compose `env_file` setting.
For a remotely-managed tunnel:

1. Put the Cloudflare tunnel token in `TUNNEL_TOKEN` in your local
   `.env.local` file. Do not commit that file.
2. In `docker-compose.yml`, change the tunnel command from
   `tunnel --no-autoupdate --url http://api:8000` to
   `tunnel --no-autoupdate run`. The container reads `TUNNEL_TOKEN` from its
   environment.
3. Start the service:

```powershell
docker compose --profile tunnel up -d tunnel
```

The Compose file has no commented token line to uncomment. Keep the token only
in the local environment file.

## CORS configuration

Add the exact Vercel origin to `CORS_ORIGINS` in the local environment used by
the API. Replace the example domain with the deployed frontend domain:

```env
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,https://media-loader.vercel.app
```

Restart the API after changing CORS configuration:

```powershell
docker compose restart api
```

## Verification

Check the API health endpoint through the tunnel:

```powershell
curl https://<YOUR_TUNNEL_HOST>/health
```

A healthy service returns an envelope containing `"status":"healthy"`. Then
sign in to the deployed app, test an authorized job, and verify file delivery
with media you have permission to process. Do not use real user content as a
deployment test unless you are authorized to process it.
