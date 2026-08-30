# Vercel Setup

## Purpose

Vercel hosts the Next.js frontend.

Do not use Vercel Functions for heavy media download/conversion work.

---

## Recommended Deployment

```text
apps/web → Vercel (Frontend UI)
apps/api → Oracle Cloud Always Free (OCI) or Local
apps/worker → Oracle Cloud Always Free (OCI) or Local
```

---

## Prerequisites

Before deploying to Vercel, ensure you have:

1. A Vercel account
2. A Supabase project with Google OAuth configured
3. Local Docker backend running (for development)
4. All environment variables set locally

---

## Step 1: Create Vercel Project

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure project settings (see below)

---

## Step 2: Configure Project Settings

### Framework Preset
- **Framework**: Next.js
- **Root Directory**: Leave empty (root of repo)
- **Build Command**: `cd apps/web && pnpm build`
- **Output Directory**: `apps/web/.next`

### Environment Variables

Add these in Vercel Project Settings → Environment Variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_FASTAPI_BASE_URL=http://localhost:8000
```

**Important**: Do not add `SUPABASE_SERVICE_ROLE_KEY` to Vercel. This should only be used in the backend Docker containers.

---

## Step 3: Deploy

1. Click "Deploy"
2. Wait for build to complete
3. Vercel will provide a deployment URL (e.g., `https://media-loader-xyz.vercel.app`)

---

## Step 4: Update Supabase Auth Callback

After deployment, update your Supabase Auth settings:

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add your Vercel URL to **Site URL**:
   ```
   https://your-vercel-domain.vercel.app
   ```
3. Add to **Redirect URLs**:
   ```
   https://your-vercel-domain.vercel.app/auth/callback
   ```

---

## Step 5: Test Production Deployment

1. Visit your Vercel URL
2. Test Google login
3. Verify dashboard loads after login
4. Check that API calls work (backend must be running locally or deployed separately)

---

## Production Backend Deployment

For production, you have options for the FastAPI backend and worker:

### Option 1: Keep Local (Recommended for personal use)
- Run Docker containers on your local machine or VPS
- Set `NEXT_PUBLIC_FASTAPI_BASE_URL` to your backend URL
- Use nginx or similar to proxy requests

### Option 2: Cloud Deployment (Recommended: Oracle Cloud Always Free)
Deploy to:
- **Oracle Cloud Always Free (OCI)** (See [OCI Deployment Guide](OCI_DEPLOYMENT_GUIDE.md))
- Fly.io / Google Cloud Run / VPS

Update `NEXT_PUBLIC_FASTAPI_BASE_URL` to your deployed backend URL.

---

## vercel.json Configuration

The project includes `vercel.json` for monorepo configuration:

```json
{
  "buildCommand": "cd apps/web && pnpm build",
  "outputDirectory": "apps/web/.next",
  "installCommand": "pnpm install",
  "framework": "nextjs"
}
```

---

## Deployment Checklist

- [ ] Vercel project created
- [ ] Build command configured for monorepo
- [ ] Supabase env vars added to Vercel
- [ ] Production callback URL added in Supabase
- [ ] Landing page loads on Vercel URL
- [ ] Google login works in production
- [ ] Dashboard route is protected
- [ ] API base URL is configured (local or deployed)
- [ ] CORS origins include production URL

---

## Troubleshooting

### Build Fails
- Check that `pnpm-workspace.yaml` is correct
- Verify all dependencies are in `apps/web/package.json`
- Check build logs for specific errors

### Auth Fails
- Verify Supabase callback URL matches exactly
- Check that Google OAuth is enabled in Supabase
- Ensure NEXT_PUBLIC_SUPABASE_URL and ANON_KEY are correct

### API Calls Fail
- Backend must be running (local or deployed)
- Check CORS settings in FastAPI
- Verify NEXT_PUBLIC_FASTAPI_BASE_URL is accessible
