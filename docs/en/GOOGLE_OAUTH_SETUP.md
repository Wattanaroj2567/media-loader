# Google OAuth Setup Guide

This guide explains how to configure Google OAuth 2.0 authentication for Supabase Auth in Media Loader.

---

## Goal

Enable Google login through Supabase Auth so the Next.js web application can authenticate users securely without custom auth implementation.

---

## Step 1 — Open Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing project
3. Open **APIs & Services**
4. Open **OAuth consent screen**

---

## Step 2 — Configure OAuth Consent Screen

Recommended configuration for personal/utility use:

- **App name**: `Media Loader`
- **User support email**: your developer email
- **Developer contact email**: your developer email
- **Publishing status**: Testing mode is sufficient for local development

Add your Google account as a Test User if the app publishing status is set to Testing.

---

## Step 3 — Create OAuth Client Credentials

1. Go to **Credentials**
2. Click **Create Credentials** → Select **OAuth client ID**
3. Choose Application Type: **Web application**
4. Set Name: `Media Loader Web Client`

---

## Step 4 — Add Authorized Redirect URI

In Supabase Dashboard, open:
```text
Authentication → Providers → Google
```

Copy the callback URL shown by Supabase (format: `https://<your-project-ref>.supabase.co/auth/v1/callback`) and paste it into Google Cloud OAuth Authorized redirect URIs.

---

## Step 5 — Add Google Credentials to Supabase

Google Cloud Console will generate:
```text
Client ID
Client Secret
```

Paste both credentials into:
```text
Supabase Dashboard → Authentication → Providers → Google → Enable Provider
```

*Note: Never commit Client Secret to repository code or expose it in public logs.*

---

## Step 6 — Configure App Redirect URLs in Supabase

In Supabase Dashboard → **Authentication** → **URL Configuration**:

Add local callback URL:
```text
http://localhost:3000/auth/callback
```

Add production callback URL after deploying to Vercel:
```text
https://<your-vercel-domain>.vercel.app/auth/callback
```

---

## Step 7 — Verification & Validation

To verify setup, test Google sign-in flow on the frontend:
1. Start frontend server: `pnpm dev:web`
2. Open `http://localhost:3000`
3. Click **Sign in with Google**
4. Ensure Google authentication modal opens and redirects back to `/dashboard` upon successful login.
