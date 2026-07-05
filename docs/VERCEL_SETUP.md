# Vercel Setup

## Purpose

Vercel hosts the Next.js frontend.

Do not use Vercel Functions for heavy media download/conversion work.

---

## Recommended Deployment

```text
apps/web → Vercel
apps/api → local first, later Railway/Fly.io/Cloud Run
apps/worker → local first, later Railway/Fly.io/Cloud Run/VPS
```

---

## Vercel Environment Variables

Add these to Vercel project settings:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_FASTAPI_BASE_URL=
```

Do not add `SUPABASE_SERVICE_ROLE_KEY` to browser-exposed variables.

---

## Production Auth Callback

After Vercel deployment, add callback URL to Supabase:

```text
https://your-vercel-domain.vercel.app/auth/callback
```

---

## Build Settings

If using monorepo:

```text
Root Directory: apps/web
Build Command: pnpm build
Output: .next
```

The exact settings may change depending on the workspace manager.

---

## Deployment Checklist

- [ ] Vercel project created
- [ ] Root directory set correctly
- [ ] Supabase env vars added
- [ ] Production callback URL added in Supabase
- [ ] Landing page loads
- [ ] Google login works
- [ ] Dashboard route is protected
- [ ] API base URL is reachable
