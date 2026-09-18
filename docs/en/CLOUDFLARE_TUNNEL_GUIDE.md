# Cloudflare Tunnel Deployment & Setup Guide

English | [ภาษาไทย](../th/CLOUDFLARE_TUNNEL_GUIDE.md)

This guide covers setting up **Cloudflare Tunnel** to connect your local Docker backend (`media-loader-api` and `media-loader-worker`) to the Next.js Frontend on **Vercel** securely via HTTPS with zero port forwarding, no static IP, and full protection against browser Mixed Content blocking.

---

## Architecture

```text
┌────────────────────────────────────────────────────────┐
│               Vercel (Frontend Next.js)                │
│             https://media-loader.vercel.app            │
└───────────────────────────┬────────────────────────────┘
                            │ (HTTPS API Calls)
                            ▼
┌────────────────────────────────────────────────────────┐
│             Cloudflare Global Edge Network             │
│            (HTTPS / Automatic SSL / DDoS)              │
└───────────────────────────┬────────────────────────────┘
                            │ (Encrypted Outbound Tunnel)
                            ▼
┌────────────────────────────────────────────────────────┐
│         Local Machine / Home Server (Win / Linux)      │
│                                                        │
│   ┌────────────────────────────────────────────────┐   │
│   │             cloudflared daemon                 │   │
│   └───────────────────────┬────────────────────────┘   │
│                           │ (HTTP localhost:8000)      │
│                           ▼                            │
│   ┌────────────────────────────────────────────────┐   │
│   │     Docker Compose: media-loader-api (FastAPI) │   │
│   │     Docker Compose: media-loader-worker        │   │
│   └───────────────────────┬────────────────────────┘   │
│                           │                            │
│                           ▼                            │
│   ┌────────────────────────────────────────────────┐   │
│   │          Supabase (Database & Auth)            │   │
│   └────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

---

## Benefits of Cloudflare Tunnel

1. **Zero Inbound Open Ports**: No router port forwarding required. Your home public IP address is never exposed.
2. **NAT / CGNAT Traversal**: Works out-of-the-box behind cellular hotspots and home fiber behind CGNAT.
3. **Free Automatic SSL**: Cloudflare issues and manages trusted SSL certificates, preventing browser Mixed Content blocking.
4. **100% Free**: No recurring server or bandwidth costs.

---

## Option 1: Quick Tunnel (Instant testing, no domain required)

Quick Tunnels provide an instant public HTTPS URL (e.g., `https://xxxx.trycloudflare.com`) pointing directly to FastAPI on port 8000.

### 1. Launch Quick Tunnel via CLI
Open PowerShell or Terminal:

```powershell
cloudflared tunnel --url http://localhost:8000
```
*(Or use the convenience script: `.\scripts\tunnel.ps1`)*

### 2. Copy the Assigned URL
The console output will display:
```text
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
|  https://random-words-1234.trycloudflare.com                                               |
+--------------------------------------------------------------------------------------------+
```

### 3. Update Vercel Environment Variables
1. Go to [Vercel Dashboard](https://vercel.com/) → Select your `media-loader` project.
2. Navigate to **Settings** → **Environment Variables**.
3. Set or update:
   ```env
   NEXT_PUBLIC_FASTAPI_BASE_URL=https://random-words-1234.trycloudflare.com
   ```
4. Go to **Deployments** and trigger a **Redeploy**.

---

## Option 2: Named Tunnel (Permanent custom domain)

For permanent daily use, bind the tunnel to a domain you own on Cloudflare (e.g., `api.yourdomain.com`).

### Step 1: Log in to Cloudflare
```powershell
cloudflared tunnel login
```

### Step 2: Create Named Tunnel
```powershell
cloudflared tunnel create media-loader
```
This generates a **Tunnel ID** and saves credentials to `~/.cloudflared/<TUNNEL_ID>.json`.

### Step 3: Route DNS to the Tunnel
```powershell
cloudflared tunnel route dns media-loader api.yourdomain.com
```

### Step 4: Configure `config.yml`
Create `%USERPROFILE%\.cloudflared\config.yml` (Windows) or `~/.cloudflared/config.yml` (Linux/macOS):

```yaml
tunnel: <TUNNEL_ID>
credentials-file: C:\Users\<USERNAME>\.cloudflared\<TUNNEL_ID>.json

ingress:
  - hostname: api.yourdomain.com
    service: http://localhost:8000
  - service: http_status:404
```

### Step 5: Start the Tunnel
```powershell
cloudflared tunnel run media-loader
```

*(To run continuously as a Windows Service:)*
```powershell
cloudflared service install
Start-Service cloudflared
```

---

## Option 3: Run via Docker Compose

The `tunnel` service in [docker-compose.yml](file:///d:/media-loader/docker-compose.yml) is configured by default to run as a **Quick Tunnel (100% Free, no account/token needed)**:

### Mode 1: Quick Tunnel (Free, Zero Account Needed)
1. Start the tunnel container:
   ```powershell
   docker compose --profile tunnel up -d tunnel
   ```
2. View the generated HTTPS URL:
   ```powershell
   docker compose logs tunnel
   ```
   Look for the URL block:
   ```text
   +--------------------------------------------------------------------------------------------+
   |  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
   |  https://xxxxxxxx.trycloudflare.com                                                        |
   +--------------------------------------------------------------------------------------------+
   ```
   Set this URL as `NEXT_PUBLIC_FASTAPI_BASE_URL` in your Vercel Dashboard.

### Mode 2: Named Tunnel (With Cloudflare Zero Trust Token)
If you have a dedicated tunnel created in Cloudflare Dashboard:
1. Add the token to `.env.local`:
   ```env
   CLOUDFLARE_TUNNEL_TOKEN=eyJhIjoi...
   ```
2. In `docker-compose.yml`, switch the comment under `tunnel` service to use `command: tunnel --no-autoupdate run` and uncomment `TUNNEL_TOKEN`.
3. Start the service:
   ```powershell
   docker compose --profile tunnel up -d tunnel
   ```

---

## CORS Configuration in `.env.local`

Ensure `CORS_ORIGINS` in `.env.local` includes your Vercel deployment URL:

```env
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,https://media-loader.vercel.app
```
*(After editing, restart the API container: `docker compose restart api`)*

---

## Verification

1. Verify the health check through your tunnel:
   ```powershell
   curl https://<YOUR_TUNNEL_DOMAIN>/health
   ```
   Expected response:
   ```json
   {"ok":true,"data":{"status":"healthy",...}}
   ```
2. Open `https://media-loader.vercel.app/history`. The connection error banner will disappear, and download history will load seamlessly.
